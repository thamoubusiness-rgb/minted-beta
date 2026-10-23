import { geist, geistMono } from "@/components/minted/fonts";
import { SiteFooter, SiteHeader } from "@/components/minted/site-chrome";
import "@/components/minted/minted.css";

export default function NotFound() {
  return (
    <div className={`minted ${geist.variable} ${geistMono.variable}`}>
      <div className="page">
        <SiteHeader />
        <main className="wrap legal" style={{ textAlign: "center", alignItems: "center" }}>
          <p className="eyebrow">Not found</p>
          <h1>No verified coin here</h1>
          <p className="legal-lead">This creator hasn&apos;t launched on minted. Any coin using their name elsewhere is not verified by us.</p>
          <div className="legal-more" style={{ justifyContent: "center" }}>
            <a className="btn btn-solid" href="/#explore">See latest launches</a>
            <a className="btn btn-ghost" href="/?launch=1">Is it you? Launch your coin</a>
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
