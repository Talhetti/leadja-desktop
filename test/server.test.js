import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startServer } from "../server.js";

test("server can start on an ephemeral port", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "leadja-server-"));
  const runtime = await startServer({ port: 0, dataDir, scraperExecutable: null });
  try {
    const response = await fetch(`${runtime.url}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    await new Promise((resolvePromise) => runtime.server.close(resolvePromise));
    await rm(dataDir, { recursive: true, force: true });
  }
});
