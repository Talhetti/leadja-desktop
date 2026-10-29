import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createDatabase } from "../src/db.js";

test("reopening the database preserves leads and creates a startup backup", async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "leadja-database-"));
  const path = join(dataDir, "leadja.sqlite");
  try {
    const original = createDatabase(path);
    original.upsertLead({ name: "Lead preservado", phone: "43999999999" });
    original.createSearch({ id: "saved-search", query: "Marmoraria", city: "Londrina", status: "done" });
    original.raw.close();

    const reopened = createDatabase(path);
    assert.equal(reopened.listLeads().length, 1);
    assert.equal(reopened.listLeads()[0].name, "Lead preservado");
    assert.equal(reopened.listSearches().length, 1);
    reopened.raw.close();

    const backups = await readdir(join(dataDir, "backups"));
    assert.equal(backups.length, 1);
    const backup = new DatabaseSync(join(dataDir, "backups", backups[0]), { readOnly: true });
    assert.equal(backup.prepare("PRAGMA integrity_check").get().integrity_check, "ok");
    assert.equal(backup.prepare("SELECT COUNT(*) AS count FROM leads").get().count, 1);
    backup.close();
  } finally {
    await rm(dataDir, { recursive: true, force: true });
  }
});
