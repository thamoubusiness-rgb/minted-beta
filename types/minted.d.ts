export type MeResponse = {
  signedIn: boolean;
  creator?: { handle: string; name: string; bio: string; avatar: string | null; followers: number };
  wallet?: string | null;
  token?: { mint: string; symbol: string; launchedAt: string } | null;
  eligibility?: { ok: boolean; checks: { label: string; ok: boolean }[] };
  config: { maxBuySol: number };
};

export type WalletOption = { name: string; icon: string; installed: boolean; url: string; mobileApp?: boolean };

export type MintedBridge = {
  cluster: string;
  me(): Promise<MeResponse>;
  signInWithX(): Promise<void>;
  signOut(): Promise<void>;
  wallets(): WalletOption[];
  connectWallet(name: string): Promise<{ name: string; address: string; short: string }>;
  getLinkMessage(wallet: string): Promise<string>;
  signAndLink(wallet: string, message: string): Promise<void>;
  build(initialBuySol: number, rewardMode?: "creator" | "holders"): Promise<{ launchId: string; mint: string; tx: string; blockhash: string; lastValidBlockHeight: number }>;
  send(txBase64: string): Promise<string>;
  waitForConfirmation(signature: string, blockhash: string, lastValidBlockHeight: number): Promise<void>;
  confirm(launchId: string, signature: string): Promise<{ mint: string; symbol: string; name: string; url: string }>;
  stats(): Promise<{ coins: number; marketCapUsd: number; verifiedCreators: number; graduated: number }>;
  tokens(query?: string): Promise<
    {
      mint: string; name: string; handle: string; symbol: string; avatar: string | null; followersAtLaunch: number;
      marketCapUsd: number | null; graduated: boolean; launchedAt: string; url: string; rewardMode?: string;
    }[]
  >;
  search(handle: string): Promise<
    | { status: "launched"; token: { mint: string; symbol: string; name: string; handle: string; avatar: string | null; graduated: boolean; rewardMode: string; url: string; dexUrl: string; xUrl: string; page: string } }
    | { status: "found"; profile: { handle: string; name: string; avatar: string | null } }
    | { status: "not_found" | "unknown" | "invalid" }
  >;
};

declare global {
  interface Window {
    __minted?: MintedBridge;
  }
}
