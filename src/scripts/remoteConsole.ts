type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

const INGEST_PARAM = "ingest";
const DEFAULT_PORT = "3847";

declare global {
  interface Window {
    __remote_console_patched__?: boolean;
  }
}

export function setupRemoteConsole() {
  if (typeof window === "undefined") return;
  if (window.__remote_console_patched__) return;

  const params = new URLSearchParams(window.location.search);
  if (params.get(INGEST_PARAM) === "0") return;

  const ingestUrl = resolveIngestUrl(params);
  if (!isSafeEndpoint(ingestUrl)) return;

  window.__remote_console_patched__ = true;
  patchConsole(ingestUrl);
  hookGlobalErrors(ingestUrl);
  sendLog(ingestUrl, "info", ["remote-console enabled", ingestUrl]);
}

function resolveIngestUrl(params: URLSearchParams) {
  const explicitUrl = params.get("ingestUrl");
  if (explicitUrl) {
    try {
      return new URL(explicitUrl);
    } catch {
      return new URL(defaultIngestUrl());
    }
  }

  const protocol = normalizeProtocol(params.get("ingestProtocol") ?? window.location.protocol);
  const host = params.get("ingestHost") || window.location.hostname;
  const port = params.get("ingestPort") || DEFAULT_PORT;
  return new URL(`${protocol}//${host}:${port}/ingest`);
}

function defaultIngestUrl() {
  return `${window.location.protocol}//${window.location.hostname}:${DEFAULT_PORT}/ingest`;
}

function normalizeProtocol(raw: string) {
  if (raw === "http" || raw === "http:") return "http:";
  if (raw === "https" || raw === "https:") return "https:";
  return window.location.protocol;
}

function isSafeEndpoint(url: URL) {
  const pageIsHttps = window.location.protocol === "https:";
  if (pageIsHttps && url.protocol === "http:") {
    return false;
  }

  const isLoopback = /^(localhost|127\.0\.0\.1|::1)$/i.test(url.hostname);
  const pageOnRealHost = !/^(localhost|127\.0\.0\.1|::1)$/i.test(window.location.hostname);
  if (isLoopback && pageOnRealHost) {
    return false;
  }

  return true;
}

function patchConsole(ingestUrl: URL) {
  const levels: ConsoleLevel[] = ["log", "info", "warn", "error", "debug"];
  for (const level of levels) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      original(...args);
      sendLog(ingestUrl, level, args);
    };
  }
}

function hookGlobalErrors(ingestUrl: URL) {
  window.addEventListener("error", (event) => {
    sendLog(ingestUrl, "error", [
      event.message,
      { filename: event.filename, lineno: event.lineno, colno: event.colno },
    ]);
  });

  window.addEventListener("unhandledrejection", (event) => {
    sendLog(ingestUrl, "error", ["unhandledrejection", safeSerialize(event.reason)]);
  });
}

function sendLog(ingestUrl: URL, level: ConsoleLevel, args: unknown[]) {
  const payload = {
    level,
    pageUrl: window.location.href,
    userAgent: navigator.userAgent,
    args: args.map(safeSerialize),
  };

  fetch(ingestUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // デバッグ用途なので通信失敗は無視する
  });
}

function safeSerialize(value: unknown) {
  if (typeof value === "string") return value;
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return String(value);
  }
}
