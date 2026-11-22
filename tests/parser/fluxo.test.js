import ICAL from "ical.js";
import { describe, expect, it } from "vitest";
import "../../parser.js";
import { lerFixture } from "../apoio/fixtures.js";

const P = globalThis.SigaaParser;

// O que o content.js faz em coletar(), com as páginas salvas no lugar das requisições.
async function coletar() {
  const home = lerFixture("home");
  const eventos = P.parseAtividadesHome(home);
  const [algebra] = P.parseTurmas(home);
  eventos.push(
    ...P.parseAvaliacoesTurma(lerFixture("turma-com-avaliacoes"), algebra.nome, algebra.inicio),
  );
  return P.juntar(eventos);
}

describe("fluxo completo com as páginas salvas", () => {
  it("junta página inicial e turma: a versão da turma (com hora) substitui a da inicial", async () => {
    const eventos = await coletar();
    expect(eventos.map((e) => [e.data, e.hora, e.titulo, e.origem])).toEqual([
      ["2026-09-10", "13:30", "1ª Avaliação", "turma"],
      ["2026-11-12", "13:30", "2ª Avaliação", "turma"],
      ["2026-11-20", "23:59", "Trabalho - Cálculo 2 - Coordenadas Polares", "home"],
      ["2026-11-23", null, "AV2", "home"],
      ["2026-12-03", "13:30", "3ª Avaliação", "turma"],
    ]);
  });

  it("gera um .ics que o ical.js lê, com um evento por item", async () => {
    const ics = await P.gerarIcs(await coletar());
    const cal = new ICAL.Component(ICAL.parse(ics));
    const eventos = cal.getAllSubcomponents("vevent").map((c) => new ICAL.Event(c));
    expect(eventos.map((e) => e.summary)).toEqual([
      "Avaliação: 1ª Avaliação — ÁLGEBRA LINEAR",
      "Avaliação: 2ª Avaliação — ÁLGEBRA LINEAR",
      "Tarefa: Trabalho - Cálculo 2 - Coordenadas Polares — CÁLCULO DIFERENCIAL E INTEGRAL II",
      "Avaliação: AV2 — COMPUTAÇÃO NA EDUCAÇÃO",
      "Avaliação: 3ª Avaliação — ÁLGEBRA LINEAR",
    ]);
    expect(eventos[0].startDate.toString()).toBe("2026-09-10T16:30:00Z");
  });
});

describe("detecção de sessão expirada (seletor usado pelo content.js)", () => {
  const SELETOR = 'input[name="user.login"]';

  it("a tela de login tem o campo de usuário", () => {
    expect(lerFixture("login").querySelector(SELETOR)).not.toBeNull();
  });

  it("a página inicial e a de turma não têm", () => {
    expect(lerFixture("home").querySelector(SELETOR)).toBeNull();
    expect(lerFixture("turma-com-avaliacoes").querySelector(SELETOR)).toBeNull();
  });
});
