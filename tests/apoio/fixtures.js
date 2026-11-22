import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// No ambiente jsdom o URL global é o do jsdom; o caminho é montado com node:path.
const PASTA = join(dirname(fileURLToPath(import.meta.url)), "..", "fixtures", "sigaa");

/**
 * Lê uma página do SIGAA salva em tests/fixtures/sigaa/ (UTF-8, dados pessoais removidos).
 * Cada chamada devolve um Document novo, que o teste pode alterar à vontade.
 * @param {"home" | "turma-com-avaliacoes" | "login"} nome
 */
export function lerFixture(nome) {
  const html = readFileSync(join(PASTA, `${nome}.html`), "utf8");
  return new DOMParser().parseFromString(html, "text/html");
}

/** O painel "Avaliações" da página de turma. */
export function painelAvaliacoes(doc) {
  return [...doc.querySelectorAll("div.blocoDireita")].find((p) =>
    p.querySelector(".headerBloco").textContent.trim().startsWith("Avaliações"),
  );
}
