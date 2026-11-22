import { vi } from "vitest";

/** Um evento chrome.* simplificado: guarda os ouvintes para o teste poder dispará-los. */
function eventoFalso() {
  const ouvintes = [];
  return {
    addListener: (fn) => ouvintes.push(fn),
    /** Chama os ouvintes e devolve o que cada um retornou. */
    disparar: (...args) => ouvintes.map((fn) => fn(...args)),
    ouvintes,
  };
}

/**
 * Cria um objeto `chrome` com só o que o background.js usa. `chrome.storage.local` guarda
 * os dados em memória (`dados`), com cópia, como a API real faz.
 */
export function criarChromeFalso() {
  const dados = {};
  let proximaAba = 100;
  const copia = (v) => structuredClone(v);

  const chrome = {
    storage: {
      local: {
        dados,
        get: vi.fn(async (chave) => (chave in dados ? { [chave]: copia(dados[chave]) } : {})),
        set: vi.fn(async (itens) => {
          for (const [k, v] of Object.entries(itens)) dados[k] = copia(v);
        }),
        remove: vi.fn(async (chave) => {
          delete dados[chave];
        }),
      },
    },
    tabs: {
      create: vi.fn(async ({ url }) => ({ id: proximaAba++, url })),
      sendMessage: vi.fn(async () => ({ ok: true })),
      onRemoved: eventoFalso(),
    },
    scripting: {
      executeScript: vi.fn(async () => [{ result: 1 }]),
    },
    action: {
      onClicked: eventoFalso(),
      setBadgeBackgroundColor: vi.fn(async () => {}),
      setBadgeText: vi.fn(async () => {}),
      setTitle: vi.fn(async () => {}),
    },
    runtime: {
      onMessage: eventoFalso(),
      onInstalled: eventoFalso(),
    },
  };

  /**
   * Envia uma mensagem como se viesse de `remetente` e espera a resposta assíncrona.
   * @returns {Promise<any>}
   */
  chrome.enviar = (msg, remetente = {}) =>
    new Promise((resolve) => {
      const [assincrono] = chrome.runtime.onMessage.disparar(msg, remetente, resolve);
      if (assincrono !== true) resolve(undefined);
    });

  return chrome;
}
