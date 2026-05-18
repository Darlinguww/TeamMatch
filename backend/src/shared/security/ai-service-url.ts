const ALLOWED_AI_SERVICE_HOSTS = new Set([
  'ai-service',
  'localhost',
  '127.0.0.1',
  '::1'
]);

export function assertAllowedAiServiceUrl(url: string): void {
  if (!url) {
    return;
  }

  let parsed: URL;

  try {
    parsed = new URL(url);
  } catch {
    throw new Error('AI_SERVICE_URL must be a valid absolute URL');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('AI_SERVICE_URL must use http or https');
  }

  const hostname = parsed.hostname.toLowerCase();

  if (!ALLOWED_AI_SERVICE_HOSTS.has(hostname)) {
    throw new Error(
      `AI_SERVICE_URL host "${hostname}" is not allowed. Use ai-service, localhost, or 127.0.0.1`
    );
  }
}
