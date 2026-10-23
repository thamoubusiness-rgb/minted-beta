import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import Providers from "./providers";

const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: "minted — verified creator coins",
  description: "Turn your X profile into one verified creator coin on Solana, launched on pump.fun.",
  openGraph: { title: "minted", description: "One verified coin per X profile.", url: site, siteName: "minted" },
  twitter: { card: "summary_large_image", title: "minted", description: "One verified coin per X profile." },
};

export const viewport: Viewport = { themeColor: "#070707", colorScheme: "dark", viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#070707" }}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
