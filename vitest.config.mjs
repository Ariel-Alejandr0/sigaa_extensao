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
    },
  },
});
