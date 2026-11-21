# ADR 0003 — Licença MIT

- **Status:** aceita
- **Data:** 2026-11-20
- **Relacionada a:** DEC1 do [roadmap](../roadmap.md#decisões-em-aberto), item A5 do [diagnóstico](../diagnostico.md)

## Contexto

O projeto vai para um repositório **público** no GitHub. Sem licença, o código fica com todos os direitos reservados: outras pessoas podem lê-lo, mas não têm permissão para usar, modificar ou redistribuir.

## Opções

- **MIT:** permissiva e curta. Qualquer pessoa pode usar, modificar e redistribuir, desde que mantenha o aviso de copyright.
- **GPL-3.0:** copyleft. Quem distribuir uma versão modificada precisa publicar o código sob a mesma licença.
- **Nenhuma:** todos os direitos reservados. Só faz sentido em repositório privado.

## Decisão

**MIT**, conforme a recomendação inicial do roadmap para o caso de repositório público.

## Consequências

- O arquivo `LICENSE` na raiz traz o texto da MIT.
- Outros estudantes e outras instituições com SIGAA podem reaproveitar o código livremente (ver DEC5).
- Versões derivadas podem ser fechadas; o projeto aceita isso em troca da simplicidade.
- Dependências adicionadas nas próximas fases precisam ter licença compatível com a MIT (MIT, BSD, ISC, Apache-2.0 etc.).
