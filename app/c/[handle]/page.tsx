import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CoinPage from "@/components/minted/coin-page";
import { getCoin } from "@/lib/coin";
import { refreshStale } from "@/lib/stats";

export const runtime = "nodejs";
export const revalidate = 30;

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const coin = await getCoin((await params).handle);
  if (!coin) return { title: "Coin not found — NAMA" };
  const title = `${coin.name} ($${coin.symbol}) — verified on NAMA`;
  const description = `The verified coin of @${coin.handle}. Contract ${coin.mint}.`;
  return {
    title,
    description,
    openGraph: { title, description, images: [coin.image] },
    twitter: { card: "summary", title, description, images: [coin.image] },
  };
}

export default async function Page({ params }: Props) {
  const handle = (await params).handle;
  let coin = await getCoin(handle);
  if (!coin) notFound();
  // Refresh this coin's numbers if they're older than two minutes, then show the fresh values.
  if (!coin.statsUpdatedAt || Date.now() - new Date(coin.statsUpdatedAt).getTime() > 120_000) {
    await refreshStale(1, coin.mint).catch(() => {});
    coin = (await getCoin(handle)) ?? coin;
  }
  return <CoinPage coin={coin} cluster={process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta"} />;
}
