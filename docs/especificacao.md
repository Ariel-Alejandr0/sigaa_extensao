# Especificação

Este documento descreve **o que** a extensão deve fazer. Os itens marcados com **(atual)** já existem no código; os marcados com **(alvo)** são o comportamento desejado que ainda não existe ou está incompleto. Pontos que dependem de decisão estão em [roadmap.md → Decisões em aberto](roadmap.md#decisões-em-aberto).

## 1. Objetivo

Permitir que um(a) estudante do IFC, já logado(a) no SIGAA, leve para o Google Agenda as datas de avaliações e prazos de tarefas de todas as suas turmas do semestre, com um clique, sem digitar senha na extensão e sem precisar de credenciais de API do Google.

## 2. Escopo

### Dentro do escopo
- Leitura das turmas do semestre a partir da página inicial do discente.
- Leitura do quadro **"Minhas atividades"** da página inicial.
- Leitura do quadro **"Avaliações"** da página de cada turma.
- Geração de um arquivo iCalendar (`.ics`) com esses eventos.
- Entrega do `.ics` ao usuário por download **e** importação no Google Agenda da conta escolhida pelo usuário.

### Fora do escopo (por enquanto)
- Sincronização contínua ou em segundo plano (a extensão só age quando o usuário clica).
- Remoção, no Google Agenda, de eventos que deixaram de existir no SIGAA.
- Notas, frequência, materiais ou qualquer outro dado do SIGAA.
- Outros calendários (Outlook, Apple) além do download do `.ics`, que é universal.
- Outras instituições que usam SIGAA (decisão em aberto).

## 3. Atores e ambiente

- **Usuário:** discente do IFC com sessão ativa em `https://sig.ifc.edu.br/sigaa/`.
- **SIGAA:** aplicação JSF; navegação baseada em formulários POST com estado no servidor (`javax.faces.ViewState`).
- **Google Agenda:** `https://calendar.google.com/`; o usuário pode ter várias contas Google logadas (`/u/N/`).
- **Navegador:** Chrome/Chromium com Manifest V3 (atual). Firefox e Edge: decisão em aberto.

## 4. Requisitos funcionais

### RF1 — Exibir o painel no SIGAA (atual)
- O painel aparece **somente** na página inicial do discente (detectada pela presença de `#turmas-portal`).
- Contém: botão "Enviar ao Google Agenda", botão "Baixar .ics", área de status e botão de fechar (×).
- Fechar o painel é lembrado entre páginas e sessões; clicar no ícone da extensão reabre o painel.
- Fora da página inicial, clicar no ícone mostra um indicador ("!") e uma dica no título do ícone.

### RF2 — Coletar turmas (atual)
- Para cada link em `#turmas-portal td.descricao a`, registrar: nome da turma, data de início do semestre (`(dd/mm/aaaa - ...)` na linha da turma) e índice.

### RF3 — Coletar "Minhas atividades" (atual)
- Para cada linha de `#avaliacao-portal tbody tr` com data `dd/mm/aaaa [hh:mm]`, extrair: matéria, tipo (texto do `<strong>`, sem `:`), título e data/hora.
- Linhas sem matéria, título ou data são ignoradas.

### RF4 — Coletar avaliações de cada turma (atual)
- Abrir a página de cada turma reproduzindo o POST JSF que o link faria.
- No bloco cujo cabeçalho começa por "Avaliações", extrair de cada item: data `dd/mm [hh:mm]` e descrição.
- **Ano:** o quadro não traz o ano. Usa-se o ano de início do semestre; se a data cair mais de 30 dias antes do início, usa-se o ano seguinte.
- Mostrar o progresso turma a turma ("Lendo X (i/n)…").
- Aguardar um intervalo entre turmas (hoje 700 ms) para não sobrecarregar o servidor.
- **(alvo)** Ao terminar, o SIGAA deve continuar navegável sem precisar recarregar a página.

### RF5 — Consolidar eventos (atual, com ressalva)
- Remover duplicados entre a página inicial e as turmas; quando houver conflito, o dado da turma prevalece.
- Ordenar por data e hora.
- **(alvo)** A chave de duplicidade deve distinguir avaliações com o mesmo título e datas diferentes (ver [diagnóstico](diagnostico.md#d-arquivo-ics-e-regras-de-negócio)).

### RF6 — Gerar o `.ics` (atual, com ressalvas)
Regras de conversão:

| Situação | Evento gerado |
|---|---|
| Avaliação com horário | Início no horário, duração de 100 min |
| Tarefa com horário | Evento de 15 min **terminando** no prazo |
| Qualquer item sem horário | Evento de dia inteiro |
| Todos | Lembrete 1 dia antes (`VALARM TRIGGER:-P1D`) |

- `SUMMARY`: `"<tipo>: <título> — <matéria>"`.
- `DESCRIPTION`: origem, matéria e tipo.
- `UID`: estável por evento, para que reimportar não duplique.
- Fuso: horário de Brasília.
- **(alvo)** O arquivo deve ser válido segundo a RFC 5545 (dobra de linhas em 75 octetos, fuso declarado com `TZID`/`VTIMEZONE`, `SEQUENCE` para atualizações).

### RF7 — Baixar o `.ics` (atual)
- Gera e baixa `avaliacoes_sigaa.ics`; o status informa quantos eventos foram salvos.

### RF8 — Importar no Google Agenda (atual; melhor esforço)
Atalho de melhor esforço; o caminho garantido é o RF7 ([ADR 0002](decisoes/0002-download-e-importacao-automatica.md)).


Fluxo atual (automação da interface do Google, sem API):
1. Abrir uma aba nova no seletor de contas do Google, com destino na página *Importar e exportar*.
2. Somente nessa aba, ir para `/calendar/u/N/r/settings/export` mantendo a conta escolhida.
3. Anexar o `.ics` no campo de arquivo e clicar em "Importar"/"Import".
4. Mostrar a conta usada e o resultado lido da página do Google.
5. Se qualquer passo falhar, oferecer o download do `.ics` com instruções para importar à mão.

Requisitos que valem para qualquer estratégia escolhida:
- O usuário escolhe a conta Google e vê claramente em qual conta os eventos entraram.
- A extensão nunca age em abas do Google Agenda que ela não abriu.
- Sempre existe uma saída manual (download do `.ics`) quando a automação falha.

### RF9 — Erros e mensagens (atual)
- Sessão do SIGAA expirada: mensagem pedindo novo login.
- Extensão recarregada com a página aberta: mensagem pedindo F5.
- Nenhum evento encontrado: aviso.
- Erros inesperados: mensagem no painel e log no console com o prefixo `[SIGAA Agenda]`.

## 5. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF1 — Privacidade | Não pedir, ler nem guardar senhas. Dados acadêmicos ficam só no navegador; nada é enviado a servidores que não sejam o próprio SIGAA e o Google Agenda escolhido. O `.ics` guardado temporariamente expira em até 15 min e é apagado ao concluir ou fechar a aba. |
| RNF2 — Permissões mínimas | Pedir só as permissões e hosts indispensáveis, cada uma justificada (requisito também da Chrome Web Store). |
| RNF3 — Respeito ao servidor | Requisições sequenciais, com intervalo, com tempo limite (alvo) e sem repetição agressiva. |
| RNF4 — Robustez a mudanças de layout | Seletores do SIGAA e do Google isolados em um só lugar, com falha explícita e mensagem útil quando não encontrados. |
| RNF5 — Testabilidade | Parser e gerador de `.ics` sem dependência de APIs do Chrome, testados com HTML real anonimizado (alvo). |
| RNF6 — Isolamento visual | A interface injetada não deve ser afetada pelo CSS da página nem afetá-lo (alvo: Shadow DOM). |
| RNF7 — Acessibilidade | Botões com rótulo acessível; status anunciado a leitores de tela (`aria-live`) (alvo). |
| RNF8 — Idioma | Interface em português; o código segue o padrão já existente (identificadores e comentários em português). |
| RNF9 — Compatibilidade | Chrome com Manifest V3, versão mínima declarada no manifest (alvo). |
| RNF10 — Simplicidade | Instalar e usar, sem nenhuma configuração: sem OAuth, sem API do Google, sem projeto no Google Cloud, sem servidor próprio. O `.ics` é o formato de troca ([ADR 0001](decisoes/0001-sem-oauth.md)). |

## 6. Modelo de dados

### Evento interno
```js
{
  materia: string,          // nome da turma/disciplina
  tipo: string,             // "Avaliação", "Tarefa", ... (vindo do SIGAA)
  titulo: string,
  data: "AAAA-MM-DD",       // data local (Brasília)
  hora: "HH:MM" | null,     // null => dia inteiro
  origem: "home" | "turma"  // de onde foi lido
}
```

### Turma
```js
{ nome: string, inicio: "AAAA-MM-DD" | null, indice: number }
```

### Armazenamento da extensão (`chrome.storage.local`)
| Chave | Conteúdo | Vida útil |
|---|---|---|
| `caixaFechada` | `boolean` — o painel foi fechado | Permanente |
| `importacao` | `{ tabId, ics, criadoEm }` | Até 15 min, conclusão ou fechamento da aba |

## 7. Permissões (atual)

| Permissão | Motivo |
|---|---|
| `storage` | Guardar estado do painel e o `.ics` temporário |
| `scripting` | Injetar o anexo do arquivo no "mundo principal" da página do Google |
| host `calendar.google.com/*` | Automatizar a página de importação |
| content script em `sig.ifc.edu.br/sigaa/*` | Painel e leitura do SIGAA |

## 8. Critérios de aceitação gerais

- Com HTML real (fixtures) de página inicial e de turma, o parser produz exatamente a lista de eventos esperada.
- O `.ics` gerado passa em um validador RFC 5545 e é importado sem erros no Google Agenda.
- Importar o mesmo `.ics` duas vezes não duplica eventos (verificar e documentar o comportamento real do Google).
- Depois de uma coleta, todos os links da página inicial do SIGAA continuam funcionando.
- Com a interface do Google alterada, o usuário recebe a saída manual em vez de um erro mudo.
