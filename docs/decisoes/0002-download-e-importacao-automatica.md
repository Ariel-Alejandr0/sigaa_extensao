# ADR 0002 — Manter o download do `.ics` e a importação automática

- **Status:** aceita
- **Data:** 2026-11-20
- **Relacionada a:** DEC3 do [roadmap](../roadmap.md#decisões-em-aberto), [ADR 0001](0001-sem-oauth.md), item C1 do [diagnóstico](../diagnostico.md)

## Contexto

Sem OAuth ([ADR 0001](0001-sem-oauth.md)), sobram duas formas de levar os eventos ao Google Agenda:
- **download do `.ics`**, para o usuário importar à mão;
- **importação automática**, que faz na página *Importar e exportar* do Google Agenda os cliques que o usuário faria.

A importação automática é a parte mais frágil do código: depende de textos de botão e de URLs internas do Google, e nunca foi testada no Chrome de verdade.

## Decisão

**Manter as duas opções**, com papéis diferentes:

| Opção | Papel | Garantia |
|---|---|---|
| Baixar `.ics` | Caminho garantido | Precisa funcionar sempre; coberta por testes automatizados |
| Enviar ao Google Agenda | Atalho cômodo | Melhor esforço; se qualquer passo falhar, oferece o download com instruções |

## Consequências

- `calendar.js`, a permissão `scripting` e o acesso a `calendar.google.com` continuam no projeto.
- Todo o código da importação automática deve ficar isolado em um módulo (`src/google/`), com seletores e textos do Google concentrados em um só lugar, para que o conserto seja rápido quando o Google mudar a página.
- O script do Google deve ser injetado só na aba aberta pela extensão, em vez de rodar em toda página do Google Agenda (item B2 do diagnóstico).
- A importação automática não é coberta por testes de ponta a ponta contra o Google real. Ela entra no roteiro de teste manual de cada release, e o resultado fica registrado.
- Se a automação quebrar e não houver tempo de consertar, ela pode ser desligada sem afetar o download.
