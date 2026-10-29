const stageOrder = ["new", "contacted", "qualified", "negotiating", "won"];

const stageLabels = {
  new: "Novo",
  contacted: "Contatado",
  qualified: "Qualificado",
  negotiating: "Negociação",
  won: "Fechado",
  lost: "Perdido",
};

const icons = {
  users: '<svg class="icon" viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  search: '<svg class="icon" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>',
  columns: '<svg class="icon" viewBox="0 0 24 24"><rect x="3" y="4" width="7" height="16" rx="1"/><rect x="14" y="4" width="7" height="10" rx="1"/></svg>',
  settings: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.56V21h-4v-.08A1.7 1.7 0 0 0 8.96 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15 1.7 1.7 0 0 0 3.04 14H3v-4h.08A1.7 1.7 0 0 0 4.6 8.96a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 10 3.04V3h4v.08a1.7 1.7 0 0 0 1.04 1.52 1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.13.37.5.95 1.56 1H21v4h-.08a1.7 1.7 0 0 0-1.52 1Z"/></svg>',
  menu: '<svg class="icon" viewBox="0 0 24 24"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  plus: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  x: '<svg class="icon" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg>',
  arrow: '<svg class="icon" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  download: '<svg class="icon" viewBox="0 0 24 24"><path d="M12 3v12m0 0 4-4m-4 4-4-4M5 20h14"/></svg>',
};

const state = {
  view: "leads",
  dashboard: { leads: [], stats: { stages: {} }, searches: [], settings: {} },
  filters: { search: "", stage: "", minScore: 0 },
  activeLeadId: null,
  polling: null,
};

const app = document.querySelector("#app");
const drawer = document.querySelector("#detailDrawer");
const scrim = document.querySelector("#drawerScrim");
const toastEl = document.querySelector("#toast");
const sidebar = document.querySelector("#sidebar");

document.querySelectorAll("[data-icon]").forEach((element) => { element.innerHTML = icons[element.dataset.icon] || ""; });
document.addEventListener("click", handleClick);
document.querySelector("#menuButton").addEventListener("click", () => {
  sidebar.classList.toggle("is-open");
  scrim.hidden = !sidebar.classList.contains("is-open");
});
scrim.addEventListener("click", closeOverlays);

boot();

async function boot() {
  await refresh();
  render();
}

async function refresh() {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(state.filters)) if (value) params.set(key, value);
  try {
    state.dashboard = await api(`/api/dashboard?${params}`);
    document.querySelector("#navLeadCount").textContent = state.dashboard.stats.total || 0;
  } catch (error) {
    app.innerHTML = errorBlock("Não foi possível abrir o banco local.", error.message);
  }
}

function render() {
  document.querySelectorAll("[data-view]").forEach((button) => button.classList.toggle("is-active", button.dataset.view === state.view));
  document.querySelector("#mobileTitle").textContent = ({ leads: "Leads", search: "Buscar", crm: "CRM", settings: "Configurações" })[state.view];
  if (state.view === "leads") renderLeads();
  if (state.view === "search") renderSearch();
  if (state.view === "crm") renderCrm();
  if (state.view === "settings") renderSettings();
}

function renderLeads() {
  const { leads, stats } = state.dashboard;
  app.innerHTML = `
    <div class="page">
      ${pageHeading("Leads", hotFinding(stats), `<button class="button" id="importButton">${icons.download} Importar CSV</button><button class="button primary" data-view="search">${icons.plus} Nova busca</button>`)}
      <section class="kpi-strip" aria-label="Resumo dos leads">
        ${kpi("Leads salvos", stats.total, "no banco local")}
        ${kpi("Oportunidades quentes", stats.hot, "score igual ou acima de 70")}
        ${kpi("Sem site próprio", stats.noWebsite, "principal sinal comercial")}
        ${kpi("Já contatados", stats.contacted, "inclui negociações e fechados")}
      </section>
      <div class="workspace-grid">
        <section class="panel" aria-labelledby="leadListTitle">
          <div class="panel-header"><div><h2 id="leadListTitle">Prioridade de contato</h2><p>O score é calculado apenas com regras visíveis.</p></div><span class="num">${leads.length} na visualização</span></div>
          <div class="toolbar">
            <div class="toolbar-group"><input class="field" id="leadSearch" type="search" placeholder="Buscar empresa, nicho ou cidade" value="${escapeAttr(state.filters.search)}" /></div>
            <div class="toolbar-group">
              <select class="select" id="scoreFilter" aria-label="Filtrar por score"><option value="0">Todos os scores</option><option value="70" ${Number(state.filters.minScore) === 70 ? "selected" : ""}>Quentes: 70+</option><option value="50" ${Number(state.filters.minScore) === 50 ? "selected" : ""}>Promissores: 50+</option></select>
              <select class="select" id="stageFilter" aria-label="Filtrar por etapa"><option value="">Todas as etapas</option>${stageOptions(state.filters.stage)}</select>
            </div>
          </div>
          ${leads.length ? leadTable(leads) : emptyState("Nenhum lead nesta visualização", "Ajuste os filtros ou faça uma nova busca para preencher a lista.")}
        </section>
        <aside class="rail">
          <section class="rail-section"><h2>Leitura rápida</h2><div class="finding"><strong>${stats.hot ? `${stats.hot} ${stats.hot === 1 ? "lead merece" : "leads merecem"} atenção agora` : "Sua próxima oportunidade aparecerá aqui"}</strong><p>${stats.hot ? "Comece pelos que têm telefone e não possuem site próprio." : "Busque um nicho e uma cidade ou importe um CSV."}</p></div></section>
          <section class="rail-section"><h2>Funil local</h2><div class="panel rail-list">${stageOrder.map((key) => `<div class="rail-row"><span>${stageLabels[key]}</span><strong>${stats.stages?.[key] || 0}</strong></div>`).join("")}</div></section>
        </aside>
      </div>
      <input id="csvInput" type="file" accept=".csv,text/csv" hidden />
    </div>`;

  document.querySelector("#leadSearch")?.addEventListener("input", debounce(async (event) => {
    state.filters.search = event.target.value;
    await refresh(); renderLeads();
  }, 250));
  document.querySelector("#scoreFilter")?.addEventListener("change", async (event) => { state.filters.minScore = Number(event.target.value); await refresh(); renderLeads(); });
  document.querySelector("#stageFilter")?.addEventListener("change", async (event) => { state.filters.stage = event.target.value; await refresh(); renderLeads(); });
  document.querySelector("#importButton")?.addEventListener("click", () => document.querySelector("#csvInput").click());
  document.querySelector("#csvInput")?.addEventListener("change", importCsv);
}

function renderSearch() {
  const searches = state.dashboard.searches || [];
  app.innerHTML = `
    <div class="page">
      ${pageHeading("Buscar empresas", "Escolha um nicho e uma cidade. O motor local consulta o Google Maps e salva apenas resultados novos.", "")}
      <div class="search-layout">
        <section class="panel form-panel">
          <h2>Nova busca</h2><p>Comece com uma consulta pequena para validar a qualidade.</p>
          <form id="searchForm">
            <div class="form-grid">
              <label class="field-label">Nicho<input class="field" name="query" required placeholder="Ex.: clínicas odontológicas" /></label>
              <label class="field-label">Cidade<input class="field" name="city" required placeholder="Ex.: Curitiba, PR" /></label>
              <label class="field-label">Limite<select class="select" name="limit"><option>10</option><option selected>30</option><option>50</option><option>100</option></select></label>
            </div>
            <div class="form-actions"><button class="button accent" type="submit">${icons.search} Buscar no Google Maps</button><button class="button" type="button" id="openMaps">Abrir busca manual</button></div>
          </form>
          <div class="search-status" id="searchStatus" aria-live="polite"></div>
        </section>
        <section class="panel history-panel">
          <h2>Buscas recentes</h2><p>O histórico permanece neste computador.</p>
          <div class="history-list">${searches.length ? searches.map(searchHistoryItem).join("") : `<div class="column-empty">Nenhuma busca executada ainda.</div>`}</div>
        </section>
      </div>
    </div>`;
  document.querySelector("#searchForm").addEventListener("submit", startSearch);
  document.querySelector("#openMaps").addEventListener("click", () => {
    const form = new FormData(document.querySelector("#searchForm"));
    const query = `${form.get("query") || "empresas"} em ${form.get("city") || "Brasil"}`;
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(query)}`, "_blank", "noopener,noreferrer");
  });
  const active = searches.find((item) => ["queued", "running"].includes(item.status));
  if (active) pollSearch(active.id);
}

function renderCrm() {
  app.innerHTML = `
    <div class="page">
      ${pageHeading("CRM", "Arraste os leads entre as etapas ou abra um cartão para registrar a próxima ação.", `<button class="button primary" data-view="search">${icons.plus} Nova busca</button>`)}
      <section class="crm-board" aria-label="Funil de prospecção">
        ${stageOrder.map((stage) => {
          const leads = state.dashboard.leads.filter((lead) => lead.stage === stage);
          return `<div class="crm-column" data-stage="${stage}"><div class="crm-column-header"><h2>${stageLabels[stage]}</h2><span>${leads.length}</span></div>${leads.length ? leads.map(leadCard).join("") : `<div class="column-empty">Solte um lead aqui.</div>`}</div>`;
        }).join("")}
      </section>
    </div>`;
  document.querySelectorAll(".lead-card").forEach((card) => card.addEventListener("dragstart", (event) => event.dataTransfer.setData("text/plain", card.dataset.leadId)));
  document.querySelectorAll(".crm-column").forEach((column) => {
    column.addEventListener("dragover", (event) => event.preventDefault());
    column.addEventListener("drop", async (event) => {
      event.preventDefault();
      const id = event.dataTransfer.getData("text/plain");
      await updateLead(id, { stage: column.dataset.stage });
      toast("Etapa atualizada.");
    });
  });
}

function renderSettings() {
  const settings = state.dashboard.settings;
  const weights = settings.scoring || {};
  const theme = document.documentElement.dataset.theme || "light";
  app.innerHTML = `
    <div class="page settings-list">
      ${pageHeading("Configurações", "Ajuste a oferta, a mensagem e o que torna uma oportunidade importante para você.", "")}
      <form id="settingsForm">
        <section class="settings-section">
          <div class="settings-copy"><h2>Aparência</h2><p>Escolha o tema mais confortável para trabalhar. A preferência fica salva neste computador.</p></div>
          <div class="settings-panel">
            <label class="field-label">Tema<select class="select" id="themeSelect" name="theme"><option value="light" ${theme === "light" ? "selected" : ""}>Claro</option><option value="dark" ${theme === "dark" ? "selected" : ""}>Escuro</option></select></label>
          </div>
        </section>
        <section class="settings-section">
          <div class="settings-copy"><h2>Sua abordagem</h2><p>Esses dados entram nas mensagens. Nada é enviado automaticamente.</p></div>
          <div class="settings-panel">
            <label class="field-label">Seu nome<input class="field" name="senderName" value="${escapeAttr(settings.senderName || "")}" placeholder="Ex.: Álvaro" /></label>
            <label class="field-label">O que você oferece<input class="field" name="offer" value="${escapeAttr(settings.offer || "")}" /></label>
            <label class="field-label">Código do país<input class="field num" name="countryCode" inputmode="numeric" value="${escapeAttr(settings.countryCode || "55")}" /></label>
          </div>
        </section>
        <section class="settings-section">
          <div class="settings-copy"><h2>Peso do score</h2><p>Os pontos são somados e limitados a 100. A explicação fica visível em cada lead.</p></div>
          <div class="settings-panel weight-grid">
            ${weightField("noWebsite", "Sem site próprio", weights)}
            ${weightField("socialAsWebsite", "Rede social usada como site", weights)}
            ${weightField("fewReviews", "Menos de 15 avaliações", weights)}
            ${weightField("noReviews", "Nenhuma avaliação", weights)}
            ${weightField("lowRating", "Nota abaixo de 4,0", weights)}
            ${weightField("hasPhone", "Telefone disponível", weights)}
            ${weightField("insecureWebsite", "Site sem HTTPS", weights)}
          </div>
        </section>
        <div class="heading-actions"><button class="button primary" type="submit">Salvar configurações</button></div>
      </form>
    </div>`;
  document.querySelector("#settingsForm").addEventListener("submit", saveSettings);
  document.querySelector("#themeSelect").addEventListener("change", (event) => {
    setTheme(event.target.value);
    toast(`Tema ${event.target.value === "dark" ? "escuro" : "claro"} aplicado.`);
  });
}

async function handleClick(event) {
  const viewButton = event.target.closest("[data-view]");
  if (viewButton) {
    state.view = viewButton.dataset.view;
    sidebar.classList.remove("is-open"); scrim.hidden = true;
    render();
    return;
  }
  const leadTarget = event.target.closest("[data-lead-id]");
  if (leadTarget && !event.target.closest("a,button,select,textarea")) openLead(Number(leadTarget.dataset.leadId));
  if (event.target.closest("[data-close-drawer]")) closeOverlays();
}

async function openLead(id) {
  const lead = await api(`/api/leads/${id}`);
  state.activeLeadId = id;
  drawer.hidden = false;
  scrim.hidden = false;
  drawer.innerHTML = `
    <div class="drawer-header"><div><h2>${escapeHtml(lead.name)}</h2><p>${escapeHtml(lead.category || "Empresa local")} · ${escapeHtml(lead.city || "Cidade não informada")}</p></div><button class="icon-button" data-close-drawer aria-label="Fechar">${icons.x}</button></div>
    <div class="drawer-score"><strong class="num">${lead.score}</strong><span>de 100 no score de oportunidade</span></div>
    <div class="receipt">${lead.scoreReasons.length ? lead.scoreReasons.map((reason) => `<div class="receipt-row"><span>${escapeHtml(reason.label)}</span><strong>+${reason.value}</strong></div>`).join("") : `<div class="receipt-row"><span>Nenhum sinal configurado</span><strong>0</strong></div>`}</div>
    <dl class="detail-grid"><dt>Telefone</dt><dd>${escapeHtml(lead.phone || "—")}</dd><dt>Site</dt><dd>${lead.website ? `<a href="${escapeAttr(lead.website)}" target="_blank" rel="noreferrer">${escapeHtml(lead.website)}</a>` : "—"}</dd><dt>Avaliações</dt><dd>${lead.rating ? `${lead.rating.toFixed(1)} com ${lead.reviewCount} avaliações` : `${lead.reviewCount} avaliações`}</dd><dt>Endereço</dt><dd>${escapeHtml(lead.address || "—")}</dd><dt>Google Maps</dt><dd><a href="${escapeAttr(lead.googleMapsUrl)}" target="_blank" rel="noreferrer">Abrir no Google Maps ↗</a></dd></dl>
    <section class="drawer-section"><h3>Etapa</h3><select class="select" id="drawerStage">${stageOptions(lead.stage)}</select></section>
    <section class="drawer-section"><h3>Mensagem sugerida</h3><textarea class="textarea" id="drawerMessage">${escapeHtml(lead.message)}</textarea><button class="button text" id="copyMessage">Copiar mensagem</button></section>
    <section class="drawer-section"><h3>Anotações</h3><textarea class="textarea" id="drawerNote" placeholder="Próxima ação, resposta ou contexto...">${escapeHtml(lead.note || "")}</textarea></section>
    <section class="drawer-section danger-zone"><h3>Remover do CRM</h3><p>Esta ação exclui o lead da lista e do funil local.</p><button class="button danger" id="deleteLead">Excluir lead</button></section>
    <div class="drawer-actions">${lead.whatsappUrl ? `<a class="button accent" href="${lead.whatsappUrl}" target="_blank" rel="noreferrer">Abrir WhatsApp ${icons.arrow}</a>` : `<button class="button" disabled>Telefone indisponível</button>`}<button class="button primary" id="saveLead">Salvar</button></div>`;
  document.querySelector("#copyMessage").addEventListener("click", async () => {
    await navigator.clipboard.writeText(document.querySelector("#drawerMessage").value);
    toast("Mensagem copiada.");
  });
  document.querySelector("#saveLead").addEventListener("click", async () => {
    await updateLead(id, { stage: document.querySelector("#drawerStage").value, note: document.querySelector("#drawerNote").value });
    closeOverlays(); toast("Lead atualizado.");
  });
  document.querySelector("#deleteLead").addEventListener("click", async () => {
    if (!window.confirm(`Excluir “${lead.name}” do CRM? Esta ação não pode ser desfeita.`)) return;
    await api(`/api/leads/${id}`, { method: "DELETE" });
    closeOverlays();
    await refresh();
    render();
    toast("Lead excluído.");
  });
}

async function updateLead(id, patch) {
  await api(`/api/leads/${id}`, { method: "PATCH", body: patch });
  await refresh();
  render();
}

async function startSearch(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const status = document.querySelector("#searchStatus");
  status.className = "search-status is-visible";
  status.innerHTML = `<strong>Preparando o motor local</strong><span>O navegador local será aberto em segundo plano para consultar o Google Maps.</span><div class="progress-track"><i></i></div>`;
  try {
    const job = await api("/api/searches", { method: "POST", body: Object.fromEntries(form) });
    pollSearch(job.id);
  } catch (error) {
    status.innerHTML = `<strong>A busca não começou</strong><span>${escapeHtml(error.message)}</span>`;
  }
}

function pollSearch(id) {
  clearInterval(state.polling);
  const check = async () => {
    const job = await api(`/api/searches/${id}`);
    const status = document.querySelector("#searchStatus");
    if (status) {
      status.className = "search-status is-visible";
      if (["queued", "running"].includes(job.status)) status.innerHTML = `<strong>Buscando ${escapeHtml(job.query)} em ${escapeHtml(job.city)}</strong><span>Os resultados aparecem assim que o Google Maps concluir a coleta.</span><div class="progress-track"><i></i></div>`;
      if (job.status === "done") status.innerHTML = `<strong>Busca concluída</strong><span>${job.resultCount} leads foram processados e deduplicados.</span>`;
      if (job.status === "error") status.innerHTML = `<strong>Não foi possível concluir</strong><span>${escapeHtml(job.error)}</span>`;
    }
    if (["done", "error"].includes(job.status)) {
      clearInterval(state.polling); state.polling = null; await refresh();
      if (state.view === "search") renderSearch();
      toast(job.status === "done" ? `${job.resultCount} leads adicionados.` : "A busca precisa de atenção.");
    }
  };
  check();
  state.polling = setInterval(check, 2500);
}

async function importCsv(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const result = await api("/api/leads/import", { method: "POST", body: { csv: await file.text() } });
    await refresh(); renderLeads(); toast(`${result.imported} leads importados.`);
  } catch (error) { toast(error.message); }
}

async function saveSettings(event) {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const scoring = {};
  for (const [key, value] of data.entries()) if (key.startsWith("score.")) scoring[key.slice(6)] = Number(value);
  await api("/api/settings", { method: "PUT", body: { senderName: data.get("senderName"), offer: data.get("offer"), countryCode: data.get("countryCode"), scoring } });
  await refresh(); renderSettings(); toast("Configurações salvas.");
}

function leadTable(leads) {
  return `<table class="lead-table"><thead><tr><th class="identity">Empresa</th><th class="location">Localização</th><th class="num reviews">Avaliações</th><th class="status-col">Etapa</th><th class="num score-col">Score</th><th class="action-col"></th></tr></thead><tbody>${leads.map((lead) => `<tr data-lead-id="${lead.id}"><td class="identity"><span class="lead-name">${escapeHtml(lead.name)}</span><span class="lead-subline">${escapeHtml(lead.category || "Categoria não informada")}${lead.website ? " · com site" : " · sem site"}</span></td><td class="location">${escapeHtml(lead.city || lead.address || "—")}</td><td class="num reviews">${lead.rating ? lead.rating.toFixed(1) : "—"} <span class="lead-subline">${lead.reviewCount} avaliações</span></td><td class="status-col"><span class="pill ${lead.stage}">${stageLabels[lead.stage]}</span></td><td class="num score-col"><span class="score ${scoreClass(lead.score)}">${lead.score}</span></td><td class="action-col">${icons.arrow}</td></tr>`).join("")}</tbody></table>`;
}

function leadCard(lead) {
  return `<article class="lead-card" draggable="true" data-lead-id="${lead.id}"><strong>${escapeHtml(lead.name)}</strong><span>${escapeHtml(lead.category || "Empresa local")} · ${escapeHtml(lead.city || "Sem cidade")}</span><div class="card-footer"><span>${lead.phone ? "WhatsApp disponível" : "Sem telefone"}</span><span class="score ${scoreClass(lead.score)}">${lead.score}</span></div></article>`;
}

function searchHistoryItem(item) {
  const label = item.status === "done" ? `${item.resultCount} leads` : item.status === "error" ? "Falhou" : "Em andamento";
  return `<div class="history-item"><div><strong>${escapeHtml(item.query)}</strong><span>${escapeHtml(item.city)} · ${formatDate(item.createdAt)}</span></div><span class="pill ${item.status === "done" ? "won" : item.status === "error" ? "lost" : "qualified"}">${label}</span></div>`;
}

function pageHeading(title, subtitle, actions) {
  return `<header class="page-heading"><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div>${actions ? `<div class="heading-actions">${actions}</div>` : ""}</header>`;
}

function kpi(label, value, caption) { return `<div class="kpi"><span>${label}</span><strong>${Number(value || 0).toLocaleString("pt-BR")}</strong><small>${caption}</small></div>`; }
function hotFinding(stats) { return stats.hot ? `${stats.hot} ${stats.hot === 1 ? "oportunidade está" : "oportunidades estão"} pronta para contato; a lista já começa pelas mais fortes.` : "Seus leads ficam ordenados pelos sinais que mais importam para a sua oferta."; }
function emptyState(title, copy) { return `<div class="empty-state"><div><strong>${title}</strong><p>${copy}</p><button class="button primary" data-view="search">Fazer uma busca</button></div></div>`; }
function errorBlock(title, copy) { return `<div class="empty-state"><div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(copy)}</p><button class="button" onclick="location.reload()">Tentar novamente</button></div></div>`; }
function stageOptions(selected) { return Object.entries(stageLabels).map(([value, label]) => `<option value="${value}" ${selected === value ? "selected" : ""}>${label}</option>`).join(""); }
function weightField(key, label, weights) { return `<label for="score-${key}">${label}</label><input class="field num" id="score-${key}" name="score.${key}" type="number" min="0" max="100" value="${Number(weights[key] || 0)}" />`; }
function scoreClass(score) { return score >= 70 ? "hot" : score >= 50 ? "warm" : "low"; }
function formatDate(value) { return value ? new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(`${value.replace(" ", "T")}Z`)) : "—"; }

function closeOverlays() {
  drawer.hidden = true; drawer.innerHTML = ""; sidebar.classList.remove("is-open"); scrim.hidden = true; state.activeLeadId = null;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const value = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(value.error || "A operação não foi concluída.");
  return value;
}

function toast(message) {
  toastEl.textContent = message; toastEl.classList.add("is-visible");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => toastEl.classList.remove("is-visible"), 2600);
}

function setTheme(value) {
  const theme = value === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("leadja-theme", theme);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#0b0e0d" : "#edf5f1");
}

function debounce(fn, delay) {
  let timer;
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
}

function escapeHtml(value) { return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]); }
function escapeAttr(value) { return escapeHtml(value); }

