const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");

const port = Number.parseInt(process.env.PORT || "3737", 10);
const hostname = "0.0.0.0";
const dev = process.env.NODE_ENV !== "production";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`ELI Outreach listening on http://${hostname}:${port}`);
  });
});
