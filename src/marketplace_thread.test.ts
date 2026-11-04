import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { chooseEvent } from "./marketplace_thread.ts";

test("importing the module with a configured key does not start the server", () => {
  const result = spawnSync(process.execPath, [
    "--experimental-strip-types",
    "--input-type=module",
    "--eval",
    `await import(${JSON.stringify(new URL("./marketplace_thread.ts", import.meta.url).href)})`
  ], {
    env: { ...process.env, INFRAI_API_KEY: "unused-test-placeholder", PORT: "0" },
    timeout: 3000,
    encoding: "utf8"
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr);
});

test("a buyer read update becomes a receipt event", () => {
  assert.equal(chooseEvent({
    threadId: "order-42",
    accountId: "buyer-account",
    actor: "buyer",
    kind: "read",
    value: "message-7"
  }), "receipt.read");
});
