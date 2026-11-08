#!/usr/bin/env node
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import zlib from "node:zlib";

const argv = process.argv.slice(2);
const option = (name, fallback) => {
  const index = argv.indexOf(name);
  return index < 0 ? fallback : argv[index + 1];
};

const root = path.resolve(option("--root", "dist/site"));
const port = Number(option("--port", "4323"));
const base = option("--base", "/").replace(/\/?$/, "/");
const journal = option("--journal", "");
const requests = [];
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".wasm": "application/wasm",
  ".xml": "application/xml; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};
const compressible = new Set(Object.keys(contentTypes));

const server = http.createServer((request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  requests.push({ path: url.pathname, status: 0 });
  const record = requests.at(-1);
  if (!url.pathname.startsWith(base)) {
    record.status = 404;
    response.writeHead(404).end("Not found");
    return;
  }
  let relative;
  try { relative = decodeURIComponent(url.pathname.slice(base.length)); }
  catch { response.writeHead(400).end("Malformed URL"); return; }
  if (!relative || relative.endsWith("/")) relative += "index.html";
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    record.status = 404;
    response.writeHead(404).end("Not found");
    return;
  }
  record.status = 200;
  const ext = path.extname(file);
  response.setHeader("Content-Type", contentTypes[ext] ?? "application/octet-stream");
  const accept = String(request.headers["accept-encoding"] ?? "");
  const stream = fs.createReadStream(file);
  if (compressible.has(ext) && /(?:^|,|\s)gzip(?:$|,|;|\s)/i.test(accept)) {
    response.setHeader("Content-Encoding", "gzip");
    response.setHeader("Vary", "Accept-Encoding");
    stream.pipe(zlib.createGzip()).pipe(response);
    return;
  }
  stream.pipe(response);
}).listen(port, "127.0.0.1", () => {
  console.log(`Serving ${root} at http://127.0.0.1:${server.address().port}${base}`);
});

if (journal) {
  fs.mkdirSync(path.dirname(path.resolve(journal)), { recursive: true });
  const write = () => fs.writeFileSync(journal, JSON.stringify(requests, null, 2));
  setInterval(write, 100).unref();
  process.on("SIGTERM", () => {
    write();
    process.exit(0);
  });
}
