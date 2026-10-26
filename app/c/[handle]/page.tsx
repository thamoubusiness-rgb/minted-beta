import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CoinPage from "@/components/minted/coin-page";
import { getCoin } from "@/lib/coin";

export const runtime = "nodejs";
export const revalidate = 30;

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const coin = await getCoin((await params).handle);
  if (!coin) return { title: "Coin not found — minted" };
  const title = `${coin.name} ($${coin.symbol}) — verified on minted`;
  const description = `The verified coin of @${coin.handle}. Contract ${coin.mint}.`;
  return {
    title,
    description,
    openGraph: { title, description, images: [coin.image] },
    twitter: { card: "summary", title, description, images: [coin.image] },
  };
}

export default async function Page({ params }: Props) {
  const coin = await getCoin((await params).handle);
  if (!coin) notFound();
  return <CoinPage coin={coin} cluster={process.env.NEXT_PUBLIC_SOLANA_CLUSTER || "mainnet-beta"} />;
}
