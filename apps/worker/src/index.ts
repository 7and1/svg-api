import { createApp } from "./router";
import { hourlyAggregationHandler } from "./handlers/cron";
import type { Env } from "./env";

const app = createApp();

export default {
  fetch: app.fetch,
  scheduled: async (event: ScheduledEvent, env: Env, ctx: ExecutionContext) => {
    await hourlyAggregationHandler(env, ctx);
  },
} satisfies ExportedHandler<Env>;
