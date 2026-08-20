import { defineConfig, globalIgnores } from 'eslint/config';
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import unicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default defineConfig([
    globalIgnores([
        // Build output, dependencies and local tooling state.
        '**/dist/**',
        '**/build/**',
        '**/node_modules/**',
        '**/coverage/**',
        '.claude/**',

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
        'sustainability-atlas/**',
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
    ]),
    {
        extends: [
            eslint.configs.recommended,
            tseslint.configs.recommended,
        ],
        plugins: { '@stylistic': stylistic, unicorn },
        languageOptions: {
            sourceType: 'module',
            globals: globals.node,
        },
        rules: {
            // TSLint rules with no equivalent in the presets above.
            'eqeqeq': ['error', 'always'],
            'curly': ['error', 'all'],
            'no-var': 'error',
            'no-duplicate-imports': 'error',
            'no-throw-literal': 'error',
            '@typescript-eslint/prefer-for-of': 'error',
            '@typescript-eslint/unified-signatures': 'error',
            '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],
            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': 'error',
            'unicorn/filename-case': ['error', { case: 'kebabCase' }], // file names only, not identifiers

            // Unicorn rules are opted into individually rather than via a preset: the presets
            // enable ~200 rules, several of whose fixers emit incorrect code.
            'unicorn/consistent-existence-index-check': 'error',
            'unicorn/escape-case': 'error',
            'unicorn/new-for-builtins': 'error',
            'unicorn/no-console-spaces': 'error',
            'unicorn/no-for-each': 'error',
            'unicorn/no-negated-comparison': 'error',
            'unicorn/no-single-promise-in-promise-methods': 'error',
            'unicorn/no-subtraction-comparison': 'error',
            'unicorn/no-typeof-undefined': 'error',
            'unicorn/no-unnecessary-await': 'error',
            'unicorn/no-unnecessary-global-this': 'error',
            'unicorn/no-unnecessary-nested-ternary': 'error',
            'unicorn/no-unnecessary-slice-end': 'error',
            'unicorn/no-useless-collection-argument': 'error',
            'unicorn/no-useless-continue': 'error',
            'unicorn/no-useless-fallback-in-spread': 'error',
            'unicorn/no-useless-promise-resolve-reject': 'error',
            'unicorn/no-useless-spread': 'error',
            'unicorn/no-useless-undefined': 'error',
            'unicorn/no-zero-fractions': 'error',
            'unicorn/number-literal-case': 'error',
            'unicorn/prefer-array-find': 'error',
            'unicorn/prefer-array-flat': 'error',
            'unicorn/prefer-array-flat-map': 'error',
            'unicorn/prefer-array-from-map': 'error',
            'unicorn/prefer-array-some': 'error',
            'unicorn/prefer-at': 'error',
            'unicorn/prefer-date-now': 'error',
            'unicorn/prefer-direct-iteration': 'error',
            'unicorn/prefer-includes': 'error',
            'unicorn/prefer-iterable-in-constructor': 'error',
            'unicorn/prefer-math-min-max': 'error',
            'unicorn/prefer-native-coercion-functions': 'error',
            'unicorn/prefer-node-protocol': 'error',
            'unicorn/prefer-number-properties': 'error',
            'unicorn/prefer-object-from-entries': 'error',
            'unicorn/prefer-object-iterable-methods': 'error',
            'unicorn/prefer-optional-catch-binding': 'error',
            'unicorn/prefer-reflect-apply': 'error',
            'unicorn/prefer-set-has': 'error',
            'unicorn/prefer-string-replace-all': 'error',
            'unicorn/prefer-string-slice': 'error',
            'unicorn/prefer-type-error': 'error',
            'unicorn/require-array-join-separator': 'error',
            'unicorn/text-encoding-identifier-case': 'error',
            'unicorn/throw-new-error': 'error',

            '@stylistic/quotes': ['error', 'single', { avoidEscape: true, allowTemplateLiterals: 'always' }],
            '@stylistic/no-trailing-spaces': 'error',
            '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
            '@stylistic/new-parens': 'error',
            '@stylistic/max-len': ['error', { code: 360 }],

            // Preset rules TSLint deliberately left off.
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-empty-function': 'off',
            'no-undef': 'off', // TypeScript already reports undefined identifiers
            '@typescript-eslint/no-unused-vars': ['error', {
                args: 'after-used',
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_',
                caughtErrors: 'none',
            }],
        },
    },
]);
