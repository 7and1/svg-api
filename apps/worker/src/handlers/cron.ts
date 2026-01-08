/**
 * Cron/Scheduled Event Handlers
 *
 * Handles scheduled tasks like hourly metrics aggregation.
 */

import type { Env } from "../env";
import { getAnalyticsService } from "../services/analytics";

/**
 * Cron handler for hourly metrics aggregation
 *
 * This is triggered by the cron schedule defined in wrangler.toml:
 * cron = "0 * * * *"  # Every hour at minute 0
 *
 * The event is delivered to the Worker via the "scheduled" event type.
 */
export const hourlyAggregationHandler = async (
  env: Env,
  ctx: ExecutionContext,
): Promise<Response> => {
  try {
    // Check if Analytics bindings are available
    if (!env.ANALYTICS || !env.METRICS_DB) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Analytics bindings not configured",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const analytics = getAnalyticsService(env);

    // Aggregate the previous hour's metrics
    const previousHour =
      new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 13) +
      ":00:00Z";

    const result = await analytics.aggregateHourlyMetrics(previousHour);

    return new Response(
      JSON.stringify({
        success: true,
        hour: previousHour,
        processed: result.processed,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("Cron aggregation failed:", err);

    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : String(err),
        timestamp: new Date().toISOString(),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};

/**
 * Export for use in worker scheduled event handler
 *
 * In your index.ts or main entry point:
 *
 * export default {
 *   fetch: app.fetch,
 *   scheduled: async (event, env, ctx) => {
 *     await hourlyAggregationHandler(env, ctx);
 *   },
 * } satisfies ExportedHandler<Env>;
 */
export const createScheduledHandler = (env: Env) => {
  return async (
    event: ScheduledEvent,
    ctx: ExecutionContext,
  ): Promise<void> => {
    await hourlyAggregationHandler(env, ctx);
  };
};
