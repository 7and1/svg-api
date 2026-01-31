import tsParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["**/dist/**", "**/.next/**", "**/node_modules/**", "**/.wrangler/**"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
  {
    files: ["**/*.js", "**/*.jsx"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },
];
