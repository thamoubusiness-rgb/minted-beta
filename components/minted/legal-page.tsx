import legal from "./legal.json";
import { geist, geistMono } from "./fonts";
import { SiteFooter, SiteHeader } from "./site-chrome";
import "./minted.css";

type Section = { h: string; p?: string[]; ul?: string[] };
type Key = keyof typeof legal.pages;

export function legalMeta(key: Key) {
  const page = legal.pages[key];
  return { title: `${page.title} — NAMA`, description: page.lead };
}

export default function LegalPage({ page: key }: { page: Key }) {
  const page = legal.pages[key];
  const others = (Object.keys(legal.pages) as Key[]).filter((k) => k !== key);
  return (
    <div className={`minted ${geist.variable} ${geistMono.variable}`}>
      <div className="page">
        <div className="orb one" aria-hidden="true" />
        <SiteHeader />
        <main className="wrap legal">
          <p className="eyebrow">Legal · updated {legal.updated}</p>
          <h1>{page.title}</h1>
          <p className="legal-lead">{page.lead}</p>
          <p className="legal-draft" role="note">{legal.draftNote}</p>
          <div className="legal-body">
            {(page.sections as Section[]).map((s) => (
              <section key={s.h}>
                <h2>{s.h}</h2>
                {s.p?.map((t, i) => <p key={i}>{t}</p>)}
                {s.ul ? <ul>{s.ul.map((t, i) => <li key={i}>{t}</li>)}</ul> : null}
              </section>
            ))}
          </div>
          <div className="legal-more">
            {others.map((k) => (
              <a key={k} className="btn btn-ghost" href={`/${k}`}>{legal.pages[k].title}</a>
            ))}
          </div>
        </main>
        <SiteFooter />
      </div>
    </div>
  );
}
