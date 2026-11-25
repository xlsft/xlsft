export default {
    extends: 'stylelint-config-recommended',
    rules: {
        'color-no-invalid-hex': true,
        'at-rule-no-unknown': [true, { ignoreAtRules: ['theme', 'apply', 'layer', 'tailwind', 'responsive', 'variants', 'screen', 'utility', 'custom-variant'] }],

        'at-rule-prelude-no-invalid': [true, { ignoreAtRules: ['theme', 'apply', 'layer', 'tailwind', 'responsive', 'variants', 'screen', 'utility', 'custom-variant'] }],

        'nesting-selector-no-missing-scoping-root': [true, { ignoreAtRules: ['utility'] }],
    },
}