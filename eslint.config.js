import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores([
    'dist',
    'dist-server',
    'coverage',
    'playwright-report',
    'test-results',
    '.claude',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      jsxA11y.flatConfigs.recommended,
      reactHooks.configs.flat['recommended-latest'],
    ],
    plugins: { 'react-refresh': reactRefresh },
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser },
    },
    rules: {
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'jsx-a11y/label-has-associated-control': ['error', { depth: 3 }],
    },
  },
  {
    // Dissection plates export a data object that embeds its SVG component.
    files: ['src/modules/jvm/internals/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // The build-time server entry exports render helpers; it is never hot-reloaded.
    files: ['src/entry-server.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
  },
  {
    files: [
      'vite.config.ts',
      'playwright.config.ts',
      'tests/e2e/**/*.ts',
      'eslint.config.js',
      'scripts/**/*.mjs',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['src/sw/**/*.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
]);
