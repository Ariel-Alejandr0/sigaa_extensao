import { defineConfig } from "vitest/config";

// Testes de caracterização (fase 2 do roadmap). O parser.js e o background.js são scripts
// clássicos: os testes os carregam por efeito colateral e usam o que eles registram no globalThis.
export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.js"],
    coverage: {
      provider: "v8",
      include: ["parser.js", "background.js"],
      reporter: ["text", "html"],
      // Critério de pronto da fase 2 (docs/roadmap.md).
      thresholds: {
        "parser.js": { lines: 90, statements: 90, functions: 90, branches: 90 },
      },
    },
  },
});
