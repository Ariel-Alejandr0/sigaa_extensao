import { describe, expect, it } from "vitest";
import "../../parser.js";

const { parametrosLinkJsf } = globalThis.SigaaParser;

// Formato do link de turma gerado pelo JSF (jsfcljs) na página inicial do discente.
const ONCLICK =
  "if(typeof jsfcljs == 'function'){jsfcljs(document.getElementById('form_turma')," +
  "{'form_turma:link':'form_turma:link','frontEndIdTurma':'ABC123'},'');}return false";

function montar({ onclick = ONCLICK, comForm = true } = {}) {
  const doc = document.implementation.createHTMLDocument("t");
  doc.body.innerHTML = `
    ${
      comForm
        ? `<form id="form_turma" action="/sigaa/portais/discente/discente.jsf" method="post">
             <input type="hidden" name="form_turma" value="form_turma">
             <input type="hidden" name="javax.faces.ViewState" value="j_id5">
             <input type="hidden" name="frontEndIdTurma" value="">
             <input type="hidden" name="vazio">
             <input type="hidden" value="sem-nome">
           </form>`
        : ""
    }
    <a id="link" href="#" onclick="${onclick}">Matemática</a>`;
  return { doc, link: doc.getElementById("link") };
}

describe("parametrosLinkJsf", () => {
  it("devolve o action do formulário", () => {
    const { doc, link } = montar();
    expect(parametrosLinkJsf(doc, link).action).toBe("/sigaa/portais/discente/discente.jsf");
  });

  it("junta os campos do formulário com os parâmetros do link, que têm prioridade", () => {
    const { doc, link } = montar();
    const { params } = parametrosLinkJsf(doc, link);
    expect([...params]).toEqual([
      ["form_turma", "form_turma"],
      ["javax.faces.ViewState", "j_id5"],
      ["frontEndIdTurma", "ABC123"],
      ["vazio", ""],
      ["form_turma:link", "form_turma:link"],
    ]);
  });

  it("ignora campos sem name", () => {
    const { doc, link } = montar();
    const { params } = parametrosLinkJsf(doc, link);
    expect([...params.values()]).not.toContain("sem-nome");
  });

  it("falha com mensagem clara se o link não tem o formato jsfcljs", () => {
    const { doc, link } = montar({ onclick: "return true" });
    expect(() => parametrosLinkJsf(doc, link)).toThrow("Link da turma em formato inesperado");
  });

  it("falha com mensagem clara se o link não tem onclick", () => {
    const { doc, link } = montar();
    link.removeAttribute("onclick");
    expect(() => parametrosLinkJsf(doc, link)).toThrow("Link da turma em formato inesperado");
  });

  it("falha com o id do formulário se ele não existe na página", () => {
    const { doc, link } = montar({ comForm: false });
    expect(() => parametrosLinkJsf(doc, link)).toThrow(
      "Formulário da turma não encontrado: form_turma",
    );
  });
});
