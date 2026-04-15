import CommonConfig from "eslint-config-yscope/CommonConfig.mjs";
import StylisticConfigArray from "eslint-config-yscope/StylisticConfigArray.mjs";
import TsConfigArray from "eslint-config-yscope/TsConfigArray.mjs";


const EslintConfig = [
    {
        ignores: [
            "dist/",
            "node_modules/",
        ],
    },
    CommonConfig,
    ...TsConfigArray,
    ...StylisticConfigArray,
    {
        files: [
            "**/*.ts",
        ],
        rules: {
            "@typescript-eslint/no-floating-promises": [
                "error",
                {
                    allowForKnownSafeCalls: [
                        {
                            from: "package",
                            name: "test",
                            package: "vitest",
                        },
                    ],
                },
            ],
        },
    },
    {
        files: [
            "**/*.test.ts",
            "**/test/*.ts",
        ],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/no-extraneous-class": "off",
            "@typescript-eslint/no-useless-constructor": "off",
            "@stylistic/line-comment-position": "off",
            "@stylistic/no-multiple-empty-lines": "off",
            "class-methods-use-this": "off",
            "func-names": "off",
            "max-classes-per-file": "off",
            "max-lines-per-function": "off",
            "no-empty-function": "off",
            "no-inline-comments": "off",
            "no-magic-numbers": "off",
            "no-undefined": "off",
            "prefer-arrow-callback": "off",
            "prefer-destructuring": "off",
            "sort-keys": "off",
        },
    },
];


export default EslintConfig;
