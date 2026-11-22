import ICAL from "ical.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../../parser.js";

const { gerarIcs } = globalThis.SigaaParser;

/** @returns {SigaaEvento} */
const ev = (campos) => ({
  materia: "Matemática",
  tipo: "Avaliação",
  titulo: "Prova 1",
  data: "2026-04-10",
  hora: "14:00",
  origem: "turma",
  ...campos,
});

const linhasDe = (ics) => ics.split("\r\n").slice(0, -1);

/** Os VEVENTs do arquivo, lidos pelo ical.js. */
function lerEventos(ics) {
  const cal = new ICAL.Component(ICAL.parse(ics));
  return cal.getAllSubcomponents("vevent").map((c) => new ICAL.Event(c));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-01T12:00:00Z"));
});
afterEach(() => vi.useRealTimers());

describe("gerarIcs: estrutura", () => {
  it("gera um calendário vazio válido quando não há eventos", async () => {
    const ics = await gerarIcs([]);
    expect(linhasDe(ics)).toEqual([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//sigaa-agenda//PT-BR",
      "CALSCALE:GREGORIAN",
      "X-WR-CALNAME:IFC - Avaliações",
      "END:VCALENDAR",
    ]);
    expect(lerEventos(ics)).toEqual([]);
  });

  it("usa CRLF em todas as linhas e termina com CRLF", async () => {
    const ics = await gerarIcs([ev({})]);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("corresponde ao snapshot (avaliação com hora, sem hora e tarefa)", async () => {
    const ics = await gerarIcs([
      ev({}),
      ev({ titulo: "Seminário", hora: null }),
      ev({ tipo: "Tarefa", titulo: "Lista 3", hora: "23:59", origem: "home" }),
    ]);
    expect(ics).toMatchSnapshot();
  });

  it("é lido pelo ical.js sem erro, com um VEVENT por evento", async () => {
    const eventos = [ev({}), ev({ titulo: "Prova 2", data: "2026-05-15", hora: null })];
    const lidos = lerEventos(await gerarIcs(eventos));
    expect(lidos.map((e) => e.summary)).toEqual([
      "Avaliação: Prova 1 — Matemática",
      "Avaliação: Prova 2 — Matemática",
    ]);
  });

  it("DTSTAMP é o instante atual em UTC", async () => {
    const ics = await gerarIcs([ev({})]);
    expect(linhasDe(ics)).toContain("DTSTAMP:20260301T120000Z");
  });

  it("inclui lembrete de 1 dia antes", async () => {
    const [lido] = lerEventos(await gerarIcs([ev({})]));
    const alarme = lido.component.getFirstSubcomponent("valarm");
    expect(alarme.getFirstPropertyValue("action")).toBe("DISPLAY");
    expect(alarme.getFirstPropertyValue("trigger").toString()).toBe("-P1D");
  });
});

describe("gerarIcs: horários", () => {
  it("avaliação com hora: começa na hora (Brasília = UTC-3) e dura 100 minutos", async () => {
    const [lido] = lerEventos(await gerarIcs([ev({ data: "2026-04-10", hora: "14:00" })]));
    expect(lido.startDate.toString()).toBe("2026-04-10T17:00:00Z");
    expect(lido.endDate.toString()).toBe("2026-04-10T18:40:00Z");
  });

  it("avaliação à noite passa para o dia seguinte em UTC", async () => {
    const [lido] = lerEventos(await gerarIcs([ev({ data: "2026-04-10", hora: "22:30" })]));
    expect(lido.startDate.toString()).toBe("2026-04-11T01:30:00Z");
    expect(lido.endDate.toString()).toBe("2026-04-11T03:10:00Z");
  });

  it("tarefa com hora: evento de 15 minutos que termina no prazo", async () => {
    const [lido] = lerEventos(
      await gerarIcs([ev({ tipo: "Tarefa", data: "2026-04-10", hora: "23:59" })]),
    );
    expect(lido.startDate.toString()).toBe("2026-04-11T02:44:00Z");
    expect(lido.endDate.toString()).toBe("2026-04-11T02:59:00Z");
  });

  it("o tipo tarefa é reconhecido sem depender de caixa ou acento", async () => {
    const [lido] = lerEventos(await gerarIcs([ev({ tipo: "TAREFA", hora: "10:00" })]));
    expect(lido.endDate.toString()).toBe("2026-04-10T13:00:00Z");
  });

  it("sem hora: evento de dia inteiro (VALUE=DATE), terminando no dia seguinte", async () => {
    const ics = await gerarIcs([ev({ data: "2026-04-30", hora: null })]);
    expect(linhasDe(ics)).toContain("DTSTART;VALUE=DATE:20260430");
    expect(linhasDe(ics)).toContain("DTEND;VALUE=DATE:20260501");
    const [lido] = lerEventos(ics);
    expect(lido.startDate.isDate).toBe(true);
  });

  it("sem hora no último dia do ano termina em 1º de janeiro", async () => {
    const ics = await gerarIcs([ev({ data: "2026-12-31", hora: null })]);
    expect(linhasDe(ics)).toContain("DTEND;VALUE=DATE:20270101");
  });

  it("tarefa sem hora também é de dia inteiro", async () => {
    const ics = await gerarIcs([ev({ tipo: "Tarefa", hora: null })]);
    expect(linhasDe(ics)).toContain("DTSTART;VALUE=DATE:20260410");
  });
});

describe("gerarIcs: texto", () => {
  it("escapa vírgula, ponto e vírgula e barra invertida (RFC 5545 §3.3.11)", async () => {
    const ics = await gerarIcs([ev({ titulo: "Cap. 1, 2; e 3 \\ revisão" })]);
    expect(linhasDe(ics)).toContain(
      "SUMMARY:Avaliação: Cap. 1\\, 2\\; e 3 \\\\ revisão — Matemática",
    );
    const [lido] = lerEventos(ics);
    expect(lido.summary).toBe("Avaliação: Cap. 1, 2; e 3 \\ revisão — Matemática");
  });

  it("DESCRIPTION traz matéria e tipo em linhas separadas", async () => {
    const [lido] = lerEventos(await gerarIcs([ev({})]));
    expect(lido.description).toBe("Importado do SIGAA\nMatéria: Matemática\nTipo: Avaliação");
  });

  it("preserva acentos e caracteres fora do ASCII", async () => {
    const [lido] = lerEventos(
      await gerarIcs([ev({ materia: "Língua Portuguesa — Redação", titulo: "Ação nº 2" })]),
    );
    expect(lido.summary).toBe("Avaliação: Ação nº 2 — Língua Portuguesa — Redação");
  });

  // Bug conhecido D2 (docs/diagnostico.md): linhas não são dobradas em 75 octetos.
  it.fails("D2: nenhuma linha passa de 75 octetos (RFC 5545 §3.1)", async () => {
    const ics = await gerarIcs([
      ev({
        materia: "Fundamentos de Programação Orientada a Objetos e Estruturas de Dados",
        titulo: "Avaliação prática da unidade 2",
      }),
    ]);
    for (const linha of linhasDe(ics))
      expect(new TextEncoder().encode(linha).length).toBeLessThanOrEqual(75);
  });
});

describe("gerarIcs: UID", () => {
  const uids = async (eventos) =>
    linhasDe(await gerarIcs(eventos)).filter((l) => l.startsWith("UID:"));

  it("é estável entre gerações e tem o formato <sha1>@sigaa-agenda", async () => {
    const [a] = await uids([ev({})]);
    const [b] = await uids([ev({})]);
    expect(a).toBe(b);
    expect(a).toMatch(/^UID:[0-9a-f]{40}@sigaa-agenda$/);
  });

  it("não muda com acentos, caixa ou espaços na matéria, tipo e título", async () => {
    const [a] = await uids([ev({})]);
    const [b] = await uids([ev({ materia: " MATEMATICA", tipo: "avaliacao", titulo: "prova  1" })]);
    expect(a).toBe(b);
  });

  it("não muda quando só a data ou a hora mudam (chave atual não inclui a data)", async () => {
    const [a] = await uids([ev({})]);
    const [b] = await uids([ev({ data: "2026-06-01", hora: null })]);
    expect(a).toBe(b);
  });

  it("muda quando o título muda", async () => {
    const [a, b] = await uids([ev({}), ev({ titulo: "Prova 2" })]);
    expect(a).not.toBe(b);
  });

  // Bug conhecido D1: dois eventos de mesmo título em datas diferentes recebem o mesmo UID.
  it.fails("D1: eventos de mesmo título em datas diferentes têm UIDs diferentes", async () => {
    const [a, b] = await uids([
      ev({ titulo: "Trabalho", data: "2026-04-10" }),
      ev({ titulo: "Trabalho", data: "2026-06-05" }),
    ]);
    expect(a).not.toBe(b);
  });
});
