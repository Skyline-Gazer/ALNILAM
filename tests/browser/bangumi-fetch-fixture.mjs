const originalFetch = globalThis.fetch.bind(globalThis);
const mode = process.env.ALNILAM_BANGUMI_FIXTURE;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  if (url.hostname !== "api.bgm.tv") return originalFetch(input, init);
  if (mode === "disabled") throw new Error("Bangumi request occurred while the module was disabled");
  if (mode === "http-error") return new Response("fixture provider error", { status: 503 });
  if (mode === "timeout") {
    if (!init.signal) throw new Error("Bangumi request has no timeout signal");
    throw new DOMException("fixture timeout", "TimeoutError");
  }
  if (mode !== "success") throw new Error("Bangumi fixture mode is required");
  await new Promise((resolve) => setTimeout(resolve, 200));
  return Response.json({
    data: [{
      subject: {
        id: 72,
        name: "P1 fixture show",
        name_cn: "P1 番组夹具",
        short_summary: "Controlled build-time Bangumi response.",
      },
      updated_at: "2026-10-27T00:00:00Z",
    }],
  });
};
