/** Liveness for the container healthcheck and the deploy's rollout check. No dependencies, no cookies. */
export function GET() {
  return Response.json({ status: 'ok' }, { headers: { 'cache-control': 'no-store' } });
}
