// Roda no Google Agenda, mas so age na aba aberta pela extensao (veja background.js).
// Vai para Configuracoes > Importar e exportar, anexa o .ics e clica em "Importar".
(async function () {
  if (window.top !== window) return;

  const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
  const txt = (el) => (el?.textContent || "").replace(/\s+/g, " ").trim();
  async function esperar(fn, ms = 20000, passo = 300) {
    const fim = Date.now() + ms;
    while (Date.now() < fim) {
      const v = fn();
      if (v) return v;
      await dormir(passo);
    }
    return null;
  }

  // Esta aba foi aberta pela extensao? Se nao, nao mexe em nada.
  let pedido;
  try { pedido = await chrome.runtime.sendMessage({ tipo: "calendarioPronto" }); }
  catch { return; }
  if (!pedido?.ics) return;
  const ics = pedido.ics;

  // ---------- interface ----------
  const caixa = document.createElement("div");
  caixa.id = "sigaa-agenda-calendario";
  caixa.innerHTML = `<strong>SIGAA → Google Agenda</strong><div class="msg"></div><div class="acoes"></div>`;
  document.body.appendChild(caixa);
  const msg = (texto, tipo = "") => {
    const el = caixa.querySelector(".msg");
    el.textContent = texto;
    el.className = "msg " + tipo;
  };

  function falha(texto) {
    msg(texto, "erro");
    const acoes = caixa.querySelector(".acoes");
    if (acoes.firstChild) return;
    const b = document.createElement("button");
    b.textContent = "Baixar .ics para importar à mão";
    b.addEventListener("click", () => {
      const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: "avaliacoes_sigaa.ics" });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    });
    acoes.appendChild(b);
  }

  // ---------- auxiliares ----------
  // E-mail da conta que esta aberta (aparece no rotulo do botao de conta do Google).
  function contaAtual() {
    for (const el of document.querySelectorAll("[aria-label]")) {
      const rotulo = el.getAttribute("aria-label");
      if (!/Conta do Google|Google Account/i.test(rotulo)) continue;
      const m = rotulo.match(/[\w.+-]+@[\w.-]+\.\w+/);
      if (m) return m[0];
    }
    return null;
  }

  function clicar(el) { // alguns botoes do Google reagem a mousedown/mouseup, nao so a click
    for (const tipo of ["mousedown", "mouseup", "click"])
      el.dispatchEvent(new MouseEvent(tipo, { bubbles: true, cancelable: true, view: window }));
  }

  const rotuloDe = (b) => txt(b) || b.getAttribute("aria-label") || "";
  const todosImportar = () =>
    [...document.querySelectorAll('button, [role="button"]')].filter((b) => /^(importar|import)$/i.test(rotuloDe(b)));
  const habilitado = (b) => !b.disabled && b.getAttribute("aria-disabled") !== "true";
  const botaoImportar = () => todosImportar().find(habilitado);

  // Texto da pagina sem a nossa caixa, para ler a confirmacao do Google.
  const textoDaPagina = () =>
    [...document.body.children].filter((c) => c !== caixa).map((c) => c.innerText || "").join("\n");

  function confirmacao() {
    const t = textoDaPagina();
    const n = t.match(/(\d+)\s+(?:de|of)\s+(\d+)\s+(?:eventos?|events?)/i);
    if (n) return `${n[1]} de ${n[2]} eventos`;
    return /importad|imported/i.test(t) ? "ok" : null;
  }

  function anexarIsolado(campo) {
    const dt = new DataTransfer();
    dt.items.add(new File([ics], "avaliacoes_sigaa.ics", { type: "text/calendar" }));
    campo.files = dt.files;
    campo.dispatchEvent(new Event("input", { bubbles: true }));
    campo.dispatchEvent(new Event("change", { bubbles: true }));
  }

  // O Google aceitou o arquivo? (botao Importar habilita ou o nome do arquivo aparece)
  const aceito = (ms) =>
    esperar(() => botaoImportar() || textoDaPagina().includes("avaliacoes_sigaa.ics"), ms, 250);

  // Campos que aceitam .ics primeiro; se nada pegar, repete pelo mundo principal da pagina.
  async function anexar() {
    const pontos = (i) => (/ics|vcs|csv|calendar/i.test(i.accept || "") ? 1 : 0);
    for (let volta = 0; volta < 3; volta++) {
      const campos = [...document.querySelectorAll('input[type="file"]')].sort((a, b) => pontos(b) - pontos(a));
      for (const campo of campos) {
        try { anexarIsolado(campo); } catch (e) { console.warn("[SIGAA Agenda] campo recusou o arquivo:", e); continue; }
        if (await aceito(1500)) return true;
      }
      try { await chrome.runtime.sendMessage({ tipo: "anexarNaPagina" }); } catch { /* segue */ }
      if (await aceito(2000)) return true;
      await dormir(1000);
    }
    return false;
  }

  try {
    // 1) Ir para a pagina de importacao, mantendo a conta (/u/N/) que o Google abriu.
    if (!/\/settings\/export/.test(location.pathname)) {
      const tentativas = +(sessionStorage.getItem("sigaaAgendaRedir") || 0);
      if (tentativas >= 3) return falha("Não consegui abrir a página de importação do Google Agenda.");
      sessionStorage.setItem("sigaaAgendaRedir", String(tentativas + 1));
      const u = location.pathname.match(/\/calendar\/u\/(\d+)\//)?.[1]
        ?? new URLSearchParams(location.search).get("authuser") ?? "0";
      msg("Abrindo a página de importação…");
      location.replace(`/calendar/u/${u}/r/settings/export`);
      return;
    }
    sessionStorage.removeItem("sigaaAgendaRedir");

    // 2) Anexar o arquivo no campo de upload.
    msg("Preparando a importação…");
    const campo = await esperar(() => document.querySelector('input[type="file"]'), 25000);
    if (!campo) return falha("Não encontrei o campo de arquivo na página de importação.");
    const conta = await esperar(contaAtual, 3000);
    msg(conta ? `Importando na conta ${conta}…` : "Importando…");

    // O botao Importar ja existe (desabilitado) quando a pagina terminou de montar.
    // Espera um pouco mais: se o Google remontar o campo depois de anexarmos, o arquivo se perde.
    await esperar(() => todosImportar()[0], 15000);
    await dormir(1500);
    if (!(await anexar())) {
      console.warn("[SIGAA Agenda] Google nao aceitou o arquivo. Campos de arquivo:",
        [...document.querySelectorAll('input[type="file"]')].map((i) => i.outerHTML),
        "Botoes Importar:", todosImportar().map((b) => b.outerHTML.slice(0, 300)));
      return falha("O Google não aceitou o anexo automático. Baixe o .ics, clique em “Selecionar arquivo no seu computador”, escolha-o e clique em Importar.");
    }

    // 3) Clicar em "Importar".
    const botao = await esperar(botaoImportar, 10000);
    if (!botao) return falha("O arquivo foi anexado, mas o botão Importar não habilitou. Clique nele à mão.");
    clicar(botao);
    chrome.runtime.sendMessage({ tipo: "calendarioConcluido" }).catch(() => {});

    // 4) Ler a confirmacao do Google.
    const r = await esperar(confirmacao, 20000, 500);
    const quem = contaAtual() || conta;
    if (r && r !== "ok") msg(`Pronto: ${r} importados${quem ? " em " + quem : ""}.`, "ok");
    else if (r) msg(`Importação concluída${quem ? " em " + quem : ""}.`, "ok");
    else msg("Cliquei em Importar, mas não vi a confirmação. Confira sua agenda.", "aviso");
  } catch (e) {
    console.error("[SIGAA Agenda]", e);
    falha("Erro: " + e.message);
  }
})();
