# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Repositório git, com a `main` alterada apenas via Pull Request.
- `.gitignore`, `.editorconfig`, `LICENSE` (MIT) e este `CHANGELOG.md`.
- Documentação para desenvolvimento em `docs/`: especificação, arquitetura, diagnóstico, roadmap e registros de decisão (ADR 0001 a 0003).

## [2.1.0] - 2026-11-13

Primeira versão registrada (marco "protótipo"). As versões anteriores não têm histórico.

### Adicionado
- Painel na página inicial do discente no SIGAA do IFC, com os botões **Enviar ao Google Agenda** e **Baixar .ics**.
- Leitura das turmas, das avaliações de cada turma e das tarefas de "Minhas atividades".
- Geração do arquivo `.ics` com lembrete de 1 dia antes.
- Importação automática no Google Agenda, na aba aberta pela extensão, com opção de download manual quando a automação falha.
- Fechar e reabrir o painel pelo ícone da extensão.

[Não lançado]: https://github.com/Ariel-Alejandr0/sigaa_extensao/compare/v2.1.0...HEAD
[2.1.0]: https://github.com/Ariel-Alejandr0/sigaa_extensao/releases/tag/v2.1.0
