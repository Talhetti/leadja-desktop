export const defaultScoring = {
  noWebsite: 42,
  socialAsWebsite: 30,
  fewReviews: 18,
  lowRating: 10,
  hasPhone: 10,
  noReviews: 10,
  insecureWebsite: 5,
};

const socialHosts = ["instagram.com", "facebook.com", "fb.com", "linktr.ee", "wa.me", "whatsapp.com"];

export function websiteKind(website = "") {
  const normalized = String(website || "").trim().toLowerCase();
  if (!normalized) return "none";
  if (socialHosts.some((host) => normalized.includes(host))) return "social";
  return "website";
}

export function scoreLead(lead, weights = defaultScoring) {
  const reasons = [];
  const kind = websiteKind(lead.website);
  const reviews = Number(lead.reviewCount || 0);
  const rating = Number(lead.rating || 0);

  const add = (key, label) => {
    const value = Math.max(0, Number(weights[key] ?? defaultScoring[key] ?? 0));
    if (value) reasons.push({ key, label, value });
  };

  if (kind === "none") add("noWebsite", "Sem site próprio");
  if (kind === "social") add("socialAsWebsite", "Rede social usada como site");
  if (reviews === 0) add("noReviews", "Sem avaliações");
  else if (reviews < 15) add("fewReviews", "Poucas avaliações");
  if (rating > 0 && rating < 4) add("lowRating", "Nota abaixo de 4,0");
  if (String(lead.phone || "").trim()) add("hasPhone", "Telefone disponível");
  if (kind === "website" && String(lead.website).startsWith("http://")) {
    add("insecureWebsite", "Site sem HTTPS");
  }

  const raw = reasons.reduce((total, reason) => total + reason.value, 0);
  return { score: Math.min(100, raw), reasons };
}

export function buildMessage(lead, settings = {}) {
  const company = lead.name || "seu negócio";
  const category = (lead.category || "empresa local").toLowerCase();
  const city = lead.city || extractCity(lead.address) || "sua região";
  const offer = settings.offer || "sites e presença digital";
  const sender = settings.senderName ? `\n\n${settings.senderName}` : "";
  const kind = websiteKind(lead.website);

  let observation = `encontrei a ${company} no Google enquanto pesquisava ${category} em ${city}`;
  let opportunity = `Vi algumas oportunidades de melhorar a presença digital e facilitar novos contatos.`;
  if (kind === "none") opportunity = `Percebi que vocês ainda não têm um site próprio para apresentar os serviços e receber novos contatos.`;
  if (kind === "social") opportunity = `Percebi que hoje a presença de vocês depende principalmente das redes sociais, sem um site próprio.`;
  if (Number(lead.reviewCount || 0) < 15) opportunity += ` O perfil também tem espaço para ganhar mais destaque nas buscas locais.`;

  return `Olá! Eu ${observation}. ${opportunity}\n\nTrabalho com ${offer}. Posso te enviar, sem compromisso, uma ideia objetiva para a ${company}?${sender}`;
}

export function normalizePhone(phone, countryCode = "55") {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith(countryCode) || digits.length > 11) return digits;
  return `${countryCode}${digits}`;
}

function extractCity(address = "") {
  const parts = String(address).split(",").map((part) => part.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.at(-2).replace(/\s*-\s*[A-Z]{2}$/i, "") : "";
}

