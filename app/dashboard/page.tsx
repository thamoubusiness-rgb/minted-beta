import type { Metadata } from "next";
import Dashboard from "@/components/minted/dashboard";
import { config } from "@/lib/config";

export const metadata: Metadata = { title: "Creator dashboard — NAMA", robots: { index: false } };

export default function Page() {
  return <Dashboard site={config.siteUrl} />;
}
