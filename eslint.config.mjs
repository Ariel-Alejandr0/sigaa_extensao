import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: ["node_modules/", "dist/", "coverage/"],
  },
  js.configs.recommended,
  {
    // Scripts da extensão: carregados como scripts clássicos (não são módulos).
    files: ["*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "script",
      globals: {
        ...globals.webextensions,
      },
    },
  },
  {
    // Content scripts e o parser rodam na página.
    files: ["content.js", "calendar.js", "parser.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    // background.js é o service worker; anexarNoMundoPrincipal() roda na página (mundo principal).
    files: ["background.js"],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
        ...globals.browser,
      },
    },
  },
  {
    // Testes (Vitest): módulos ES, rodam no Node com o jsdom.
    files: ["tests/**/*.js"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    files: ["*.mjs"],
    languageOptions: {
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
];
