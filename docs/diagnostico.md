# Diagnóstico do código atual

Levantamento feito na versão `2.1.0`. Cada item tem gravidade (**alta**, **média**, **baixa**) e referência ao código. Os itens são tratados nas etapas do [roadmap](roadmap.md).

O código em si é curto e legível. O que falta é tudo **em volta** dele (versionamento, testes, ferramentas, processo), e há algumas escolhas frágeis de arquitetura e de formato de arquivo.

## A. Infraestrutura do projeto

| # | Gravidade | Problema |
|---|---|---|
| A1 | alta | **Não é um repositório git.** Não há histórico, branches nem como revisar mudanças. |
| A2 | alta | **Nenhum teste no repositório.** O `README.md:33` diz que houve testes "com simulações", mas eles não estão no projeto: não podem ser rodados nem mantidos. |
| A3 | média | Sem `package.json`, lint, formatação automática ou verificação de tipos. |
| A4 | média | Sem CI, sem processo de release, sem empacotamento (`.zip` para a loja). |
| A5 | baixa | Sem `LICENSE`, `CHANGELOG`, `.gitignore`, `.editorconfig`. A versão `2.1.0` não tem histórico que a explique. |
| A6 | baixa | O `README.md` mistura guia do usuário, notas de desenvolvimento e um relatório de testes. |

## B. Arquitetura e organização

| # | Gravidade | Problema |
|---|---|---|
| B1 | média | **Módulos por variável global** (`globalThis.SigaaParser`, `parser.js:139`) e ordem de carga definida no manifest. Não há `import`/`export`, o que dificulta testes e reuso. |
| B2 | média | **`calendar.js` roda em toda página do Google Agenda** (`manifest.json:30-41`) e acorda o service worker a cada carregamento só para perguntar se é a aba certa (`calendar.js:20`). Como a extensão já tem `scripting` e o host, poderia injetar o script **só** na aba que ela abriu. |
| B3 | média | `parser.js` mistura responsabilidades: leitura do SIGAA, regras de negócio (deduplicação, ano), formato iCalendar e montagem de POST JSF. |
| B4 | média | Nomes de mensagens são strings repetidas em três arquivos; não há um contrato central. |
| B5 | baixa | Seletores do SIGAA e do Google espalhados pelo código, em vez de concentrados em um módulo de configuração. |
| B6 | baixa | Constantes de regra (`DURACAO_PADRAO_MIN`, 15 min das tarefas, 700 ms, 15 min de validade, lembrete de 1 dia) fixas no código, sem opção para o usuário. |
| B7 | baixa | Lógica de download do `.ics` duplicada (`content.js:133-136` e `calendar.js:43-46`). |

## C. Robustez e segurança

| # | Gravidade | Problema |
|---|---|---|
| C1 | alta | **Integração com o Google por automação de interface.** Depende de texto de botão, URL interna e comportamento de `input[type=file]` (`calendar.js:69-111`). Pode quebrar a qualquer atualização do Google, e o próprio README admite que nunca foi testada no Chrome real (`README.md:34`). É a decisão de arquitetura mais importante a revisar. |
| C2 | média | **Efeito colateral no SIGAA:** reproduzir POSTs JSF altera o estado de navegação no servidor; o README pede para recarregar a página se algum link parar de funcionar (`README.md:64`). |
| C3 | média | `fetch` sem tempo limite (`content.js:68`, `content.js:76`): se o SIGAA travar, o painel fica preso em "Lendo…" com os botões desabilitados. |
| C4 | média | Nenhuma resposta do SIGAA é checada por `res.ok`; uma página de erro 500 vira "nenhuma avaliação encontrada" sem aviso. |
| C5 | média | O `.ics` (dados acadêmicos pessoais) fica em `chrome.storage.local`, que vai para o disco. `chrome.storage.session` (só memória) é mais adequado. |
| C6 | baixa | `onMessage` no background não valida o remetente (`background.js:51`): não confere `sender.id` nem a URL da aba que pediu `importarNoGoogle`. |
| C7 | baixa | `setTimeout` no service worker para limpar o "!" (`background.js:78`) pode não executar se o worker for suspenso. |
| C8 | baixa | `manifest.json` declara `background.service_worker` **e** `background.scripts` (provável tentativa de compatibilidade com Firefox), mas sem `browser_specific_settings`; o Chrome emite aviso. Sem `minimum_chrome_version` (usa `world: "MAIN"`, Chrome 95+). |
| C9 | baixa | CSS injetado por id, sem Shadow DOM: o CSS do SIGAA/Google pode alterar o painel e vice-versa. |
| C10 | baixa | `contaAtual` extrai e-mail de qualquer `aria-label` que contenha "Conta do Google" (`calendar.js:53-61`): frágil e dependente de idioma. |

## D. Arquivo ics e regras de negócio

| # | Gravidade | Problema |
|---|---|---|
| D1 | média | **Chave de duplicidade sem data** (`parser.js:75`, `parser.js:102`): duas avaliações da mesma matéria com o mesmo título (ex.: "Trabalho" em datas diferentes) viram um evento só, e também recebem o mesmo `UID`. |
| D2 | média | **Sem dobra de linhas** (RFC 5545 §3.1, máx. 75 octetos). `SUMMARY` com nome de disciplina longo e acentos excede facilmente. O Google tolera; outros clientes podem não tolerar. |
| D3 | média | **Fuso fixo em UTC-3** (`parser.js:5`) convertido à mão para `Z`. Funciona hoje (sem horário de verão desde 2019), mas o correto é `TZID=America/Sao_Paulo` com `VTIMEZONE`. |
| D4 | média | **Reimportação não verificada:** o README afirma que o `UID` fixo faz o Google atualizar em vez de duplicar (`README.md:56`). Isso precisa ser testado; sem `SEQUENCE`/`LAST-MODIFIED`, mudanças de data podem ser ignoradas na reimportação. |
| D5 | baixa | **Inferência do ano** (`parser.js:61-63`) com regra de "30 dias antes do início" sem testes; se a data de início não for encontrada, usa o ano corrente. |
| D6 | baixa | Detecção do quadro por `startsWith("Avaliações")` (`parser.js:56`) depende do acento e da decodificação correta do HTML. |
| D7 | baixa | `X-WR-CALNAME` é ignorado na importação (os eventos vão para a agenda principal); não há opção de agenda dedicada. |

## E. Interface e acessibilidade

| # | Gravidade | Problema |
|---|---|---|
| E1 | baixa | Área de status sem `aria-live`; leitores de tela não anunciam o progresso nem os erros. |
| E2 | baixa | Textos fixos no código (não usa `chrome.i18n`); aceitável se o público é só o IFC, mas deve ser uma decisão consciente. |
| E3 | baixa | Sem página de opções nem popup: o ícone só reabre o painel. |
