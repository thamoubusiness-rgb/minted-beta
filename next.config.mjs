/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [{ protocol: "https", hostname: "pbs.twimg.com" }] },
  // Server-only Solana/pump.fun packages stay out of the client bundle.
  serverExternalPackages: ["@pump-fun/pump-sdk", "postgres"],
};

export default nextConfig;
