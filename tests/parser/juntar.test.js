import { describe, expect, it } from "vitest";
import "../../parser.js";

const { juntar } = globalThis.SigaaParser;

/** @returns {SigaaEvento} */
const ev = (campos) => ({
  materia: "Matemática",
  tipo: "Avaliação",
  titulo: "Prova 1",
  data: "2026-04-10",
  hora: "14:00",
  origem: "home",
  ...campos,
});

describe("juntar", () => {
  it("devolve lista vazia para entrada vazia", () => {
    expect(juntar([])).toEqual([]);
  });

  it("ordena por data e hora, com o evento sem hora antes dos com hora no mesmo dia", () => {
    const a = ev({ titulo: "A", data: "2026-05-02", hora: "08:00" });
    const b = ev({ titulo: "B", data: "2026-04-01", hora: "10:00" });
    const c = ev({ titulo: "C", data: "2026-04-01", hora: null });
    const d = ev({ titulo: "D", data: "2026-04-01", hora: "09:00" });
    expect(juntar([a, b, c, d]).map((e) => e.titulo)).toEqual(["C", "D", "B", "A"]);
  });

  it("considera iguais matéria, tipo e título que só diferem em acentos, caixa e espaços", () => {
    const r = juntar([
      ev({ materia: "Matemática", titulo: "Prova  1" }),
      ev({ materia: "MATEMATICA ", titulo: "prova 1" }),
    ]);
    expect(r).toHaveLength(1);
  });

  it("mantém eventos com tipos diferentes e mesmo título", () => {
    const r = juntar([ev({ tipo: "Avaliação" }), ev({ tipo: "Tarefa" })]);
    expect(r).toHaveLength(2);
  });

  it("prefere o evento do quadro da turma ao da página inicial, em qualquer ordem", () => {
    const home = ev({ origem: "home", data: "2026-04-10" });
    const turma = ev({ origem: "turma", data: "2026-04-11" });
    expect(juntar([home, turma])).toEqual([turma]);
    expect(juntar([turma, home])).toEqual([turma]);
  });

  it("entre dois da mesma origem, fica o primeiro", () => {
    const primeiro = ev({ data: "2026-04-10" });
    const segundo = ev({ data: "2026-04-12" });
    expect(juntar([primeiro, segundo])).toEqual([primeiro]);
  });

  // Bug conhecido D1 (docs/diagnostico.md): a chave não inclui a data, então avaliações
  // diferentes com o mesmo título viram um evento só. Corrigir na fase 3.
  it.fails("D1: mantém avaliações de mesmo título em datas diferentes", () => {
    const r = juntar([
      ev({ titulo: "Trabalho", data: "2026-04-10", origem: "turma" }),
      ev({ titulo: "Trabalho", data: "2026-06-05", origem: "turma" }),
    ]);
    expect(r).toHaveLength(2);
  });
});
