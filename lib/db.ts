import postgres from "postgres";

// One pooled client per server instance. `prepare: false` is required for Supabase/Neon poolers.
const globalForDb = globalThis as unknown as { __mintedSql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.__mintedSql ??
  postgres(process.env.DATABASE_URL as string, { prepare: false, max: 5, idle_timeout: 20 });

if (process.env.NODE_ENV !== "production") globalForDb.__mintedSql = sql;

export type CreatorRow = {
  id: string;
  x_user_id: string;
  handle: string;
  display_name: string;
  bio: string;
  avatar_url: string | null;
  followers: number;
  verified_type: string;
  x_created_at: Date | null;
  handle_changed_at: Date | null;
  status: "active" | "unavailable" | "delisted";
};

export type TokenRow = {
  mint: string;
  creator_id: string;
  creator_wallet: string;
  name: string;
  symbol: string;
  image_uri: string;
  initial_buy_lamports: string;
  followers_at_launch: number;
  market_cap_usd: string | null;
  market_cap_sol: string | null;
  creator_balance: string | null;
  graduated: boolean;
  launched_at: Date;
};

export function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && (e as { code?: string }).code === "23505";
}
