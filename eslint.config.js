import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/*.backup",
      "**/*.backup.js",
      "**/backup_*/**",
      "node_modules/**",
      ".next/**",
      "src/components/approvals/**",
      "src/components/inspections/**",
      "src/components/head-consultant/projects/**",
      "src/components/project-lead/projects/**",
      "src/components/dashboard/TodoList.js",
      "src/components/notifications/NotificationCenter.js",
      "src/components/projects/**",
      "src/components/reports/**",
      "src/components/clients/**",
      "src/components/admin/**",
      "src/components/timeline/**",
      "src/components/head-consultant/**",
      "src/components/project-lead/**",
      "src/components/admin-lead/**",
      "src/components/AutoPhotoGeotag.js",
      "src/components/PhotoGeotagComponent.js",
      "src/components/ProjectReports.js",
    ],
  },
  ...compat.extends("next/core-web-vitals"),
  {
    rules: {
      "react/no-unescaped-entities": "off",
      "react-hooks/exhaustive-deps": "warn",
      "@next/next/no-img-element": "warn",
      "import/no-anonymous-default-export": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react/jsx-no-undef": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-sync-scripts": "warn",
      "jsx-a11y/alt-text": "warn",
    },
  },
];

export default eslintConfig;
