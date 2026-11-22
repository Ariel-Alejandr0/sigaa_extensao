import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarChromeFalso } from "./apoio/chrome-falso.js";

const ICS = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n";
const URL_ESPERADA =
  "https://accounts.google.com/AccountChooser?continue=" +
  encodeURIComponent("https://calendar.google.com/calendar/r/settings/export");
const QUINZE_MIN = 15 * 60 * 1000;

/** @type {ReturnType<typeof criarChromeFalso>} */
let chrome;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
  chrome = criarChromeFalso();
  vi.stubGlobal("chrome", chrome);
  vi.resetModules(); // cada teste carrega um background.js novo, com ouvintes novos
  await import("../background.js");
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Inicia uma importação e devolve o id da aba que o background abriu. */
async function importar(ics = ICS) {
  await chrome.enviar({ tipo: "importarNoGoogle", ics });
  return chrome.storage.local.dados.importacao?.tabId;
}

describe("background: importarNoGoogle", () => {
  it("abre a escolha de conta do Google, que continua para a página de importação", async () => {
    const r = await chrome.enviar({ tipo: "importarNoGoogle", ics: ICS });
    expect(r).toEqual({ ok: true });
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: URL_ESPERADA });
  });

  it("guarda o .ics com o id da aba aberta e o horário", async () => {
    await chrome.enviar({ tipo: "importarNoGoogle", ics: ICS });
    expect(chrome.storage.local.dados.importacao).toEqual({
      tabId: 100,
      ics: ICS,
      criadoEm: Date.now(),
    });
  });

  it.each([
    ["texto que não é .ics", "olá"],
    ["ausente", undefined],
    ["não é texto", 42],
  ])("recusa .ics %s sem abrir aba", async (_caso, ics) => {
    const r = await chrome.enviar({ tipo: "importarNoGoogle", ics });
    expect(r).toEqual({ erro: "Arquivo .ics inválido" });
    expect(chrome.tabs.create).not.toHaveBeenCalled();
    expect(chrome.storage.local.dados).toEqual({});
  });

  it("uma nova importação substitui a anterior", async () => {
    await importar("BEGIN:VCALENDAR\r\nA");
    const aba = await importar("BEGIN:VCALENDAR\r\nB");
    expect(aba).toBe(101);
    expect(chrome.storage.local.dados.importacao.ics).toBe("BEGIN:VCALENDAR\r\nB");
  });
});

describe("background: calendarioPronto (entrega do .ics)", () => {
  it("entrega o .ics à aba que a extensão abriu", async () => {
    const aba = await importar();
    expect(await chrome.enviar({ tipo: "calendarioPronto" }, { tab: { id: aba } })).toEqual({
      ics: ICS,
    });
  });

  it("não entrega a outra aba", async () => {
    const aba = await importar();
    expect(await chrome.enviar({ tipo: "calendarioPronto" }, { tab: { id: aba + 1 } })).toEqual({});
  });

  it("não entrega a remetente sem aba (ex.: outra parte da extensão)", async () => {
    await importar();
    expect(await chrome.enviar({ tipo: "calendarioPronto" }, {})).toEqual({});
  });

  it("não entrega nada se não há importação em andamento", async () => {
    expect(await chrome.enviar({ tipo: "calendarioPronto" }, { tab: { id: 100 } })).toEqual({});
  });

  it("ainda entrega com exatamente 15 minutos", async () => {
    const aba = await importar();
    vi.setSystemTime(Date.now() + QUINZE_MIN);
    expect(await chrome.enviar({ tipo: "calendarioPronto" }, { tab: { id: aba } })).toEqual({
      ics: ICS,
    });
  });

  it("depois de 15 minutos não entrega e apaga o arquivo guardado", async () => {
    const aba = await importar();
    vi.setSystemTime(Date.now() + QUINZE_MIN + 1);
    expect(await chrome.enviar({ tipo: "calendarioPronto" }, { tab: { id: aba } })).toEqual({});
    expect(chrome.storage.local.dados.importacao).toBeUndefined();
  });

  it("pode ser pedido mais de uma vez pela mesma aba (ex.: recarregar a página)", async () => {
    const aba = await importar();
    await chrome.enviar({ tipo: "calendarioPronto" }, { tab: { id: aba } });
    expect(await chrome.enviar({ tipo: "calendarioPronto" }, { tab: { id: aba } })).toEqual({
      ics: ICS,
    });
  });
});

describe("background: anexarNaPagina", () => {
  it("injeta o anexador no mundo principal da aba certa, com o .ics", async () => {
    chrome.scripting.executeScript.mockResolvedValue([{ result: 2 }]);
    const aba = await importar();
    const r = await chrome.enviar({ tipo: "anexarNaPagina" }, { tab: { id: aba } });
    expect(r).toEqual({ campos: 2 });
    expect(chrome.scripting.executeScript).toHaveBeenCalledWith({
      target: { tabId: aba },
      world: "MAIN",
      func: expect.any(Function),
      args: [ICS],
    });
  });

  it("devolve 0 campos se o script não retorna resultado", async () => {
    chrome.scripting.executeScript.mockResolvedValue([{}]);
    const aba = await importar();
    expect(await chrome.enviar({ tipo: "anexarNaPagina" }, { tab: { id: aba } })).toEqual({
      campos: 0,
    });
  });

  it("não injeta nada em outra aba", async () => {
    const aba = await importar();
    const r = await chrome.enviar({ tipo: "anexarNaPagina" }, { tab: { id: aba + 1 } });
    expect(r).toEqual({ campos: 0 });
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("não injeta nada depois de expirado", async () => {
    const aba = await importar();
    vi.setSystemTime(Date.now() + QUINZE_MIN + 1);
    expect(await chrome.enviar({ tipo: "anexarNaPagina" }, { tab: { id: aba } })).toEqual({
      campos: 0,
    });
    expect(chrome.scripting.executeScript).not.toHaveBeenCalled();
  });

  it("devolve o erro se a injeção falha", async () => {
    chrome.scripting.executeScript.mockRejectedValue(new Error("Cannot access contents"));
    const aba = await importar();
    expect(await chrome.enviar({ tipo: "anexarNaPagina" }, { tab: { id: aba } })).toEqual({
      erro: "Cannot access contents",
    });
  });
});

describe("background: fim da importação e limpeza", () => {
  it("calendarioConcluido apaga o arquivo guardado", async () => {
    const aba = await importar();
    const r = await chrome.enviar({ tipo: "calendarioConcluido" }, { tab: { id: aba } });
    expect(r).toEqual({ ok: true });
    expect(chrome.storage.local.dados.importacao).toBeUndefined();
  });

  // Comportamento atual, registrado para a fase 3 (B4/C6: sem validação do remetente).
  it("calendarioConcluido de qualquer remetente também apaga (sem validação)", async () => {
    const aba = await importar();
    await chrome.enviar({ tipo: "calendarioConcluido" }, { tab: { id: aba + 1 } });
    expect(chrome.storage.local.dados.importacao).toBeUndefined();
  });

  it("fechar a aba da importação apaga o arquivo guardado", async () => {
    const aba = await importar();
    await Promise.all(chrome.tabs.onRemoved.disparar(aba));
    expect(chrome.storage.local.dados.importacao).toBeUndefined();
  });

  it("fechar outra aba não mexe na importação", async () => {
    const aba = await importar();
    await Promise.all(chrome.tabs.onRemoved.disparar(aba + 1));
    expect(chrome.storage.local.dados.importacao).toBeDefined();
  });

  it("ao instalar ou atualizar, apaga o calendarId da versão antiga", () => {
    chrome.runtime.onInstalled.disparar({ reason: "update" });
    expect(chrome.storage.local.remove).toHaveBeenCalledWith("calendarId");
  });

  it("ignora mensagens de tipo desconhecido", async () => {
    expect(await chrome.enviar({ tipo: "outraCoisa" })).toBeUndefined();
    expect(await chrome.enviar(null)).toBeUndefined();
  });
});

describe("background: clique no ícone", () => {
  it("pede à aba para mostrar a caixa e não mexe no ícone se ela responde", async () => {
    await Promise.all(chrome.action.onClicked.disparar({ id: 7 }));
    expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(7, { tipo: "mostrarCaixa" });
    expect(chrome.action.setBadgeText).not.toHaveBeenCalled();
  });

  it("se ninguém responde, mostra '!' no ícone por 4 segundos, com dica no título", async () => {
    chrome.tabs.sendMessage.mockRejectedValue(new Error("Receiving end does not exist"));
    await Promise.all(chrome.action.onClicked.disparar({ id: 7 }));
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: "!" });
    expect(chrome.action.setTitle).toHaveBeenCalledWith({
      tabId: 7,
      title: expect.stringContaining("SIGAA"),
    });

    await vi.advanceTimersByTimeAsync(3999);
    expect(chrome.action.setBadgeText).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(chrome.action.setBadgeText).toHaveBeenLastCalledWith({ tabId: 7, text: "" });
  });
});
