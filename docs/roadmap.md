# Roadmap: do protótipo a um projeto sério

As etapas estão em ordem: cada fase deixa a seguinte mais segura. Em especial, **os testes (fase 2) vêm antes da refatoração (fase 3)**, para que a refatoração não mude comportamento sem ninguém perceber. Os códigos entre colchetes (ex.: [A1]) remetem ao [diagnóstico](diagnostico.md).

O projeto é pequeno (~530 linhas). O ferramental proposto é deliberadamente enxuto: nada de framework de extensão pesado sem necessidade.

## Decisões em aberto

Precisam ser tomadas antes ou durante as fases indicadas. Cada decisão deve virar um registro curto em `docs/decisoes/` (formato ADR: contexto, opções, decisão, consequências).

| # | Decisão | Opções | Recomendação inicial | Fase |
|---|---|---|---|---|
| DEC1 | Licença | **Decidida.** MIT, com repositório público ([ADR 0003](decisoes/0003-licenca.md)) | — | 0 |
| DEC2 | Linguagem | **Decidida.** JS + JSDoc + `checkJs` ([ADR 0004](decisoes/0004-jsdoc-checkjs.md)) | — | 1 |
| DEC3 | **Integração com o Google Agenda** [C1] | **Decidida.** Sem OAuth ([ADR 0001](decisoes/0001-sem-oauth.md)). Manter o download do `.ics` (garantido) e a importação automática (melhor esforço, volta para o download quando falha) ([ADR 0002](decisoes/0002-download-e-importacao-automatica.md)) | — | 3 |
| DEC4 | Navegadores | Só Chrome; Chrome + Edge; também Firefox | Chrome + Edge (mesmo pacote). Firefox só se houver demanda. | 3 |
| DEC5 | Instituições | Só IFC; qualquer SIGAA configurável | Só IFC agora, mas com host e seletores isolados em configuração para facilitar depois | 3 |
| DEC6 | Distribuição | Modo desenvolvedor; Chrome Web Store (não listada/pública) | Web Store não listada | 6 |

## Fase 0 — Fundação do repositório
- [x] `git init`, branch `main`, primeiro commit com o estado atual (marco "protótipo") [A1].
- [x] Criar repositório remoto no GitHub e proteger a `main` (mudanças só via PR).
- [x] `.gitignore` (`node_modules/`, `dist/`, `*.zip`, `coverage/`), `.editorconfig`.
- [x] `LICENSE` conforme DEC1 [A5].
- [x] `CHANGELOG.md` (formato *Keep a Changelog*), iniciando em `2.1.0`.
- [x] Procurar os testes "com simulações" citados no README; se existirem em outro lugar, trazê-los para o repositório [A2]. *Procurados em 2026-11-20: não foram encontrados. Os testes serão escritos do zero na fase 2.*

**Pronto quando:** o projeto está versionado no GitHub com a `main` protegida.

## Fase 1 — Ferramentas de desenvolvimento
- [x] `package.json` com `engines.node` e scripts `lint`, `format`, `format:check`, `typecheck`, `test`, `build`, `package` [A3]. *`test`, `build` e `package` só avisam que ainda não existem, até as fases 2, 3 e 5.*
- [x] ESLint (config flat, globals de `webextensions` e `browser`) e Prettier; aplicar a formatação em um commit isolado. *O Prettier não formata os `.md`, para não realinhar as tabelas da documentação.*
- [x] Verificação de tipos conforme DEC2 (`tsconfig.json` com `checkJs` + `@types/chrome`). *Sem `strict` por enquanto; globais compartilhados em `types/globais.d.ts`.*
- [ ] Hook de pré-commit opcional (lint + testes rápidos). *Adiado em 2026-11-21: sem testes rápidos ainda, e o CI da fase 5 vai cobrir lint e tipos.*

**Pronto quando:** `npm run lint`, `npm run format:check` e `npm run typecheck` passam limpos.

## Fase 2 — Rede de segurança: testes de caracterização
- [x] Salvar **fixtures** de HTML real, com dados pessoais removidos: página inicial do discente, página de turma com avaliações, turma sem avaliações, tela de login (sessão expirada) [A2]. *Em `tests/fixtures/sigaa/`, em UTF-8 e fora do Prettier. Ainda não há página real de turma sem avaliações: o caso é testado esvaziando o quadro da página real.*
- [x] Vitest + jsdom. Testes de `parseTurmas`, `parseAtividadesHome`, `parseAvaliacoesTurma`, `juntar`, `parametrosLinkJsf`.
- [x] Testes de `gerarIcs`: conteúdo esperado (snapshot) e validação com uma biblioteca iCalendar (ex.: `ical.js`) para garantir que o arquivo é lido sem erro.
- [x] Casos de borda: virada de ano no semestre [D5], item sem horário, tarefa, acentos/encoding [D6], títulos repetidos [D1]. *Feitos alterando a fixture real dentro do teste.*
- [x] Testes do background com `chrome` simulado (ex.: `sinon-chrome` ou mock próprio): entrega só à aba certa, expiração, limpeza ao fechar a aba. *Mock próprio em `tests/apoio/chrome-falso.js`. A função injetada na página do Google (`anexarNoMundoPrincipal`) fica para a fase 4: o jsdom não tem `DataTransfer`.*
- [x] Os testes que expõem bugs conhecidos (D1, D2) entram marcados como `todo`/`fails` até a fase 3. *Marcados com `it.fails`: D1 (2), D2 e D6.*

**Pronto quando:** `npm test` roda em CI local, com cobertura do `parser.js` acima de ~90%. *`npm run coverage` exige 90% no `parser.js`; em 2026-11-21: 100% das linhas, 98,5% dos ramos.*

## Fase 3 — Refatoração e correções
Estrutura proposta:
```
src/
  manifest.json
  background/        service worker, roteamento de mensagens
  sigaa/             cliente HTTP (fetch, encoding, sessão), seletores, parser
  eventos/           modelo, deduplicação, regras de duração/ano
  ics/               gerador iCalendar (RFC 5545)
  google/            integração conforme DEC3
  ui/                painel (Shadow DOM) e estilos
  comum/             mensagens (constantes), log, download
tests/
  fixtures/
dist/                saída do build (ignorada no git)
```
- [ ] Converter para ES modules e adicionar build com **esbuild** (ou Vite) gerando `dist/` [B1].
- [ ] Separar o `parser.js` em `sigaa/`, `eventos/` e `ics/` [B3]; concentrar seletores e constantes em configuração [B5, B6].
- [ ] Contrato de mensagens em um módulo único, com validação do remetente no background [B4, C6].
- [ ] Remover o content script estático do Google Agenda e injetar via `chrome.scripting` só na aba aberta pela extensão [B2].
- [ ] Isolar a importação automática em `src/google/`, com seletores e textos do Google em um só lugar; garantir que toda falha caia no download com instruções (ADR 0002).
- [ ] Cliente do SIGAA: `AbortController` com tempo limite, checagem de `res.ok`, mensagens de erro distintas para rede/sessão/layout [C3, C4].
- [ ] Investigar e eliminar a necessidade de recarregar o SIGAA após a coleta [C2]; se não houver como, documentar e avisar o usuário.
- [ ] `.ics`: dobra de linhas, `TZID=America/Sao_Paulo` + `VTIMEZONE`, `SEQUENCE`/`LAST-MODIFIED`, chave/`UID` que inclua a data ou um identificador do SIGAA [D1–D4].
- [ ] Mover o `.ics` temporário para `chrome.storage.session` [C5]; trocar o `setTimeout` do badge por `chrome.alarms` ou remover [C7].
- [ ] Manifest: remover `background.scripts` (ou tratar Firefox conforme DEC4), adicionar `minimum_chrome_version` [C8].
- [ ] Painel em Shadow DOM, `aria-live` no status, função única de download [C9, E1, B7].

**Pronto quando:** todos os testes da fase 2 passam (inclusive os antes marcados como falhando) e a extensão construída em `dist/` funciona no Chrome.

## Fase 4 — Verificação no navegador real
- [ ] Testes de ponta a ponta com **Playwright** carregando a extensão de `dist/`, contra um servidor local que serve as fixtures do SIGAA (o SIGAA real não deve ser usado em testes automáticos).
- [ ] Roteiro de **teste manual** em `docs/teste-manual.md` para o que não pode ser automatizado: SIGAA real, Google Agenda real, várias contas Google, reimportação (confirmar o comportamento de [D4] e corrigir o README).
- [ ] Registrar o resultado do roteiro manual a cada release.

**Pronto quando:** o fluxo completo foi executado no Chrome real ao menos uma vez e o resultado está documentado.

## Fase 5 — CI/CD e release
- [ ] GitHub Actions: lint, tipos, testes unitários e e2e em cada PR [A4].
- [ ] Script `npm run package` que gera `sigaa-agenda-<versão>.zip` a partir de `dist/`.
- [ ] Versionamento semântico; versão única no `package.json`, copiada para o manifest no build.
- [ ] Workflow de release por tag: gera o `.zip` e anexa na release do GitHub.
- [ ] Publicação conforme DEC6: política de privacidade, justificativa de cada permissão, capturas de tela.

**Pronto quando:** uma tag `vX.Y.Z` produz automaticamente um pacote instalável.

## Fase 6 — Documentação final
- [ ] `README.md` da raiz enxuto: o que é, instalação, uso, limitações, link para `docs/` [A6].
- [ ] `CONTRIBUTING.md`: como rodar, testar, atualizar fixtures, convenções de commit e de branch.
- [ ] `docs/privacidade.md`: política de privacidade (exigida pela Web Store).
- [ ] Atualizar `arquitetura.md` e `especificacao.md` para refletir o resultado da fase 3.
- [ ] `docs/decisoes/` com os ADRs de DEC1–DEC6.

**Pronto quando:** uma pessoa nova consegue clonar, rodar os testes, construir e instalar seguindo só a documentação.

## Melhorias futuras (fora deste roadmap)
- Página de opções: duração das provas, antecedência do lembrete, agenda de destino [B6, E3].
- Atualização de eventos que mudaram no SIGAA, dentro do que a reimportação do `.ics` permitir (`UID` + `SEQUENCE`). Remoção automática não é possível sem a API, que foi descartada ([ADR 0001](decisoes/0001-sem-oauth.md)).
- Suporte a outras instâncias do SIGAA (DEC5).
- Internacionalização com `chrome.i18n` [E2].
