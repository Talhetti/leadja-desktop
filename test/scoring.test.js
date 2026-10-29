import test from "node:test";
import assert from "node:assert/strict";
import { buildMessage, normalizePhone, scoreLead, websiteKind } from "../src/scoring.js";
import { parseCsv, csvToLead } from "../src/csv.js";

test("score is deterministic and capped at 100", () => {
  const result = scoreLead({ website: "", phone: "11999998888", reviewCount: 0, rating: 3.5 });
  assert.equal(result.score, 72);
  assert.deepEqual(result.reasons.map((item) => item.key), ["noWebsite", "noReviews", "lowRating", "hasPhone"]);
});

test("social links are not treated as owned websites", () => {
  assert.equal(websiteKind("https://instagram.com/padaria"), "social");
  assert.equal(websiteKind("https://padaria.com.br"), "website");
});

test("message uses the actual company and offer", () => {
  const message = buildMessage({ name: "Padaria Estação 27", category: "Padaria", city: "Curitiba", website: "", reviewCount: 8 }, { offer: "sites rápidos" });
  assert.match(message, /Padaria Estação 27/);
  assert.match(message, /sites rápidos/);
  assert.match(message, /site próprio/);
});

test("Brazilian phone numbers receive country code", () => {
  assert.equal(normalizePhone("(41) 98765-4321", "55"), "5541987654321");
  assert.equal(normalizePhone("+55 41 98765-4321", "55"), "5541987654321");
});

test("CSV parser handles quoted commas", () => {
  const [record] = parseCsv('title,address,phone\n"Café, Centro","Rua A, 10",11999999999\n');
  const lead = csvToLead(record);
  assert.equal(lead.name, "Café, Centro");
  assert.equal(lead.address, "Rua A, 10");
});

test("Google Maps rows produce a clean address and city", () => {
  const lead = csvToLead({
    title: "Café Exemplo",
    address: "Café Exemplo - Rua das Flores, 10 - Centro, Curitiba - PR",
    complete_address: JSON.stringify({ city: "Curitiba", state: "Paraná" }),
  });
  assert.equal(lead.address, "Rua das Flores, 10 - Centro, Curitiba - PR");
  assert.equal(lead.city, "Curitiba");
});

