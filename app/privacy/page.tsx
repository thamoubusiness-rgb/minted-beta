import LegalPage, { legalMeta } from "@/components/minted/legal-page";

export const metadata = legalMeta("privacy");

export default function Page() {
  return <LegalPage page="privacy" />;
}
