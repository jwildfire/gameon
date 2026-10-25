// GameOn idea intake: a Cloudflare Worker. Deploy steps: intake/README.md.
import { handle } from "./handler.js";

export default {
  async fetch(request, env, ctx) {
    return handle(request, env, ctx, {
      fetch: (...args) => fetch(...args),
      now: () => Date.now(),
      cache: typeof caches !== "undefined" ? caches.default : null
    });
  }
};
