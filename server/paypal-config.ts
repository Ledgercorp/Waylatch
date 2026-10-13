/** Server-only: never serialize this result or expose it in browser configuration. */
export function paypalConfigFromEnv(environment: NodeJS.ProcessEnv = process.env) {
  return {
    clientId: environment.PAYPAL_CLIENT_ID,
    clientSecret: environment.PAYPAL_CLIENT_SECRET || environment.PAYPAL_SECRET_KEY,
    webhookId: environment.PAYPAL_WEBHOOK_ID,
  };
}
