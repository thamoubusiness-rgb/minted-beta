import { config } from "./config";
import { sql, type CreatorRow } from "./db";

export const X_USER_FIELDS = "profile_image_url,description,public_metrics,created_at,verified,verified_type";

export type XUser = {
  id: string;
  username: string;
  name: string;
  description?: string;
  profile_image_url?: string;
  created_at?: string;
  public_metrics?: { followers_count?: number };
  /** "blue" = X Premium, "business" = Verified Organization, "government", or "none" */
  verified_type?: string;
};

/** X serves 48px avatars by default ("_normal"); ask for the 400px version. */
export function bigAvatar(url?: string | null) {
  return url ? url.replace("_normal.", "_400x400.") : null;
}

/** Insert or refresh a creator from an X user object. Tracks handle changes. */
export async function upsertCreator(u: XUser): Promise<CreatorRow> {
  const followers = u.public_metrics?.followers_count ?? 0;
  const [row] = await sql<CreatorRow[]>`
    insert into creators (x_user_id, handle, display_name, bio, avatar_url, followers, x_created_at, verified_type)
    values (${u.id}, ${u.username}, ${u.name}, ${u.description ?? ""}, ${bigAvatar(u.profile_image_url)},
            ${followers}, ${u.created_at ? new Date(u.created_at) : null}, ${u.verified_type ?? "none"})
    on conflict (x_user_id) do update set
      handle_changed_at = case when lower(creators.handle) <> lower(excluded.handle) then now() else creators.handle_changed_at end,
      handle = excluded.handle,
      display_name = excluded.display_name,
      bio = excluded.bio,
      avatar_url = excluded.avatar_url,
      followers = excluded.followers,
      verified_type = excluded.verified_type,
      x_created_at = coalesce(excluded.x_created_at, creators.x_created_at),
      status = case when creators.status = 'delisted' then 'delisted' else 'active' end,
      updated_at = now()
    returning *`;
  return row;
}

/** App-only lookup of up to 100 users by id. Returns found users and the ids X reported as missing. */
export async function lookupUsers(ids: string[]): Promise<{ users: XUser[]; missing: string[] }> {
  if (!config.xBearer || ids.length === 0) return { users: [], missing: [] };
  const url = `https://api.x.com/2/users?ids=${ids.join(",")}&user.fields=${X_USER_FIELDS}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${config.xBearer}` }, cache: "no-store" });
  if (!res.ok) throw new Error(`X lookup failed: ${res.status}`);
  const json = (await res.json()) as { data?: XUser[]; errors?: { value?: string; resource_id?: string }[] };
  const missing = (json.errors ?? []).map((e) => e.resource_id || e.value || "").filter(Boolean);
  return { users: json.data ?? [], missing };
}

/** Re-read one creator from X right before launch, so the coin matches the live profile. */
export async function refreshCreator(c: CreatorRow): Promise<CreatorRow> {
  try {
    const { users, missing } = await lookupUsers([c.x_user_id]);
    if (missing.includes(c.x_user_id)) {
      await sql`update creators set status = 'unavailable', updated_at = now() where id = ${c.id}`;
      return { ...c, status: "unavailable" };
    }
    return users[0] ? await upsertCreator(users[0]) : c;
  } catch {
    return c; // X unavailable: fall back to the profile stored at sign-in
  }
}

export type XProfile = { found: true; handle: string; name: string; avatar: string | null; verifiedType: string } | { found: false };

/**
 * Looks up an X account by @username for the search bar. Results are cached for a day so typing
 * doesn't burn X API credits. Returns null when X can't be reached (the caller shows a soft error).
 */
export async function lookupUsername(handleRaw: string): Promise<XProfile | null> {
  const key = handleRaw.toLowerCase();
  const [cached] = await sql<{ found: boolean; handle: string | null; display_name: string | null; avatar_url: string | null; verified_type: string | null }[]>`
    select found, handle, display_name, avatar_url, verified_type from x_lookups
    where handle_lower = ${key} and fetched_at > now() - interval '24 hours'`;
  if (cached) {
    return cached.found
      ? { found: true, handle: cached.handle || key, name: cached.display_name || key, avatar: cached.avatar_url, verifiedType: cached.verified_type || "none" }
      : { found: false };
  }
  if (!config.xBearer) return null;

  let res: Response;
  try {
    res = await fetch(`https://api.x.com/2/users/by/username/${encodeURIComponent(key)}?user.fields=profile_image_url,verified_type`, {
      headers: { Authorization: `Bearer ${config.xBearer}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }
  const body = (await res.json().catch(() => ({}))) as { data?: XUser; errors?: { title?: string; type?: string }[] };
  // X answers 200 with an "errors" entry (or 404) when the username doesn't exist or is suspended.
  const missing = res.status === 404 || (res.ok && !body.data && (body.errors?.length ?? 0) > 0);
  if (!res.ok && !missing) {
    console.error("X username lookup failed", res.status, JSON.stringify(body).slice(0, 300));
    return null;
  }
  const u = body.data;
  const profile: XProfile = u
    ? { found: true, handle: u.username, name: u.name, avatar: bigAvatar(u.profile_image_url), verifiedType: u.verified_type || "none" }
    : { found: false };
  await sql`
    insert into x_lookups (handle_lower, found, x_user_id, handle, display_name, avatar_url, verified_type, fetched_at)
    values (${key}, ${profile.found}, ${u?.id ?? null}, ${u?.username ?? null}, ${u?.name ?? null},
            ${profile.found ? profile.avatar : null}, ${u?.verified_type ?? null}, now())
    on conflict (handle_lower) do update set found = excluded.found, x_user_id = excluded.x_user_id, handle = excluded.handle,
      display_name = excluded.display_name, avatar_url = excluded.avatar_url, verified_type = excluded.verified_type, fetched_at = now()`;
  return profile;
}
