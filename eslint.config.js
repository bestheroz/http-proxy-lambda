import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import prettierConfig from "eslint-config-prettier";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      ".serverless/**",
      ".webpack/**",
      ".build/**",
      ".esbuild/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@typescript-eslint": tseslint.plugin,
      import: importPlugin,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          vars: "all",
          varsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // AWS Lambda 최적화 관련 규칙
      "no-console": "off", // Lambda 환경에서는 console 로깅이 필요함
      "no-process-exit": "error", // Lambda에서는 process.exit()를 사용하지 않아야 함
      "no-return-await": "error", // Lambda 성능 최적화 (return await는 불필요한 오버헤드 발생)
    },
    settings: {
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true,
          project: "./tsconfig.json",
        },
        node: {
          extensions: [".js", ".ts"],
        },
      },
    },
  },
  prettierConfig,
);
