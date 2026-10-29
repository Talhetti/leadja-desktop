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

    const dashboardResponse = await fetch(`${runtime.url}/api/dashboard`);
    assert.equal(dashboardResponse.status, 200);
    const dashboard = await dashboardResponse.json();
    assert.equal(dashboard.stats.total, 0);
    assert.deepEqual(dashboard.leads, []);
    assert.deepEqual(dashboard.searches, []);

    const importResponse = await fetch(`${runtime.url}/api/leads/import`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ csv: "title,phone,address\nLead temporário,43999999999,Londrina" }),
    });
    assert.equal(importResponse.status, 200);
    const importedDashboard = await (await fetch(`${runtime.url}/api/dashboard`)).json();
    assert.equal(importedDashboard.stats.total, 1);

    const deleteResponse = await fetch(`${runtime.url}/api/leads/${importedDashboard.leads[0].id}`, { method: "DELETE" });
    assert.equal(deleteResponse.status, 200);
    assert.deepEqual(await deleteResponse.json(), { deleted: true });
    const emptyDashboard = await (await fetch(`${runtime.url}/api/dashboard`)).json();
    assert.equal(emptyDashboard.stats.total, 0);
  } finally {
    await new Promise((resolvePromise) => runtime.server.close(resolvePromise));
    await rm(dataDir, { recursive: true, force: true });
  }
});
