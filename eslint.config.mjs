import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default tseslint.config(
    {
        ignores: [
            // Build output and dependencies.
            '**/dist/**',
            '**/build/**',
            '**/node_modules/**',
            '**/coverage/**',

            // Tests were not linted under TSLint; lint them in a follow-up.
            '**/tests/**',
            '**/test/**',
            '**/*.{test,spec}.{ts,mts,js,mjs,cts,cjs}',

            // Root-level scripts and config files (not part of any package source).
            '*.mjs',
            '*.js',
            '**/*.config.js',
            '**/*.config.mjs',

            // Out of scope: frontends, framework apps, contracts, and non-source dirs.
            'carbon-atlas/**',
            'frontend/**',
            'indexer-frontend/**',
            'indexer-web-proxy/**',
            'web-proxy/**',
            'contracts/**',
            'demia/**',
            'e2e-tests/**',
            'load-tests/**',
            'docs/**',
            'grafana/**',
            'k8s-manifests/**',
            'vault/**',
            'configs/**',
            'Methodology Library/**',
            'hedera-guardian-ai-toolkit/**',

            // Not enforced in CI before; re-enable each as it is cleaned up.
            'ai-service/**',
            'analytics-service/**',
            'application-events/**',
            'guardian-cli/**',
            'indexer-api-gateway/**',
            'indexer-common/**',
            'indexer-interfaces/**',
            'indexer-service/**',
            'indexer-worker-service/**',
            'mrv-sender/**',
            'topic-viewer/**',
            'tree-viewer/**',
        ],
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    {
        plugins: { '@stylistic': stylistic, unicorn },
        languageOptions: {
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: {
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/no-unused-vars': ['error', {
                args: 'after-used',
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
            '@typescript-eslint/prefer-for-of': 'error',
            '@typescript-eslint/unified-signatures': 'error',
            '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],
            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': 'error',
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
            'no-irregular-whitespace': 'off',
            'no-undef': 'off', // TypeScript already reports undefined identifiers
            '@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
            '@stylistic/new-parens': 'error',
            '@stylistic/max-len': ['error', { code: 360 }],
            'unicorn/filename-case': ['error', { case: 'kebabCase' }], // file names only, not identifiers
        },
    },
);
