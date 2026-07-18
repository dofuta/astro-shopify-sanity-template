import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import qrcodeTerminal from "qrcode-terminal";

const shownUrls = new Set();
const children = [];
let shuttingDown = false;
const ingestPort = Number(process.env.INGEST_PORT || 3847);

function prefixAndPipe(child, label) {
  const wire = (stream) => {
    let buffer = "";
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      buffer += chunk;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        console.log(`[${label}] ${line}`);
        if (label === "astro") {
          detectAndRenderNetworkUrl(line);
        }
      }
    });
    stream.on("end", () => {
      if (buffer.trim()) {
        console.log(`[${label}] ${buffer}`);
        if (label === "astro") {
          detectAndRenderNetworkUrl(buffer);
        }
      }
    });
  };

  wire(child.stdout);
  wire(child.stderr);
}

function detectAndRenderNetworkUrl(line) {
  const urls = extractCandidateUrls(line);
  for (const url of urls) {
    if (shownUrls.has(url)) continue;
    shownUrls.add(url);

    console.log("\n[phone-log] Network URL detected. iPhoneで開いてください:");
    console.log(`[phone-log] ${url}`);
    console.log("[phone-log] QR:");
    qrcodeTerminal.generate(url, { small: true });
    console.log("");
  }
}

function extractCandidateUrls(line) {
  const normalized = line.replace(/\u001b\[[0-9;]*m/g, "");
  const matches = normalized.match(/https?:\/\/[^\s]+/g) ?? [];
  return matches.filter((raw) => {
    try {
      const url = new URL(raw);
      if (!/^https?:$/.test(url.protocol)) return false;
      if (url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1") {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });
}

function spawnManaged(command, args, label) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  children.push(child);
  prefixAndPipe(child, label);
  return child;
}

async function shutdown(signal = "SIGTERM") {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
  await sleep(120);
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
  }
}

const ingest = spawnManaged(process.execPath, ["scripts/log-ingest-server.mjs"], "ingest");
const astro = spawnManaged(process.execPath, ["./node_modules/astro/astro.js", "dev", "--host"], "astro");

ingest.on("exit", async (code) => {
  if (code === 0 || shuttingDown) return;
  if (code === 98 || code === 1) {
    console.error(`[phone-log] ingest server failed. ポート ${ingestPort} が使用中の可能性があります。`);
    console.error(`[phone-log] 確認: lsof -i :${ingestPort}`);
  }
  await shutdown();
  process.exit(code ?? 1);
});

astro.on("exit", async (code) => {
  if (shuttingDown) return;
  await shutdown();
  process.exit(code ?? 0);
});

process.on("SIGINT", async () => {
  await shutdown("SIGINT");
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await shutdown("SIGTERM");
  process.exit(0);
});
