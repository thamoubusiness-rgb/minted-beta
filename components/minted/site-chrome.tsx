// Header and footer for the inner pages (coin pages, legal pages).
import Link from "next/link";
import { NamaLogo } from "./brand";

export const Sparkle = ({ size = 17, plus = true }: { size?: number; plus?: boolean }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M11 3.5 12.6 8a2 2 0 0 0 1.3 1.3L18.5 11l-4.6 1.6a2 2 0 0 0-1.3 1.3L11 18.5 9.4 13.9a2 2 0 0 0-1.3-1.3L3.5 11l4.6-1.6A2 2 0 0 0 9.4 8z" />
    {plus ? <path d="M19 15.5v4M17 17.5h4" /> : null}
  </svg>
);

export function SiteHeader() {
  return (
    <header className="nav scrolled" id="nav">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="NAMA home">
          <NamaLogo />
        </Link>
        <nav className="links" aria-label="Main">
          <Link href="/#explore">Explore</Link>
          <Link href="/#how">How it works</Link>
        </nav>
        <Link className="btn btn-ghost" href="/?launch=1">Launch your coin</Link>
      </div>
    </header>
  );
}

export function FooterLinks() {
  return (
    <nav className="foot-links" aria-label="Legal">
      <Link href="/terms">Terms</Link>
      <Link href="/risk">Risk notice</Link>
      <Link href="/privacy">Privacy</Link>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer id="footer">
      <div className="wrap">
        <p className="main-line">NAMA is a verification layer for creator coins. Your wallet always stays yours.</p>
        <p className="fine">Verified means a coin was launched by the real X account. It is not a judgment on value and not financial advice.</p>
        <FooterLinks />
      </div>
    </footer>
  );
}
