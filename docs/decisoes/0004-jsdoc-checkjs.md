# ADR 0004 — JavaScript com JSDoc e verificação de tipos (`checkJs`)

- **Status:** aceita
- **Data:** 2026-11-21
- **Relacionada a:** DEC2 do [roadmap](../roadmap.md#decisões-em-aberto)

## Contexto

O código é JavaScript puro, sem nenhuma verificação além do navegador. Erros de digitação em nomes de campos, chamadas erradas à API `chrome.*` e valores `null` esquecidos só aparecem rodando a extensão, e a extensão quase nunca foi rodada de verdade (ver o README).

## Opções

- **JavaScript puro:** nada muda, nada é verificado.
- **JavaScript + JSDoc + `checkJs`:** o TypeScript lê os arquivos `.js` e confere os tipos, usando o que ele deduz sozinho e as anotações JSDoc nos comentários. O código continua sendo JavaScript e roda no navegador sem compilação.
- **TypeScript:** verificação mais forte e sintaxe própria, mas exige build desde já e a conversão de todos os arquivos.

## Decisão

**JavaScript + JSDoc + `checkJs`**, com `tsc --noEmit` rodando como verificação (`npm run typecheck`).

## Consequências

- Nenhum arquivo muda de extensão e a extensão continua carregando direto da pasta, sem build, até a fase 3.
- Os tipos da API do Chrome vêm de `@types/chrome`. O que os scripts compartilham entre si (o objeto `SigaaParser`) é declarado em um arquivo `.d.ts`.
- A verificação começa sem o modo `strict`, para não exigir mudanças de lógica antes de haver testes. O modo `strict` pode ser ligado aos poucos depois da fase 2.
- Se o projeto migrar para TypeScript no futuro, as anotações JSDoc já servem de ponto de partida.
