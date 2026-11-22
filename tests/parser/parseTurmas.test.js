import { describe, expect, it } from "vitest";
import "../../parser.js";
import { lerFixture } from "../apoio/fixtures.js";

const { parseTurmas } = globalThis.SigaaParser;

describe("parseTurmas (página inicial do discente)", () => {
  it("lê as turmas do semestre, na ordem da página, com a data de início", () => {
    expect(parseTurmas(lerFixture("home"))).toEqual([
      { nome: "ÁLGEBRA LINEAR", inicio: "2026-08-03", indice: 0 },
      { nome: "ARQUITETURA DE COMPUTADORES", inicio: "2026-08-03", indice: 1 },
      { nome: "CÁLCULO DIFERENCIAL E INTEGRAL II", inicio: "2026-08-03", indice: 2 },
      { nome: "COMPUTAÇÃO NA EDUCAÇÃO", inicio: "2026-08-03", indice: 3 },
      { nome: "ENGENHARIA DE SOFTWARE", inicio: "2026-08-03", indice: 4 },
      { nome: "ESTRUTURA DE DADOS II", inicio: "2026-08-03", indice: 5 },
      { nome: "LINGUAGENS FORMAIS E AUTÔMATOS", inicio: "2026-08-03", indice: 6 },
    ]);
  });

  it("não confunde os links de 'Últimas Atualizações' com turmas", () => {
    const nomes = parseTurmas(lerFixture("home")).map((t) => t.nome);
    expect(nomes.some((n) => n.includes("(2026.2)"))).toBe(false);
  });

  it("início fica null se a linha da turma não tem o período", () => {
    const doc = lerFixture("home");
    const linha = doc.querySelector("#turmas-portal td.descricao a").closest("tr");
    for (const td of linha.querySelectorAll("td"))
      td.innerHTML = td.innerHTML.replace(/\(\d{2}\/\d{2}\/\d{4} - [^)]*\)/, "");
    const [primeira, segunda] = parseTurmas(doc);
    expect(primeira).toEqual({ nome: "ÁLGEBRA LINEAR", inicio: null, indice: 0 });
    expect(segunda.inicio).toBe("2026-08-03");
  });

  it("devolve lista vazia em página sem o quadro de turmas", () => {
    expect(parseTurmas(lerFixture("turma-com-avaliacoes"))).toEqual([]);
    expect(parseTurmas(lerFixture("login"))).toEqual([]);
  });
});
