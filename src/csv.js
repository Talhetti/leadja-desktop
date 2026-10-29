export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < String(text).length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(field);
      field = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  if (!rows.length) return [];
  const headers = rows.shift().map((header) => header.trim());
  return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

export function csvToLead(record) {
  const value = (...keys) => {
    for (const key of keys) {
      if (record[key] !== undefined && record[key] !== "") return record[key];
    }
    return "";
  };
  const name = value("title", "name", "Business Name", "empresa");
  const completeAddress = parseObject(value("complete_address"));
  const rawAddress = value("address", "Address", "endereco");
  const normalizedAddress = rawAddress.startsWith(`${name} - `) ? rawAddress.slice(name.length + 3) : rawAddress;
  const city = value("city", "City", "cidade") || completeAddress.city || "";

  return {
    name,
    category: value("category", "categories", "Category", "categoria"),
    address: normalizedAddress || formatAddress(completeAddress),
    city,
    phone: value("phone", "Phone", "telefone"),
    website: value("website", "Website", "site"),
    rating: Number(String(value("review_rating", "rating", "Rating", "nota")).replace(",", ".")) || 0,
    reviewCount: Number(String(value("review_count", "reviews", "Review Count", "avaliacoes")).replace(/\D/g, "")) || 0,
    mapsUrl: value("link", "google_maps_url", "Google Maps URL", "maps_url"),
    sourceId: value("cid", "data_id", "source_id"),
  };
}

function parseObject(value) {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatAddress(address) {
  const locality = [address.city, address.state].filter(Boolean).join(" - ");
  return [address.street, address.borough, locality].filter(Boolean).join(", ");
}

