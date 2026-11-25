export type LogLevel = 'info' | 'warn' | 'error';

export interface ServerLogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  route: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  cacheStatus?: string;
  fallback?: boolean;
  errorCode?: string;
  detail?: string;
}

export interface ServerLogger {
  log(entry: Omit<ServerLogEntry, 'timestamp'>): void;
}

const SECRET_PATTERNS = [
  /AIza[0-9A-Za-z_-]{20,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /(api[_-]?key|secret|token|password)\s*[:=]\s*\S+/gi,
];

export function redactSensitiveText(input: string): string {
  let sanitized = input;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }
  return sanitized.slice(0, 300);
}

/**
 * Structured server logger designed to emit operational diagnostics
 * without recording personal data (names, health text, questions, or raw IPs)
 * or secrets.
 */
export function createServerLogger(
  sink: (line: string) => void = (line) => console.info(line),
): ServerLogger {
  return {
    log(entry) {
      const sanitizedEntry: ServerLogEntry = {
        timestamp: new Date().toISOString(),
        level: entry.level,
        event: entry.event,
        route: entry.route,
        ...(entry.method ? { method: entry.method } : {}),
        ...(entry.statusCode !== undefined ? { statusCode: entry.statusCode } : {}),
        ...(entry.durationMs !== undefined ? { durationMs: entry.durationMs } : {}),
        ...(entry.cacheStatus ? { cacheStatus: entry.cacheStatus } : {}),
        ...(entry.fallback !== undefined ? { fallback: entry.fallback } : {}),
        ...(entry.errorCode ? { errorCode: entry.errorCode } : {}),
        ...(entry.detail ? { detail: redactSensitiveText(entry.detail) } : {}),
      };
      sink(JSON.stringify(sanitizedEntry));
    },
  };
}
