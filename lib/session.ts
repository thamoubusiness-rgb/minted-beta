import { auth } from "./auth";
import { sql, type CreatorRow } from "./db";

export async function currentCreator(): Promise<CreatorRow | null> {
  const session = (await auth()) as unknown as { creatorId?: string } | null;
  if (!session?.creatorId) return null;
  const [c] = await sql<CreatorRow[]>`select * from creators where id = ${session.creatorId}`;
  return c ?? null;
}

export function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(code: string, message: string, status = 400) {
  return json({ error: code, message }, status);
}
