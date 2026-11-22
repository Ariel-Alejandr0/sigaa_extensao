import { describe, expect, it } from "vitest";
import "../../parser.js";
import { lerFixture } from "../apoio/fixtures.js";

const { parseAtividadesHome } = globalThis.SigaaParser;

/** As linhas de atividade (sem a linha do semestre) do quadro "Minhas atividades". */
const linhas = (doc) =>
  [...doc.querySelectorAll("#avaliacao-portal tbody tr")].filter((tr) => tr.children.length >= 3);

describe("parseAtividadesHome (quadro 'Minhas atividades')", () => {
  it("lê avaliações e tarefas, com e sem hora", () => {
    expect(parseAtividadesHome(lerFixture("home"))).toEqual([
      {
        materia: "ÁLGEBRA LINEAR",
        tipo: "Avaliação",
        titulo: "2ª Avaliação",
        data: "2026-11-12",
        hora: null,
        origem: "home",
      },
      {
        materia: "CÁLCULO DIFERENCIAL E INTEGRAL II",
        tipo: "Tarefa",
        titulo: "Trabalho - Cálculo 2 - Coordenadas Polares",
        data: "2026-11-20",
        hora: "23:59",
        origem: "home",
      },
      {
        materia: "COMPUTAÇÃO NA EDUCAÇÃO",
        tipo: "Avaliação",
        titulo: "AV2",
        data: "2026-11-23",
        hora: null,
        origem: "home",
      },
    ]);
  });

  it("aceita hora com um dígito e completa com zero", () => {
    const doc = lerFixture("home");
    const td = linhas(doc)[1].children[1];
    td.textContent = td.textContent.replace("23:59", "8:05");
    expect(parseAtividadesHome(doc)[1].hora).toBe("08:05");
  });

  it("usa 'Atividade' como tipo se o rótulo em negrito está vazio", () => {
    const doc = lerFixture("home");
    linhas(doc)[2].querySelector("strong").textContent = ":";
    expect(parseAtividadesHome(doc)[2].tipo).toBe("Atividade");
  });

  it("pula a linha sem data reconhecível", () => {
    const doc = lerFixture("home");
    linhas(doc)[0].children[1].textContent = "a definir";
    expect(parseAtividadesHome(doc).map((e) => e.titulo)).toEqual([
      "Trabalho - Cálculo 2 - Coordenadas Polares",
      "AV2",
    ]);
  });

  it("pula a linha sem rótulo em negrito", () => {
    const doc = lerFixture("home");
    linhas(doc)[0].querySelector("strong").remove();
    expect(parseAtividadesHome(doc)).toHaveLength(2);
  });

  it("pula a linha sem título depois do rótulo", () => {
    const doc = lerFixture("home");
    const strong = linhas(doc)[2].querySelector("strong");
    while (strong.nextSibling) strong.nextSibling.remove();
    expect(parseAtividadesHome(doc).map((e) => e.titulo)).not.toContain("AV2");
  });

  it("pula a linha sem matéria antes do rótulo", () => {
    const doc = lerFixture("home");
    const strong = linhas(doc)[2].querySelector("strong");
    while (strong.previousSibling) strong.previousSibling.remove();
    expect(parseAtividadesHome(doc).map((e) => e.titulo)).not.toContain("AV2");
  });

  it("devolve lista vazia se o quadro não tem atividades ou não existe", () => {
    const doc = lerFixture("home");
    doc.querySelector("#avaliacao-portal tbody").innerHTML = "";
    expect(parseAtividadesHome(doc)).toEqual([]);
    expect(parseAtividadesHome(lerFixture("login"))).toEqual([]);
  });
});
