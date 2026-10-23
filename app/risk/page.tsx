import LegalPage, { legalMeta } from "@/components/minted/legal-page";

export const metadata = legalMeta("risk");

export default function Page() {
  return <LegalPage page="risk" />;
}
