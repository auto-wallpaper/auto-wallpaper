import { fileURLToPath } from "url";

/** @typedef {import("prettier").Config} PrettierConfig */
/** @typedef {import("prettier-plugin-tailwindcss").PluginOptions} TailwindConfig */
/** @typedef {import("prettier-plugin-rust").options} RustConfig */
/** @typedef {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig */

/** @type { PrettierConfig | SortImportsConfig | TailwindConfig | RustConfig } */
const config = {
  overrides: [
    {
      files: ["*.js", "*.jsx", "*.ts", "*.tsx"],
      excludeFiles: ["*.rs"],
      options: {
        plugins: [
          "@ianvs/prettier-plugin-sort-imports",
          "prettier-plugin-tailwindcss",
        ],
        tailwindConfig: fileURLToPath(
          new URL("../../tooling/tailwind/web.ts", import.meta.url),
        ),
        tailwindFunctions: ["cn", "cva"],
        importOrder: [
          "<TYPES>",
          "^(react/(.*)$)|^(react$)|^(react-native(.*)$)",
          "^(next/(.*)$)|^(next$)",
          "^(expo(.*)$)|^(expo$)",
          "<THIRD_PARTY_MODULES>",
          "",
          "<TYPES>^@acme",
          "^@acme/(.*)$",
          "",
          "<TYPES>^[.|..|~]",
          "^~/",
          "^[../]",
          "^[./]",
        ],
        importOrderParserPlugins: ["typescript", "jsx", "decorators-legacy"],
        importOrderTypeScriptVersion: "4.4.0",
      },
    },
    {
      files: ["*.rs"],
      options: {
        plugins: ["prettier-plugin-rust"],
        tabWidth: 2,
      },
    },
  ],
};

export default config;
