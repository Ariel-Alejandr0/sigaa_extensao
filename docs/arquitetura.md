# Arquitetura atual

Retrato do código na versão `2.1.0`. Não há build, dependências nem testes no repositório: os arquivos são carregados diretamente pelo Chrome.

## Componentes

| Arquivo | Contexto de execução | Responsabilidade |
|---|---|---|
| `manifest.json` | — | MV3; declara service worker, dois content scripts, permissões e ícones. |
| `parser.js` | Content script no SIGAA (antes de `content.js`) | Funções puras sobre `Document`: turmas, atividades, avaliações, deduplicação, geração do `.ics`, montagem do POST JSF. Exposto como `globalThis.SigaaParser`. |
| `content.js` | Content script no SIGAA | Painel, leitura das turmas via `fetch` (reproduzindo o POST JSF), download do `.ics`, pedido de importação ao background. |
| `background.js` | Service worker | Abre a aba do seletor de contas, guarda o `.ics`, entrega-o só à aba certa, injeta o anexo no mundo principal, reabre o painel ao clicar no ícone. |
| `calendar.js` | Content script em **todas** as páginas de `calendar.google.com` | Se a aba for a da importação: redireciona para *Importar e exportar*, anexa o arquivo, clica em "Importar" e lê a confirmação. |
| `content.css` / `calendar.css` | Páginas do SIGAA / Google | Estilos dos painéis injetados (por id, sem Shadow DOM). |

## Fluxo "Enviar ao Google Agenda"

```
SIGAA (content.js)                 background.js                     Google (calendar.js)
──────────────────                 ─────────────                     ────────────────────
clique no botão
parseAtividadesHome(document)
para cada turma:
  fetch HOME (GET)  ── renova o ViewState JSF
  fetch turma (POST JSF)
  parseAvaliacoesTurma
  espera 700 ms
fetch HOME (GET)  ── "devolve" o servidor à página inicial
juntar() → gerarIcs()
sendMessage importarNoGoogle ───▶ valida "BEGIN:VCALENDAR"
                                  tabs.create(AccountChooser?continue=…/settings/export)
                                  storage.local.importacao = {tabId, ics, criadoEm}
                                                                    usuário escolhe a conta
                                                                    página carrega
                                  ◀── calendarioPronto ──────────── (toda página do Google pergunta)
                                  responde {ics} só se tabId bate
                                                                    redireciona p/ /u/N/r/settings/export
                                                                    espera input[type=file] e botão Importar
                                                                    anexa via DataTransfer (mundo isolado)
                                  ◀── anexarNaPagina ────────────── se não pegou
                                  executeScript(world: MAIN)
                                                                    clica "Importar"
                                  ◀── calendarioConcluido ────────
                                  remove importacao
                                                                    lê "N de M eventos" e mostra a conta
```

## Protocolo de mensagens

Mensagens são objetos `{ tipo, ... }` trocados por `chrome.runtime.sendMessage` / `chrome.tabs.sendMessage`. Os nomes são strings soltas, repetidas em cada arquivo.

| `tipo` | De → Para | Carga | Resposta |
|---|---|---|---|
| `importarNoGoogle` | content → background | `{ ics }` | `{ ok: true }` ou `{ erro }` |
| `calendarioPronto` | calendar → background | — | `{ ics }` se a aba for a da importação, senão `{}` |
| `anexarNaPagina` | calendar → background | — | `{ campos: n }` |
| `calendarioConcluido` | calendar → background | — | `{ ok: true }` |
| `mostrarCaixa` | background → content | — | `{ ok: true }` (ausência de resposta = não é a página inicial) |

## Interação com o SIGAA

- O SIGAA é JSF: os links das turmas chamam `jsfcljs(form, {param: valor}, ...)` no `onclick`. `parametrosLinkJsf` lê o `onclick`, coleta os `input[name]` do formulário (inclui o `ViewState`) e monta o mesmo POST.
- Antes de cada turma a página inicial é buscada de novo para obter um `ViewState` válido. Total de requisições: `2 × turmas + 1`.
- Codificação: lida do cabeçalho `Content-Type` ou da `<meta charset>`; padrão ISO-8859-1.
- Sessão expirada é detectada pela presença de `input[name="user.login"]`.

## Interação com o Google Agenda

- Não usa API nem OAuth: automatiza a interface web.
- A conta é preservada pelo segmento `/u/N/` ou pelo parâmetro `authuser`.
- O anexo é feito com `DataTransfer` + eventos `input`/`change`; como plano B, a mesma função roda no mundo principal da página via `chrome.scripting.executeScript`.
- O botão é encontrado pelo texto exato "Importar" ou "Import"; a confirmação, por regex sobre o texto da página.
- Um contador em `sessionStorage` (`sigaaAgendaRedir`) evita laço de redirecionamento (máx. 3).

## Dependências externas implícitas (pontos de quebra)

| Onde | Seletor / suposição |
|---|---|
| SIGAA, página inicial | `#turmas-portal td.descricao a`, `#avaliacao-portal tbody tr`, texto `(dd/mm/aaaa - ` |
| SIGAA, turma | `div.blocoDireita`, `.headerBloco` começando com "Avaliações", `ul.menu-direita li .data/.descricao` |
| SIGAA, JSF | `onclick` no formato `jsfcljs(document.getElementById('...'),{...},'`, `input[name="user.login"]` na tela de login |
| Google | URL `/r/settings/export`, `input[type=file]`, botão com texto "Importar"/"Import", `aria-label` com "Conta do Google"/"Google Account", texto "N de M eventos" |
