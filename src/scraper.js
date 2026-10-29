import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { parseCsv, csvToLead } from "./csv.js";

const image = "gosom/google-maps-scraper:latest";

export function createScraper({ dataDir, database }) {
  const jobs = new Map();

  return {
    start({ query, city, limit = 30 }) {
      const job = {
        id: randomUUID(), query: clean(query), city: clean(city), limit: Math.min(100, Math.max(5, Number(limit) || 30)),
        status: "queued", resultCount: 0, error: "", log: [],
      };
      jobs.set(job.id, job);
      database.createSearch(job);
      queueMicrotask(() => run(job).catch((error) => fail(job, error)));
      return publicJob(job);
    },
    get(id) {
      const job = jobs.get(id);
      return job ? publicJob(job) : database.listSearches().find((item) => item.id === id) || null;
    },
  };

  async function run(job) {
    job.status = "running";
    database.updateSearch(job.id, job);
    const jobDir = resolve(dataDir, "jobs", job.id);
    await mkdir(jobDir, { recursive: true });
    await writeFile(join(jobDir, "queries.txt"), `${job.query} em ${job.city}\n`, "utf8");
    const args = [
      "run", "--rm",
      "-v", `${jobDir}:/data`,
      image,
      "-input", "/data/queries.txt",
      "-results", "/data/results.csv",
      "-depth", depthFor(job.limit),
      "-c", "2",
      "-exit-on-inactivity", "45s",
    ];
    await runProcess("docker", args, job);
    const csv = await readFile(join(jobDir, "results.csv"), "utf8");
    const records = parseCsv(csv).slice(0, job.limit);
    let imported = 0;
    for (const record of records) {
      const lead = csvToLead(record);
      if (!lead.name) continue;
      database.upsertLead(lead, "google-maps");
      imported += 1;
    }
    job.status = "done";
    job.resultCount = imported;
    database.updateSearch(job.id, job);
  }

  function fail(job, error) {
    job.status = "error";
    job.error = friendlyError(error);
    job.log.push(String(error?.message || error));
    database.updateSearch(job.id, job);
  }
}

function runProcess(command, args, job) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    const push = (chunk) => {
      const lines = String(chunk).split(/\r?\n/).filter(Boolean);
      job.log.push(...lines);
      job.log = job.log.slice(-30);
    };
    child.stdout.on("data", push);
    child.stderr.on("data", push);
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolvePromise() : reject(new Error(`O motor de busca terminou com código ${code}. ${job.log.at(-1) || ""}`)));
  });
}

function depthFor(limit) {
  return String(Math.max(1, Math.min(8, Math.ceil(limit / 20))));
}

function publicJob(job) {
  return { id: job.id, query: job.query, city: job.city, status: job.status, resultCount: job.resultCount, error: job.error, log: job.log.slice(-8) };
}

function friendlyError(error) {
  const message = String(error?.message || error || "Falha desconhecida");
  if (message.includes("ENOENT")) return "Docker não foi encontrado. Abra o Docker Desktop e tente novamente.";
  if (message.includes("Cannot connect") || message.includes("daemon")) return "O Docker Desktop não está ativo. Abra-o e tente novamente.";
  return message;
}

function clean(value) {
  return String(value || "").replace(/[\r\n\0]/g, " ").trim().slice(0, 120);
}

