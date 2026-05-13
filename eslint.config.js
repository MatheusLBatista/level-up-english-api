import js from "@eslint/js";

export default [
  {
    ignores: ["node_modules/**", "logs/**", "coverage/**", "documentacao/**"],
  },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        global: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        jest: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
      },
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "no-useless-escape": "off",
      "no-const-assign": "off",
      indent: ["error", 2, { SwitchCase: 1 }],
      quotes: ["error", "double", { avoidEscape: true }],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
      "object-curly-spacing": ["error", "always"],
      "array-bracket-spacing": ["error", "never"],
      "space-before-function-paren": ["error", "never"],
      "keyword-spacing": ["error", { before: true, after: true }],
      "space-infix-ops": "error",
      "no-trailing-spaces": "error",
      "eol-last": ["error", "always"],
    },
  },
];
