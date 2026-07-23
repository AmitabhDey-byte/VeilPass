import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request("http://localhost/", { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server renders the VeilPass console", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /VeilPass/);
  assert.match(html, /Prove you belong/);
  assert.match(html, /Privacy model/);
  assert.match(html, /Deployment pending|addr_test1/);
});

test("privacy promise is visible in the rendered experience", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /Personal data exposed/);
  assert.match(html, /Your name/);
  assert.match(html, /Kept private/);
  assert.match(html, /Founders Circle/);
});

test("contract and project docs are included", async () => {
  const { access } = await import("node:fs/promises");
  await access(new URL("../contracts/veil-allowlist.compact", import.meta.url));
  await access(new URL("../README.md", import.meta.url));
});
