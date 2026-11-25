import globals from 'globals'
import vuePlugin from 'eslint-plugin-vue'
import vueParser from 'vue-eslint-parser'
import tseslintPlugin from '@typescript-eslint/eslint-plugin'
import tseslintParser from '@typescript-eslint/parser'
// @ts-ignore
import importPlugin from 'eslint-plugin-import'

const tsProjectService = {
    allowDefaultProject: ['.*', 'clarity.config.ts'],
    project: ['tsconfig.eslint.json'],
    defaultProject: 'tsconfig.eslint.json',
}

const tsParserOptions = {
    parser: tseslintParser,
    projectService: tsProjectService,
    extraFileExtensions: ['.vue'],
}

export default [
    {
        ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'dist/**', 'eslint.config.js', 'eslint.config.ts', 'stylelint.config.js', 'commitlint.config.ts', 'public/**'],
    },
    {
        files: ['**/*.js', '**/*.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
            },
            parser: tseslintParser,
            // the same options as for .vue files: with others the project service rebuilds the program on each switch
            // between a .ts and a .vue file, it took minutes and gigabytes
            parserOptions: {
                projectService: tsProjectService,
                extraFileExtensions: ['.vue'],
            },
        },
        plugins: {
            '@typescript-eslint': tseslintPlugin,
            import: importPlugin,
        },
        rules: {
            indent: ['error', 4],
            'prefer-arrow-callback': 'error',
            semi: ['error', 'never'],
            'no-var': 'error',
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/prefer-as-const': 'error',
            'spaced-comment': ['error', 'always'],
            'no-throw-literal': 'error',
            'array-bracket-spacing': ['error', 'never'],
            quotes: ['error', 'single'],
            'arrow-spacing': ['error', { before: true, after: true }],
            '@typescript-eslint/no-empty-function': 'error',
            eqeqeq: ['error', 'always'],
            '@typescript-eslint/ban-ts-comment': 'error',
            'prefer-template': 'error',
            '@typescript-eslint/no-inferrable-types': 'error',
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/consistent-type-definitions': 'error',
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-multi-spaces': 'error',
            'no-trailing-spaces': 'error',
            'no-unreachable': 'error',
            'import/order': ['error', {
                groups: [
                    'builtin',
                    'external',
                    'internal',
                    'parent',
                    'sibling',
                    'index',
                    'object',
                    'type',
                ],
                'newlines-between': 'never',
                alphabetize: { order: 'asc', caseInsensitive: true },
            }],
        },
    },
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                ...tsParserOptions,
                filePath: undefined,
            },
        },
        plugins: {
            vue: vuePlugin,
            '@typescript-eslint': tseslintPlugin,
            import: importPlugin,
        },
        processor: vuePlugin.processors['.vue'],
        rules: {
            'vue/script-indent': ['error', 4, { baseIndent: 1 }],
            'vue/html-indent': ['error', 4],
            'vue/attribute-hyphenation': ['error', 'always'],
            'prefer-arrow-callback': 'error',
            semi: ['error', 'never'],
            'no-var': 'error',
            'no-console': ['error', { allow: ['warn', 'error'] }],
            'no-debugger': 'error',
            '@typescript-eslint/no-unused-vars': 'warn',
            '@typescript-eslint/prefer-as-const': 'error',
            'spaced-comment': ['error', 'always'],
            'no-throw-literal': 'error',
            'array-bracket-spacing': ['error', 'never'],
            quotes: ['error', 'single'],
            'arrow-spacing': ['error', { before: true, after: true }],
            '@typescript-eslint/no-empty-function': 'error',
            eqeqeq: ['error', 'always'],
            '@typescript-eslint/ban-ts-comment': 'error',
            'prefer-template': 'error',
            '@typescript-eslint/no-inferrable-types': 'error',
            '@typescript-eslint/prefer-nullish-coalescing': 'error',
            '@typescript-eslint/prefer-optional-chain': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/no-unnecessary-type-assertion': 'error',
            '@typescript-eslint/consistent-type-definitions': 'error',
            'vue/require-v-for-key': 'error',
            'vue/padding-line-between-blocks': 'error',
            'vue/block-order': ['error', {
                order: ['script', 'template', 'style', 'custom'],
            }],
            'no-eval': 'error',
            'no-implied-eval': 'error',
            'no-multi-spaces': 'error',
            'no-trailing-spaces': 'error',
            'no-unreachable': 'error',
            'import/order': ['error', {
                groups: [
                    'builtin',
                    'external',
                    'internal',
                    'parent',
                    'sibling',
                    'index',
                    'object',
                    'type',
                ],
                'newlines-between': 'never',
                alphabetize: { order: 'asc', caseInsensitive: true },
            }],
        },
    },
]
