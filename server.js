/* eslint-disable @typescript-eslint/no-require-imports */
const { createServer } = require("node:http");
const { parse } = require("node:url");
const next = require("next");

const port = Number.parseInt(process.env.PORT || "3000", 10);
const hostname = "0.0.0.0";
const app = next({ dev: false, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((request, response) => {
    const parsedUrl = parse(request.url, true);
    handle(request, response, parsedUrl);
  }).listen(port, hostname, () => {
    console.log(`> Arena-Badminton listening on ${hostname}:${port}`);
  });
});
