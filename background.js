// Coordena a importacao: guarda o .ics, abre a aba de escolha de conta do Google
// e entrega o arquivo so para a aba que a propria extensao abriu.
const ESCOLHER_CONTA = "https://accounts.google.com/AccountChooser";
const PAGINA_IMPORTAR = "https://calendar.google.com/calendar/r/settings/export";
const VALIDADE_MS = 15 * 60 * 1000;

async function iniciarImportacao(ics) {
  if (typeof ics !== "string" || !ics.startsWith("BEGIN:VCALENDAR"))
    throw new Error("Arquivo .ics inválido");
  const url = `${ESCOLHER_CONTA}?continue=${encodeURIComponent(PAGINA_IMPORTAR)}`;
  const aba = await chrome.tabs.create({ url });
  await chrome.storage.local.set({ importacao: { tabId: aba.id, ics, criadoEm: Date.now() } });
}

async function entregarParaAba(abaId) {
  const { importacao } = await chrome.storage.local.get("importacao");
  if (!importacao || importacao.tabId !== abaId) return {};
  if (Date.now() - importacao.criadoEm > VALIDADE_MS) {
    await chrome.storage.local.remove("importacao");
    return {};
  }
  return { ics: importacao.ics };
}

// Roda DENTRO da pagina do Google (mundo principal), com o DataTransfer/File dela.
// Precisa ser autocontida: e serializada e injetada na pagina.
function anexarNoMundoPrincipal(ics) {
  let n = 0;
  for (const campo of document.querySelectorAll('input[type="file"]')) {
    try {
      const dt = new DataTransfer();
      dt.items.add(new File([ics], "avaliacoes_sigaa.ics", { type: "text/calendar" }));
      campo.files = dt.files;
      campo.dispatchEvent(new Event("input", { bubbles: true }));
      campo.dispatchEvent(new Event("change", { bubbles: true }));
      n++;
    } catch (e) { /* tenta o proximo campo */ }
  }
  return n;
}

async function anexarNaPagina(abaId) {
  const { ics } = await entregarParaAba(abaId); // so a aba da importacao pode pedir
  if (!ics) return { campos: 0 };
  const [r] = await chrome.scripting.executeScript({
    target: { tabId: abaId }, world: "MAIN", func: anexarNoMundoPrincipal, args: [ics],
  });
  return { campos: r?.result || 0 };
}

chrome.runtime.onMessage.addListener((msg, remetente, responder) => {
  (async () => {
    switch (msg?.tipo) {
      case "importarNoGoogle":
        await iniciarImportacao(msg.ics);
        return { ok: true };
      case "calendarioPronto": // o Google Agenda carregou: tem importacao para esta aba?
        return entregarParaAba(remetente.tab?.id);
      case "anexarNaPagina":
        return anexarNaPagina(remetente.tab?.id);
      case "calendarioConcluido":
        await chrome.storage.local.remove("importacao");
        return { ok: true };
    }
  })().then(responder, (e) => responder({ erro: e.message }));
  return true; // resposta assincrona
});

// Clique no icone da extensao: reabre a caixa na pagina inicial do SIGAA.
// Em outras paginas ninguem responde; entao avisa com um "!" no icone.
chrome.action.onClicked.addListener(async (aba) => {
  try {
    await chrome.tabs.sendMessage(aba.id, { tipo: "mostrarCaixa" });
  } catch {
    chrome.action.setBadgeBackgroundColor({ tabId: aba.id, color: "#b00020" });
    chrome.action.setBadgeText({ tabId: aba.id, text: "!" });
    chrome.action.setTitle({ tabId: aba.id, title: "Abra a página inicial do SIGAA (Portal do Discente) para usar a extensão" });
    setTimeout(() => chrome.action.setBadgeText({ tabId: aba.id, text: "" }).catch(() => {}), 4000);
  }
});

// Fechou a aba antes de terminar: descarta o arquivo guardado.
chrome.tabs.onRemoved.addListener(async (abaId) => {
  const { importacao } = await chrome.storage.local.get("importacao");
  if (importacao?.tabId === abaId) await chrome.storage.local.remove("importacao");
});

// Limpeza da versao antiga (que guardava o id da agenda criada pela API).
chrome.runtime.onInstalled.addListener(() => chrome.storage.local.remove("calendarId"));
