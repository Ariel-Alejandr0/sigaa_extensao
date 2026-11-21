# Extensão Chrome: SIGAA IFC → Google Agenda

Quando você abre a **página inicial do discente** no SIGAA (`sig.ifc.edu.br`), aparece uma caixa no canto inferior direito com dois botões:

- **📅 Enviar ao Google Agenda:** lê as avaliações de cada matéria, abre uma nova aba do Google para você **escolher a conta**, e em seguida importa as avaliações naquela conta.
- **Baixar .ics:** só baixa o arquivo, caso você prefira importar à mão.

A caixa tem um **×** no canto para fechar. Fechada, ela continua fechada nas outras páginas do SIGAA. Para **reabrir**, clique no **ícone da extensão** na barra do Chrome (se não o vir, fixe-o pelo menu de quebra-cabeça 🧩). Em páginas que não são a inicial do SIGAA, o ícone mostra um "!" rápido.

A extensão **não usa a API do Google**: não precisa de Google Cloud, ID de cliente OAuth nem autorização. Ela apenas navega no Google Agenda como você faria. Também não pede nem guarda sua senha do SIGAA ou do Google.

## Como funciona o envio

1. No SIGAA, você clica em **Enviar ao Google Agenda**. A extensão lê as turmas e gera o `.ics`.
2. Abre uma nova aba com a **tela de escolha de conta do Google**. Escolha a conta onde quer registrar.
3. A extensão vai para *Configurações → Importar e exportar* da conta escolhida, anexa o `.ics` e clica em **Importar**.
4. Um aviso no canto inferior esquerdo mostra a conta usada e o resultado.

A importação cai na **agenda principal** da conta escolhida (a opção padrão do Google).

Se o Google mudar a página e a automação não achar o campo ou o botão, o aviso oferece **Baixar .ics para importar à mão**.

## Arquivos

- `manifest.json`: configuração da extensão (sem OAuth).
- `content.js`: botões no SIGAA; lê as páginas e pede a importação.
- `parser.js`: extrai turmas, avaliações e tarefas do HTML e gera o `.ics`.
- `background.js`: abre a aba de escolha de conta, entrega o `.ics` só para essa aba e reabre a caixa quando você clica no ícone da extensão.
- `calendar.js` / `calendar.css`: rodam no Google Agenda, apenas na aba aberta pela extensão; fazem a importação.

## O que foi testado

- **Testado (fora do Chrome, com simulações):** geração do `.ics`; o `background.js` (escolha de conta, entrega do arquivo só à aba certa, expiração, injeção no mundo principal); o `calendar.js` numa página simulada (redirecionamento mantendo `/u/N/`, anexo mesmo se o Google remontar o campo, plano B pelo mundo principal, clique só em "Importar", aviso com instruções se nada funcionar); e o botão do SIGAA (inclusive o aviso de extensão recarregada); e fechar/reabrir a caixa (estado salvo, clique no ícone, "!" fora do SIGAA).
- **Não testado:** a extensão rodando de verdade no Chrome. Em especial: o redirecionamento da tela de escolha de conta do Google até a página de importação e os elementos reais da página de importação do Google Agenda, que o Google pode mudar a qualquer momento. Pode precisar de ajuste no primeiro uso.

## Instalação

1. Abra `chrome://extensions` e ative o **Modo do desenvolvedor** (canto superior direito).
2. Clique em **Carregar sem compactação** e escolha esta pasta. Se já tinha a versão antiga, clique em recarregar (⟳) e **atualize (F5) as abas do SIGAA e do Google Agenda** que já estavam abertas.

Pronto: não há mais nada para configurar.

## Uso

1. Faça login no SIGAA e abra a página inicial (Portal do Discente).
2. Clique em **Enviar ao Google Agenda**. (Se tiver fechado a caixa no ×, clique antes no ícone da extensão.) A caixa mostra o progresso matéria por matéria.
3. Na nova aba, escolha a conta do Google. **Confira o e-mail mostrado no aviso** ao final.

## Como os eventos são criados

- **Provas com horário:** duram 100 minutos. Ajuste em `DURACAO_PADRAO_MIN`, no `parser.js`.
- **Provas sem horário:** viram evento de dia inteiro.
- **Tarefas:** viram um evento de 15 minutos que termina no prazo de entrega.
- **Lembrete:** o `.ics` tem um lembrete de 1 dia antes.
- **Ano das avaliações:** o quadro "Avaliações" da matéria traz só dia e mês. A extensão usa o ano do semestre.
- **Importar de novo:** cada evento tem um UID fixo (matéria + tipo + título), então o Google costuma reconhecer e atualizar em vez de duplicar. Se aparecerem duplicados, apague-os à mão.
- **Eventos apagados do SIGAA** não são removidos do Google Agenda.

## Limitações e pontos a observar

- **Tarefas incompletas:** só aparecem as tarefas listadas em "Minhas atividades" na página inicial.
- **Datas só na página:** se o professor não cadastrar a data na Turma Virtual, ela não aparece no SIGAA nem aqui.
- **Como as turmas são abertas:** a extensão abre cada turma "por trás", repetindo o envio de formulário que o link faz. Se o SIGAA recusar, a caixa mostra o erro. Abra o console (F12) e procure mensagens com `[SIGAA Agenda]`.
- **Depois de enviar:** se algum link da página inicial parar de funcionar, recarregue a página (F5).
- **Sessão expirada:** a caixa avisa. Faça login de novo.
- **Se o anexo automático falhar:** o aviso explica o passo manual e oferece baixar o `.ics`. Abra o console (F12) da aba do Google Agenda: a extensão registra ali o HTML dos campos de arquivo e dos botões "Importar" que encontrou (mensagens `[SIGAA Agenda]`).
- **Idioma do Google Agenda:** o botão é reconhecido em português e inglês ("Importar"/"Import").
- **Mudanças no SIGAA ou no Google:** se o layout mudar, a leitura ou a automação podem parar de funcionar.
- **Navegador:** Chrome (e talvez Edge).

## Cuidados

- O `.ics` fica guardado só no armazenamento da extensão, por até 15 minutos, e é apagado ao terminar ou ao fechar a aba do Google.
- A extensão só age no Google Agenda na aba que ela mesma abriu; outras abas do Google Agenda não são tocadas.
- Confira as regras de uso do sistema do IFC antes de automatizar o acesso.
