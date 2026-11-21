# ADR 0001 — Não usar a API do Google Calendar (OAuth)

- **Status:** aceita
- **Data:** 2026-11-20
- **Relacionada a:** DEC3 do [roadmap](../roadmap.md#decisões-em-aberto), item C1 do [diagnóstico](../diagnostico.md)

## Contexto

A integração atual com o Google Agenda imita cliques na página de importação, e isso é frágil. A alternativa robusta seria a API do Google Calendar com `chrome.identity` e OAuth.

## Decisão

**Não usar OAuth nem a API do Google.** O projeto deve continuar simples.

## Motivos

- OAuth aumentaria muito o escopo: projeto no Google Cloud, ID de cliente, tela de consentimento, verificação do app pelo Google (escopos de agenda são sensíveis) e manutenção de credenciais.
- Usar a extensão não deve exigir nenhuma configuração além de instalá-la.

## Consequências

- O `.ics` é o formato de troca e **o caminho garantido**: o download sempre funciona, em qualquer agenda.
- A importação automática no Google, se mantida, é um atalho de melhor esforço e sempre precisa cair no download manual quando falhar.
- Não é possível remover do Google eventos apagados no SIGAA, nem criar uma agenda dedicada automaticamente. A atualização de eventos existentes depende de como o Google trata a reimportação de um `UID` repetido, o que precisa ser verificado (item D4 do diagnóstico).
- As duas opções restantes (download e importação automática) foram mantidas: ver [ADR 0002](0002-download-e-importacao-automatica.md).
