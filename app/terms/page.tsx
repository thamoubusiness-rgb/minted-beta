import LegalPage, { legalMeta } from "@/components/minted/legal-page";

export const metadata = legalMeta("terms");

export default function Page() {
  return <LegalPage page="terms" />;
}
