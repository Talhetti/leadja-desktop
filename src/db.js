import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { defaultScoring, scoreLead } from "./scoring.js";

const stages = new Set(["new", "qualified", "contacted", "negotiating", "won", "lost"]);

export function createDatabase(path) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT '',
      address TEXT DEFAULT '',
      city TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      website TEXT DEFAULT '',
      rating REAL DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      maps_url TEXT DEFAULT '',
      source_id TEXT DEFAULT '',
      source TEXT DEFAULT 'manual',
      stage TEXT DEFAULT 'new',
      note TEXT DEFAULT '',
      score INTEGER DEFAULT 0,
      score_reasons TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(name, phone, address)
    );
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS searches (
      id TEXT PRIMARY KEY,
      query TEXT NOT NULL,
      city TEXT NOT NULL,
      status TEXT NOT NULL,
      result_count INTEGER DEFAULT 0,
      error TEXT DEFAULT '',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT
    );
  `);

  const resetKey = "clean-slate:0.1.4";
  const resetApplied = db.prepare("SELECT 1 FROM settings WHERE key = ?").get(resetKey);
  if (!resetApplied) {
    db.exec(`
      DELETE FROM leads;
      DELETE FROM searches;
      DELETE FROM sqlite_sequence WHERE name = 'leads';
    `);
    db.prepare("INSERT INTO settings (key, value) VALUES (?, ?)").run(resetKey, JSON.stringify(true));
  }

  const defaults = {
    senderName: "",
    offer: "criação de sites e presença digital",
    countryCode: "55",
    scoring: defaultScoring,
  };
  const insertSetting = db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)");
  for (const [key, value] of Object.entries(defaults)) insertSetting.run(key, JSON.stringify(value));

  return {
    raw: db,
    settings() {
      return Object.fromEntries(db.prepare("SELECT key, value FROM settings").all().map((row) => {
        try { return [row.key, JSON.parse(row.value)]; } catch { return [row.key, row.value]; }
      }));
    },
    saveSettings(input) {
      const save = db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value");
      for (const key of ["senderName", "offer", "countryCode", "scoring"]) {
        if (input[key] !== undefined) save.run(key, JSON.stringify(input[key]));
      }
      return this.settings();
    },
    listLeads(filters = {}) {
      const clauses = [];
      const values = [];
      if (filters.stage && stages.has(filters.stage)) { clauses.push("stage = ?"); values.push(filters.stage); }
      if (filters.search) {
        clauses.push("(name LIKE ? OR category LIKE ? OR address LIKE ?)");
        const needle = `%${filters.search}%`;
        values.push(needle, needle, needle);
      }
      if (Number(filters.minScore) > 0) { clauses.push("score >= ?"); values.push(Number(filters.minScore)); }
      const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
      return db.prepare(`SELECT * FROM leads ${where} ORDER BY score DESC, created_at DESC`).all(...values).map(mapLead);
    },
    getLead(id) {
      const row = db.prepare("SELECT * FROM leads WHERE id = ?").get(Number(id));
      return row ? mapLead(row) : null;
    },
    upsertLead(lead, source = "manual") {
      const settings = this.settings();
      const scored = scoreLead(lead, settings.scoring);
      const existingBySource = lead.sourceId
        ? db.prepare("SELECT id FROM leads WHERE source_id = ? LIMIT 1").get(String(lead.sourceId))
        : null;
      if (existingBySource) {
        db.prepare(`
          UPDATE leads SET name = ?, category = ?, address = ?, city = ?, phone = ?, website = ?,
            rating = ?, review_count = ?, maps_url = ?, source = ?, score = ?, score_reasons = ?,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).run(
          String(lead.name || "Negócio sem nome").trim(), String(lead.category || ""), String(lead.address || ""),
          String(lead.city || ""), String(lead.phone || ""), String(lead.website || ""), Number(lead.rating || 0),
          Number(lead.reviewCount || 0), String(lead.mapsUrl || ""), source, scored.score,
          JSON.stringify(scored.reasons), existingBySource.id,
        );
        return this.getLead(existingBySource.id);
      }
      const result = db.prepare(`
        INSERT INTO leads (name, category, address, city, phone, website, rating, review_count, maps_url, source_id, source, score, score_reasons)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(name, phone, address) DO UPDATE SET
          category = excluded.category, city = excluded.city, website = excluded.website,
          rating = excluded.rating, review_count = excluded.review_count, maps_url = excluded.maps_url,
          source_id = excluded.source_id, score = excluded.score, score_reasons = excluded.score_reasons,
          updated_at = CURRENT_TIMESTAMP
        RETURNING id
      `).get(
        String(lead.name || "Negócio sem nome").trim(), String(lead.category || ""), String(lead.address || ""),
        String(lead.city || ""), String(lead.phone || ""), String(lead.website || ""), Number(lead.rating || 0),
        Number(lead.reviewCount || 0), String(lead.mapsUrl || ""), String(lead.sourceId || ""), source,
        scored.score, JSON.stringify(scored.reasons),
      );
      return this.getLead(result.id);
    },
    updateLead(id, patch) {
      const current = this.getLead(id);
      if (!current) return null;
      const stage = stages.has(patch.stage) ? patch.stage : current.stage;
      const note = patch.note !== undefined ? String(patch.note) : current.note;
      db.prepare("UPDATE leads SET stage = ?, note = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(stage, note, Number(id));
      return this.getLead(id);
    },
    deleteLead(id) {
      return db.prepare("DELETE FROM leads WHERE id = ?").run(Number(id)).changes > 0;
    },
    stats() {
      const rows = db.prepare("SELECT stage, score, website, phone FROM leads").all();
      return {
        total: rows.length,
        hot: rows.filter((row) => row.score >= 70).length,
        noWebsite: rows.filter((row) => !row.website).length,
        contacted: rows.filter((row) => ["contacted", "negotiating", "won"].includes(row.stage)).length,
        stages: Object.fromEntries([...stages].map((stage) => [stage, rows.filter((row) => row.stage === stage).length])),
      };
    },
    createSearch(job) {
      db.prepare("INSERT INTO searches (id, query, city, status) VALUES (?, ?, ?, ?)").run(job.id, job.query, job.city, job.status);
    },
    updateSearch(id, patch) {
      db.prepare(`UPDATE searches SET status = ?, result_count = ?, error = ?, finished_at = CASE WHEN ? IN ('done','error') THEN CURRENT_TIMESTAMP ELSE finished_at END WHERE id = ?`)
        .run(patch.status, Number(patch.resultCount || 0), String(patch.error || ""), patch.status, id);
    },
    listSearches() {
      return db.prepare("SELECT * FROM searches ORDER BY created_at DESC LIMIT 20").all().map((row) => ({
        id: row.id, query: row.query, city: row.city, status: row.status, resultCount: row.result_count,
        error: row.error, createdAt: row.created_at, finishedAt: row.finished_at,
      }));
    },
  };
}

function mapLead(row) {
  return {
    id: row.id, name: row.name, category: row.category, address: row.address, city: row.city,
    phone: row.phone, website: row.website, rating: row.rating, reviewCount: row.review_count,
    mapsUrl: row.maps_url, sourceId: row.source_id, source: row.source, stage: row.stage,
    note: row.note, score: row.score, scoreReasons: JSON.parse(row.score_reasons || "[]"),
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

