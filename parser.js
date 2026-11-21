// Leitura das paginas do SIGAA e montagem dos eventos.
// Nao depende de Chrome: recebe objetos Document (da pagina ou de DOMParser).
(function (g) {
  const DURACAO_PADRAO_MIN = 100; // duracao de uma avaliacao com horario
  const UTC_OFFSET_H = 3;         // Brasilia = UTC-3 (sem horario de verao)

  const txt = (el) => (el ? el.textContent : "").replace(/\s+/g, " ").trim();
  const norm = (s) =>
    s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`;

  function evento(materia, tipo, titulo, data, hora, origem) {
    return { materia, tipo, titulo, data, hora, origem };
  }

  // Turmas do semestre na pagina inicial
  function parseTurmas(doc) {
    return [...doc.querySelectorAll("#turmas-portal td.descricao a")].map((a, i) => {
      const m = txt(a.closest("tr")).match(/\((\d{2})\/(\d{2})\/(\d{4}) - /);
      return { nome: txt(a), inicio: m ? iso(+m[3], +m[2], +m[1]) : null, indice: i };
    });
  }

  // Quadro "Minhas atividades" da pagina inicial
  function parseAtividadesHome(doc) {
    const eventos = [];
    for (const tr of doc.querySelectorAll("#avaliacao-portal tbody tr")) {
      const tds = [...tr.children].filter((c) => c.tagName === "TD");
      if (tds.length < 3) continue;
      const m = txt(tds[1]).match(/(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?/);
      const strong = tds[2].querySelector("strong");
      if (!m || !strong) continue;
      let antes = "", depois = "", passouBr = false, passouStrong = false;
      for (const n of strong.parentNode.childNodes) {
        if (n === strong) { passouStrong = true; continue; }
        if (n.nodeName === "BR") { passouBr = true; continue; }
        if (passouStrong) depois += " " + n.textContent;
        else if (!passouBr) antes += " " + n.textContent;
      }
      const materia = antes.replace(/\s+/g, " ").trim();
      const titulo = depois.replace(/\s+/g, " ").trim();
      const tipo = txt(strong).replace(/:$/, "").trim() || "Atividade";
      if (!materia || !titulo) continue;
      const hora = m[4] ? `${pad(m[4])}:${m[5]}` : null;
      eventos.push(evento(materia, tipo, titulo, iso(+m[3], +m[2], +m[1]), hora, "home"));
    }
    return eventos;
  }

  // Quadro "Avaliacoes" da pagina de uma turma (data "dd/mm hh:mm", sem ano)
  function parseAvaliacoesTurma(doc, materia, inicioSemestre) {
    const eventos = [];
    const inicio = inicioSemestre ? new Date(inicioSemestre + "T00:00:00") : null;
    for (const painel of doc.querySelectorAll("div.blocoDireita")) {
      if (!txt(painel.querySelector(".headerBloco")).startsWith("Avaliações")) continue;
      for (const li of painel.querySelectorAll("ul.menu-direita li")) {
        const m = txt(li.querySelector(".data")).match(/(\d{2})\/(\d{2})(?:\s+(\d{1,2}):(\d{2}))?/);
        const titulo = txt(li.querySelector(".descricao"));
        if (!m || !titulo) continue;
        let ano = inicio ? inicio.getFullYear() : new Date().getFullYear();
        let d = new Date(ano, +m[2] - 1, +m[1]);
        if (inicio && d < new Date(inicio.getTime() - 30 * 864e5)) ano += 1; // semestre vira o ano
        const hora = m[3] ? `${pad(m[3])}:${m[4]}` : null;
        eventos.push(evento(materia, "Avaliação", titulo, iso(ano, +m[2], +m[1]), hora, "turma"));
      }
    }
    return eventos;
  }

  // Remove duplicados (materia+tipo+titulo); o quadro da turma ganha da pagina inicial
  function juntar(eventos) {
    const mapa = new Map();
    for (const e of eventos) {
      const k = [norm(e.materia), norm(e.tipo), norm(e.titulo)].join("|");
      const antigo = mapa.get(k);
      if (!antigo || (antigo.origem === "home" && e.origem === "turma")) mapa.set(k, e);
    }
    return [...mapa.values()].sort((a, b) =>
      (a.data + (a.hora || "")).localeCompare(b.data + (b.hora || "")));
  }

  async function sha1hex(s) {
    const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(s));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Intervalo do evento em "hora de parede" (Date em UTC usado so para fazer contas)
  function intervalo(e) {
    const [y, mo, d] = e.data.split("-").map(Number);
    if (!e.hora) {
      return { diaInteiro: true, ini: new Date(Date.UTC(y, mo - 1, d)), fim: new Date(Date.UTC(y, mo - 1, d + 1)) };
    }
    const [h, mi] = e.hora.split(":").map(Number);
    const marco = new Date(Date.UTC(y, mo - 1, d, h, mi));
    if (norm(e.tipo) === "tarefa") // prazo de entrega: evento curto terminando no prazo
      return { diaInteiro: false, ini: new Date(+marco - 15 * 6e4), fim: marco };
    return { diaInteiro: false, ini: marco, fim: new Date(+marco + DURACAO_PADRAO_MIN * 6e4) };
  }

  const resumo = (e) => `${e.tipo}: ${e.titulo} — ${e.materia}`;
  const chave = (e) => `${norm(e.materia)}|${norm(e.tipo)}|${norm(e.titulo)}`;

  // Arquivo .ics (importado no Google Agenda)
  async function gerarIcs(eventos) {
    const esc = (s) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
    const dia = (d) => d.toISOString().slice(0, 10).replace(/-/g, "");
    const utc = (d) => new Date(+d + UTC_OFFSET_H * 36e5).toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
    const agora = utc(new Date(Date.now() - UTC_OFFSET_H * 36e5));
    const linhas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//sigaa-agenda//PT-BR",
      "CALSCALE:GREGORIAN", "X-WR-CALNAME:IFC - Avaliações"];
    for (const e of eventos) {
      const { diaInteiro, ini, fim } = intervalo(e);
      linhas.push("BEGIN:VEVENT", `UID:${await sha1hex(chave(e))}@sigaa-agenda`, `DTSTAMP:${agora}`,
        diaInteiro ? `DTSTART;VALUE=DATE:${dia(ini)}` : `DTSTART:${utc(ini)}`,
        diaInteiro ? `DTEND;VALUE=DATE:${dia(fim)}` : `DTEND:${utc(fim)}`,
        `SUMMARY:${esc(resumo(e))}`,
        `DESCRIPTION:${esc(`Importado do SIGAA\nMatéria: ${e.materia}\nTipo: ${e.tipo}`)}`,
        "BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:Lembrete", "TRIGGER:-P1D", "END:VALARM",
        "END:VEVENT");
    }
    linhas.push("END:VCALENDAR");
    return linhas.join("\r\n") + "\r\n";
  }

  // Monta o POST que o link JSF (jsfcljs) faria ao ser clicado
  function parametrosLinkJsf(doc, link) {
    const oc = link.getAttribute("onclick") || "";
    const m = oc.match(/jsfcljs\(document\.getElementById\('([^']+)'\),\{(.*?)\},'/);
    if (!m) throw new Error("Link da turma em formato inesperado");
    const form = doc.getElementById(m[1]);
    if (!form) throw new Error("Formulário da turma não encontrado: " + m[1]);
    const params = new URLSearchParams();
    for (const inp of form.querySelectorAll("input[name]")) params.append(inp.name, inp.value || "");
    for (const [, k, v] of m[2].matchAll(/'([^']*)':'([^']*)'/g)) params.set(k, v);
    return { action: form.getAttribute("action"), params };
  }

  g.SigaaParser = { norm, parseTurmas, parseAtividadesHome, parseAvaliacoesTurma, juntar,
    gerarIcs, parametrosLinkJsf };
})(globalThis);
