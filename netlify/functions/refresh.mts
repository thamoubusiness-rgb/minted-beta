// Runs every 5 minutes (UTC) on the published site: asks the app to refresh coin stats.
// Once a day the same route also refreshes X profiles (see app/api/cron/refresh/route.ts).
declare const Netlify: { env: { get(name: string): string | undefined } };

export default async () => {
  const site = Netlify.env.get("URL") || Netlify.env.get("NEXT_PUBLIC_SITE_URL");
  const secret = Netlify.env.get("CRON_SECRET");
  if (!site || !secret) {
    console.log("refresh skipped: URL or CRON_SECRET not set");
    return;
  }
  const res = await fetch(`${site.replace(/\/$/, "")}/api/cron/refresh`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log("refresh", res.status, await res.text());
};

export const config = {
  schedule: "*/5 * * * *",
};
