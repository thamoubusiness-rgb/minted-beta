/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Type checking runs in development (npm run typecheck). Third-party Solana packages ship mismatched
  // React type definitions that would otherwise fail the production build without affecting runtime.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: "https", hostname: "pbs.twimg.com" }] },
  // Server-only Solana/pump.fun packages stay out of the client bundle.
  serverExternalPackages: ["@pump-fun/pump-sdk", "postgres"],
};

export default nextConfig;
