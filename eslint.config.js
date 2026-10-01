// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
    {
        // Types générés par `npm run db:types` : jamais modifiés à la main.
        ignores: ['src/app/core/supabase/database.types.ts'],
    },
    {
        files: ['**/*.ts'],
        extends: [eslint.configs.recommended, tseslint.configs.recommended, tseslint.configs.stylistic, angular.configs.tsRecommended],
        processor: angular.processInlineTemplates,
        rules: {
            '@angular-eslint/directive-selector': [
                'error',
                {
                    type: 'attribute',
                    prefix: 'app',
                    style: 'camelCase',
                },
            ],
            '@angular-eslint/component-selector': [
                'error',
                {
                    type: 'element',
                    // `icon-` : icônes reprises de Vristo sous leur nom d'origine (copie directe depuis la référence).
                    prefix: ['app', 'icon'],
                    style: 'kebab-case',
                },
            ],
            // Règles du projet (.claude/rules/angular.md).
            '@angular-eslint/prefer-on-push-component-change-detection': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            'no-console': ['error', { allow: ['warn', 'error'] }],
        },
    },
    {
        files: ['**/*.html'],
        extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
        rules: {
            '@angular-eslint/template/prefer-control-flow': 'error',
        },
    },
]);
