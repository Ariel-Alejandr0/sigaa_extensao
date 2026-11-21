// Globais compartilhados entre os scripts da extensão (ver ADR 0004).
// parser.js define globalThis.SigaaParser; content.js o usa.

interface SigaaEvento {
  materia: string;
  tipo: string;
  titulo: string;
  /** Data no formato AAAA-MM-DD. */
  data: string;
  /** Hora no formato HH:MM, ou null para evento de dia inteiro. */
  hora: string | null;
  origem: "home" | "turma";
}

interface SigaaTurma {
  nome: string;
  /** Início do semestre (AAAA-MM-DD), ou null se não encontrado. */
  inicio: string | null;
  indice: number;
}

interface SigaaParserApi {
  norm(s: string): string;
  parseTurmas(doc: Document): SigaaTurma[];
  parseAtividadesHome(doc: Document): SigaaEvento[];
  parseAvaliacoesTurma(doc: Document, materia: string, inicioSemestre: string | null): SigaaEvento[];
  juntar(eventos: SigaaEvento[]): SigaaEvento[];
  gerarIcs(eventos: SigaaEvento[]): Promise<string>;
  parametrosLinkJsf(doc: Document, link: Element): { action: string; params: URLSearchParams };
}

// eslint-disable-next-line no-var
declare var SigaaParser: SigaaParserApi;
