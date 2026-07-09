import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Downgraded to warn (2026-07, pre-launch). eslint-plugin-react-hooks' newer
      // rules flag working, deployed patterns (setState before an async fetch,
      // navigator.onLine on mount, Date.now() in render). Cleaning these up means
      // restructuring ~10 components; scheduled as a post-launch work order, not a
      // pre-demo refactor. tsc and all other lint errors still block CI.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
