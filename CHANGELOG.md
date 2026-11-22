# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [Não lançado]

### Adicionado
- Repositório git publicado no GitHub, com a `main` protegida: mudanças só via Pull Request.
- `.gitignore`, `.editorconfig`, `LICENSE` (MIT) e este `CHANGELOG.md`.
- Documentação para desenvolvimento em `docs/`: especificação, arquitetura, diagnóstico, roadmap e registros de decisão (ADR 0001 a 0004).
- Ferramentas de desenvolvimento: `package.json` com os scripts `lint`, `format`, `format:check` e `typecheck`; ESLint, Prettier e verificação de tipos do JavaScript com `checkJs` (ADR 0004).
- Testes de caracterização com Vitest e jsdom (`npm test`, `npm run coverage`): parser, geração do `.ics` (validada com o `ical.js`) e background com `chrome` simulado. Páginas reais do SIGAA, com dados pessoais removidos, em `tests/fixtures/`. Os bugs conhecidos D1, D2 e D6 ficam registrados como testes que falham de propósito até a fase 3.

### Alterado
- Código formatado com o Prettier e com anotações JSDoc onde a verificação de tipos precisava. Sem mudança de comportamento.

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
