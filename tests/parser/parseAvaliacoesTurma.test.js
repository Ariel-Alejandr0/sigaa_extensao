import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../parser.js";
import { lerFixture, painelAvaliacoes } from "../apoio/fixtures.js";

const { parseAvaliacoesTurma } = globalThis.SigaaParser;
const MATERIA = "ÁLGEBRA LINEAR";
const INICIO = "2026-08-03";

/** Página de turma cujo quadro "Avaliações" tem os itens [data, descrição] dados. */
function turmaCom(itens) {
  const doc = lerFixture("turma-com-avaliacoes");
  painelAvaliacoes(doc).querySelector("ul.menu-direita").innerHTML = itens
    .map(
      ([data, desc]) =>
        `<li><span class="data">${data}</span><br> <span class="descricao">${desc}</span></li>`,
    )
    .join("");
  return doc;
}

const datas = (doc, inicio = INICIO) =>
  parseAvaliacoesTurma(doc, MATERIA, inicio).map((e) => e.data);

describe("parseAvaliacoesTurma (quadro 'Avaliações' da turma)", () => {
  it("lê as avaliações da turma, com o ano tirado do início do semestre", () => {
    const doc = lerFixture("turma-com-avaliacoes");
    expect(parseAvaliacoesTurma(doc, MATERIA, INICIO)).toEqual([
      { materia: MATERIA, tipo: "Avaliação", titulo: "1ª Avaliação", data: "2026-09-10", hora: "13:30", origem: "turma" },
      { materia: MATERIA, tipo: "Avaliação", titulo: "2ª Avaliação", data: "2026-11-12", hora: "13:30", origem: "turma" },
      { materia: MATERIA, tipo: "Avaliação", titulo: "3ª Avaliação", data: "2026-12-03", hora: "13:30", origem: "turma" },
    ]); // prettier-ignore
  });

  it("ignora o quadro 'Atividades', mesmo com texto sobre avaliações", () => {
    const doc = lerFixture("turma-com-avaliacoes");
    painelAvaliacoes(doc).remove();
    expect(parseAvaliacoesTurma(doc, MATERIA, INICIO)).toEqual([]);
  });

  it("turma sem avaliações: quadro vazio dá lista vazia", () => {
    expect(parseAvaliacoesTurma(turmaCom([]), MATERIA, INICIO)).toEqual([]);
  });

  it("devolve lista vazia em página que não é de turma", () => {
    expect(parseAvaliacoesTurma(lerFixture("home"), MATERIA, INICIO)).toEqual([]);
    expect(parseAvaliacoesTurma(lerFixture("login"), MATERIA, INICIO)).toEqual([]);
  });

  it("item sem hora vira evento sem hora; hora de um dígito é completada", () => {
    const r = parseAvaliacoesTurma(
      turmaCom([
        ["10/09", "Seminário"],
        ["11/09 8:00", "Prova"],
      ]),
      MATERIA,
      INICIO,
    );
    expect(r.map((e) => e.hora)).toEqual([null, "08:00"]);
  });

  it("pula itens sem data reconhecível ou sem descrição", () => {
    const r = parseAvaliacoesTurma(
      turmaCom([
        ["a definir", "Prova X"],
        ["10/09 13:30", ""],
        ["12/09", "Prova Y"],
      ]),
      MATERIA,
      INICIO,
    );
    expect(r.map((e) => e.titulo)).toEqual(["Prova Y"]);
  });

  describe("inferência do ano [D5]", () => {
    beforeEach(() => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    });
    afterEach(() => vi.useRealTimers());

    it("semestre que atravessa o ano: datas de jan/fev vão para o ano seguinte", () => {
      const doc = turmaCom([
        ["10/12", "Prova 2"],
        ["05/02", "Exame"],
      ]);
      expect(datas(doc, "2026-08-03")).toEqual(["2026-12-10", "2027-02-05"]);
    });

    it("até 30 dias antes do início ainda conta como o mesmo ano", () => {
      const doc = turmaCom([
        ["04/07", "Antes do início, dentro da folga"],
        ["03/07", "Mais de 30 dias antes"],
      ]);
      expect(datas(doc, "2026-08-03")).toEqual(["2026-07-04", "2027-07-03"]);
    });

    it("semestre do início do ano: tudo no mesmo ano", () => {
      const doc = turmaCom([
        ["20/02", "Prova 1"],
        ["10/07", "Prova 3"],
      ]);
      expect(datas(doc, "2026-02-16")).toEqual(["2026-02-20", "2026-07-10"]);
    });

    it("sem data de início, usa o ano corrente", () => {
      const doc = turmaCom([["05/02", "Prova"]]);
      expect(datas(doc, null)).toEqual(["2025-02-05"]);
    });
  });

  describe("acentos e codificação [D6]", () => {
    it("acha o quadro com o cabeçalho 'Avaliações' acentuado (forma composta, NFC)", () => {
      expect(datas(lerFixture("turma-com-avaliacoes"))).toHaveLength(3);
    });

    // D6: a busca é por startsWith("Avaliações") literal; o mesmo texto em forma decomposta
    // (NFD), que aparece em alguns textos copiados ou normalizados, não é reconhecido.
    it.fails("D6: acha o quadro com o cabeçalho em forma decomposta (NFD)", () => {
      const doc = lerFixture("turma-com-avaliacoes");
      const cab = painelAvaliacoes(doc).querySelector(".headerBloco");
      const texto = [...cab.childNodes].find((n) => n.nodeType === 3 && n.data.includes("Avalia"));
      texto.data = texto.data.normalize("NFD");
      expect(datas(doc)).toHaveLength(3);
    });
  });
});
