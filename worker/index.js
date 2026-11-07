import { keepalive,needsAttention } from './keepalive.js';

export default {
  async scheduled(controller,env) {
    const result=await keepalive(env);
    console.log(JSON.stringify(result));
    // Throwing marks the run as failed in Cron Events, which Cloudflare keeps even without a live tail.
    if(needsAttention(result))throw new Error(result.mailError||result.warnings.join(' | '));
  },
  // Static assets are matched first; this only runs for requests no asset or SPA fallback answered.
  fetch(request,env) { return env.ASSETS.fetch(request); },
};
