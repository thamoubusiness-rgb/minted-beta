# minted

> Hosting: this project deploys to **Netlify** (free plan) with `netlify.toml`, or Railway with `railway.json`. The 10-minute refresh runs as a Netlify scheduled function (`netlify/functions/refresh.mts`).

Verified creator coins on Solana. A creator signs in with X, proves a wallet, and launches one coin on pump.fun
whose name, ticker, image and description come straight from their X profile and can't be edited.

## How it works

| Step | Where | What happens |
| --- | --- | --- |
| Sign in with X | `lib/auth.ts` | Auth.js X OAuth 2.0 (read-only scopes). The creator is stored by their permanent X id. |
| Eligibility | `lib/eligibility.ts` | X Premium required, optional account age and follower minimum, handle-change cooldown, one coin per account. |
| Link wallet | `api/wallet/nonce`, `api/wallet/verify` | Server issues a one-time message (5-minute expiry); the wallet signs it; ed25519 signature is checked. One wallet per creator, one creator per wallet. |
| Build launch | `api/launch/build`, `lib/pump.ts` | Re-reads the X profile, pins photo and metadata to IPFS, builds pump.fun `create_v2` (+ optional first buy) with the creator's wallet as payer and creator, simulates it, returns it unsigned. |
| Sign and send | `components/minted/launch-bridge.tsx` | The creator's wallet signs and sends. The server never holds user keys. |
| Verify and list | `api/launch/confirm`, `lib/launch.ts` | Confirms the transaction, checks it was signed by the linked wallet, reads the bonding curve and requires its `creator` to equal the linked wallet. Only then is the coin listed as verified. |
| Directory | `api/tokens`, `api/search` | Public list and handle lookup. The page polls every 20 seconds. |
| Refresh | `api/cron/refresh` | Every 10 minutes: market cap, graduation, creator holdings. Daily: X profiles; suspended accounts become "account unavailable". |

One coin per X account and per wallet is enforced in the database (unique constraints) and in the build and
confirm routes. A transaction that expires without landing frees the slot; one that lands is always detected.

## Set up (about 30 minutes)

1. **Database.** Create a Supabase (or Neon) project. Open the SQL editor and run `db/schema.sql`.
   Copy the pooled connection string ("Transaction pooler", port 6543) into `DATABASE_URL`.
2. **X app.** At developer.x.com create a project and app.
   - User authentication: OAuth 2.0, type "Web App", permissions "Read".
   - Callback URL: `https://YOUR-DOMAIN/api/auth/callback/twitter` (and `http://localhost:3000/api/auth/callback/twitter` for local).
   - Copy the OAuth 2.0 Client ID and Secret into `AUTH_TWITTER_ID` and `AUTH_TWITTER_SECRET`, and the Bearer token into `X_BEARER_TOKEN`.
   - X API access is pay-per-use. Sign-in and profile refreshes are low volume.
3. **Solana RPC.** Create a Helius (or Triton/QuickNode) account. Put a private devnet URL in `SOLANA_RPC_URL`
   and a browser-safe URL (domain-restricted key) in `NEXT_PUBLIC_SOLANA_RPC`.
4. **Pinata.** Create an API key with pinning permissions; put the JWT in `PINATA_JWT` and your gateway in `PINATA_GATEWAY`.
5. **Secrets.** `AUTH_SECRET` and `CRON_SECRET`: generate each with `openssl rand -base64 32`.
6. **Vercel.** Import the repo, add every variable from `.env.example` in Project Settings → Environment Variables, deploy.
   The cron in `vercel.json` runs every 10 minutes (needs the Pro plan; on Hobby change it to once a day).

Run locally: `npm install`, copy `.env.example` to `.env.local`, fill it, `npm run dev`.

## Test on devnet first

Keep `NEXT_PUBLIC_SOLANA_CLUSTER=devnet` and devnet RPC URLs. Fund a test wallet at faucet.solana.com, switch your
wallet to devnet, and run the whole flow: sign in, link, launch with and without a first buy, reject in the wallet,
retry, try to launch twice, try the same wallet from a second X account. Check the coin appears in the directory.

## Go live (mainnet checklist)

- [ ] Devnet run-through above passes end to end.
- [ ] `npm run build` passes on Vercel with no type errors (confirm `@pump-fun/pump-sdk` function names in `lib/pump.ts` match the installed version, then pin that version in `package.json`).
- [ ] Switch `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta` and both RPC URLs to mainnet.
- [ ] Set `NEXT_PUBLIC_SITE_URL` and `AUTH_URL` to the real domain; update the X callback URL.
- [ ] Launch rules: X Premium is required (`ALLOWED_VERIFIED_TYPES`), no follower minimum by default. Optional: `MIN_ACCOUNT_AGE_DAYS` (default 90, 0 to turn off), `MAX_INITIAL_BUY_SOL`.
- [ ] One real mainnet launch from your own X account with a small first buy; verify it on pump.fun.
- [ ] Terms of service, risk notice and privacy policy pages live; geo-block regions you won't serve.
- [ ] Legal review of the wording and the product (creator coins may be regulated where you operate).

## Not included yet

- Mobile wallet deep links (on phones, open the site inside the Phantom or Solflare in-app browser).
- Market cap after graduation to PumpSwap (the last bonding-curve value is kept; the coin is marked graduated).
- A per-creator page on this site; coin rows link to the pump.fun coin page.
