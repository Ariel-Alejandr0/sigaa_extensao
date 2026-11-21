// Roda nas paginas do SIGAA; so mostra o botao na pagina inicial do discente.
(function () {
  if (!document.querySelector("#turmas-portal")) return;
  const P = globalThis.SigaaParser;
  const HOME = "/sigaa/portais/discente/discente.jsf";
  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

  // ---------- interface ----------
  const caixa = document.createElement("div");
  caixa.id = "sigaa-agenda-caixa";
  caixa.hidden = true; // so aparece depois de ler se o usuario a tinha fechado
  caixa.innerHTML = `
    <div id="sigaa-agenda-topo">
      <span>SIGAA → Google Agenda</span>
      <button id="sigaa-agenda-fechar" title="Fechar (reabra clicando no ícone da extensão)" aria-label="Fechar">×</button>
    </div>
    <button id="sigaa-agenda-sync" title="Abre o Google para você escolher a conta e importa as avaliações">📅 Enviar ao Google Agenda</button>
    <button id="sigaa-agenda-ics" title="Baixar arquivo para importar no Google Agenda à mão">Baixar .ics</button>
    <div id="sigaa-agenda-status"></div>`;
  document.body.appendChild(caixa);
  const status = (msg, tipo = "") => {
    const el = caixa.querySelector("#sigaa-agenda-status");
    el.textContent = msg;
    el.className = tipo;
  };
  /** @type {NodeListOf<HTMLButtonElement>} */
  const botoes = caixa.querySelectorAll("button:not(#sigaa-agenda-fechar)"); // fechar nunca trava
  const travar = (sim) => botoes.forEach((b) => (b.disabled = sim));

  // ---------- fechar / reabrir ----------
  // O estado fica salvo: fechada continua fechada nas outras paginas do SIGAA ate o clique no icone.
  const lembrarFechada = (fechada) => {
    try { chrome.storage.local.set({ caixaFechada: fechada }).catch(() => {}); } catch { /* extensao recarregada */ }
  };
  caixa.querySelector("#sigaa-agenda-fechar").addEventListener("click", () => {
    caixa.hidden = true;
    lembrarFechada(true);
  });
  try {
    chrome.storage.local.get("caixaFechada")
      .then(({ caixaFechada }) => { caixa.hidden = !!caixaFechada; })
      .catch(() => { caixa.hidden = false; });
    chrome.runtime.onMessage.addListener((msg, _remetente, responder) => {
      if (msg?.tipo !== "mostrarCaixa") return; // enviado pelo background ao clicar no icone
      caixa.hidden = false;
      lembrarFechada(false);
      responder({ ok: true });
    });
  } catch { caixa.hidden = false; } // extensao recarregada: mostra assim mesmo (o envio avisa o que fazer)

  // ---------- acesso ao SIGAA ----------
  async function paraDocumento(res) {
    const buf = await res.arrayBuffer();
    let cs = (res.headers.get("content-type") || "").match(/charset=([^;]+)/i)?.[1];
    if (!cs) {
      const cabeca = new TextDecoder("iso-8859-1").decode(buf.slice(0, 4096));
      cs = cabeca.match(/charset=["']?([\w-]+)/i)?.[1] || "iso-8859-1";
    }
    let html;
    try { html = new TextDecoder(cs.trim()).decode(buf); }
    catch { html = new TextDecoder("iso-8859-1").decode(buf); }
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (doc.querySelector('input[name="user.login"]'))
      throw new Error("Sua sessão do SIGAA expirou. Faça login de novo e tente outra vez.");
    return doc;
  }

  async function abrirHome() {
    const res = await fetch(HOME, { credentials: "include" });
    return paraDocumento(res);
  }

  async function abrirTurma(homeDoc, indice) {
    const link = homeDoc.querySelectorAll("#turmas-portal td.descricao a")[indice];
    if (!link) throw new Error("Turma não encontrada na página inicial");
    const { action, params } = P.parametrosLinkJsf(homeDoc, link);
    const res = await fetch(new URL(action, location.origin), {
      method: "POST", body: params, credentials: "include",
    });
    return paraDocumento(res);
  }

  async function coletar() {
    const eventos = P.parseAtividadesHome(document);
    const turmas = P.parseTurmas(document);
    for (const t of turmas) {
      status(`Lendo ${t.nome} (${t.indice + 1}/${turmas.length})…`);
      const home = await abrirHome(); // estado JSF novo antes de cada turma
      const turma = await abrirTurma(home, t.indice);
      eventos.push(...P.parseAvaliacoesTurma(turma, t.nome, t.inicio));
      await dormir(700); // educado com o servidor
    }
    await abrirHome(); // devolve o servidor para a pagina inicial
    return P.juntar(eventos);
  }

  // ---------- acoes ----------
  // Depois de recarregar a extensao, a pagina aberta fica com um script "orfao" (sem chrome.runtime).
  async function pedirAoBackground(msg) {
    if (!globalThis.chrome?.runtime?.id)
      throw new Error("A extensão foi atualizada. Recarregue esta página (F5) e tente de novo.");
    try { return await chrome.runtime.sendMessage(msg); }
    catch (e) {
      if (/context invalidated/i.test(e.message))
        throw new Error("A extensão foi atualizada. Recarregue esta página (F5) e tente de novo.", { cause: e });
      throw e;
    }
  }

  const nEventos = (n) => `${n} ${n === 1 ? "evento" : "eventos"}`;

  async function executar(acao) {
    travar(true);
    try { await acao(); }
    catch (e) {
      status("Erro: " + e.message, "erro");
      console.error("[SIGAA Agenda]", e);
    } finally { travar(false); }
  }

  caixa.querySelector("#sigaa-agenda-sync").addEventListener("click", () => executar(async () => {
    const eventos = await coletar();
    if (!eventos.length) { status("Nenhuma avaliação encontrada.", "aviso"); return; }
    const ics = await P.gerarIcs(eventos);
    const r = await pedirAoBackground({ tipo: "importarNoGoogle", ics });
    if (r?.erro) throw new Error(r.erro);
    status(`${nEventos(eventos.length)} pronto(s). Escolha a conta do Google na nova aba.`, "ok");
  }));

  caixa.querySelector("#sigaa-agenda-ics").addEventListener("click", () => executar(async () => {
    const eventos = await coletar();
    if (!eventos.length) { status("Nenhuma avaliação encontrada.", "aviso"); return; }
    const ics = await P.gerarIcs(eventos);
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "avaliacoes_sigaa.ics" });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    status(`${nEventos(eventos.length)} salvo(s) em avaliacoes_sigaa.ics.`, "ok");
  }));
})();
