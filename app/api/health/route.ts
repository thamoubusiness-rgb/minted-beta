export const dynamic = "force-dynamic";

// Railway healthcheck: the app is up and serving requests.
export function GET() {
  return Response.json({ ok: true });
}
