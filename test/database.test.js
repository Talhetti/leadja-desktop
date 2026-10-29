import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDatabase } from "../src/db.js";

test("version 0.1.4 starts once with an empty workspace", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "leadja-database-"));
  const path = join(dataDir, "leadja.sqlite");
  try {
    const previous = createDatabase(path);
    previous.raw.prepare("DELETE FROM settings WHERE key = ?").run("clean-slate:0.1.4");
    previous.upsertLead({ name: "Lead antigo", phone: "43999999999" });
    previous.createSearch({ id: "old-search", query: "Marmoraria", city: "Londrina", status: "done" });
    previous.raw.close();

    const upgraded = createDatabase(path);
    assert.deepEqual(upgraded.listLeads(), []);
    assert.deepEqual(upgraded.listSearches(), []);
    upgraded.upsertLead({ name: "Lead novo", phone: "43888888888" });
    upgraded.raw.close();

    const reopened = createDatabase(path);
    assert.equal(reopened.listLeads().length, 1);
    assert.equal(reopened.listLeads()[0].name, "Lead novo");
    reopened.raw.close();
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
