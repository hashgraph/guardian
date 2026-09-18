import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';
import pluginCypress from 'eslint-plugin-cypress';

export default defineConfig([
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      'no-shadow': 'off',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-bitwise': 'error',
      'no-var': 'error',
      'object-shorthand': ['error', 'always'],
      'one-var': ['error', 'never'],
      'default-case': 'error',
      'no-caller': 'error',
      'no-duplicate-imports': 'error',
      'no-throw-literal': 'error',
      'dot-notation': 'error',
      'max-classes-per-file': ['error', 1],
      'yoda': ['error', 'never'],
      'quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: true }],
      'no-trailing-spaces': 'error',
      'no-multiple-empty-lines': ['error', { max: 1 }],
      'new-parens': 'error',
      'max-len': ['error', { code: 360 }],
    },
  },
  pluginCypress.configs.recommended,
]);
