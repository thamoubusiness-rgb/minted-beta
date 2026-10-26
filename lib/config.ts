// Launch rules and environment, read once on the server.
const num = (v: string | undefined, d: number) => (v && !Number.isNaN(Number(v)) ? Number(v) : d);

export const config = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "minted",
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  cluster: process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta",
  // Set SOLANA_RPC_URL to a private RPC (e.g. Helius) for reliable launches; the public endpoint is rate-limited.
  rpcUrl: process.env.SOLANA_RPC_URL || ((process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta") === "devnet" ? "https://api.devnet.solana.com" : "https://api.mainnet-beta.solana.com"),
  priorityFee: num(process.env.PRIORITY_FEE_MICROLAMPORTS, 200_000),
  maxBuySol: num(process.env.MAX_INITIAL_BUY_SOL, 5),
  minFollowers: num(process.env.MIN_FOLLOWERS, 0),
  // X verification types allowed to launch. "blue" = X Premium.
  allowedVerified: (process.env.ALLOWED_VERIFIED_TYPES || "blue,business,government").split(",").map((s) => s.trim()).filter(Boolean),
  minAccountAgeDays: num(process.env.MIN_ACCOUNT_AGE_DAYS, 90),
  handleCooldownHours: num(process.env.HANDLE_CHANGE_COOLDOWN_HOURS, 24),
  slippagePct: num(process.env.INITIAL_BUY_SLIPPAGE_PCT, 5),
  pinataJwt: process.env.PINATA_JWT || "",
  pinataGateway: (process.env.PINATA_GATEWAY || "https://gateway.pinata.cloud").replace(/\/$/, ""),
  xBearer: process.env.X_BEARER_TOKEN || "",
  cronSecret: process.env.CRON_SECRET || "",
};

export const LAMPORTS_PER_SOL = 1_000_000_000;
