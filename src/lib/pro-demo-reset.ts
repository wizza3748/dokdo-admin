/** The deployed prototype shares synthetic data; only its agency reset action is allowed. */
export function isProDemoResetRequest(request: Request) {
  const url = new URL(request.url)
  return request.method === "POST" && request.headers.get("origin") === url.origin &&
    url.searchParams.get("role") === "agency" && !url.searchParams.has("demoAgency")
}
