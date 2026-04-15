import CommonConfig from "eslint-config-yscope/CommonConfig.mjs";
import ReactConfigArray from "eslint-config-yscope/ReactConfigArray.mjs";
import StylisticConfigArray from "eslint-config-yscope/StylisticConfigArray.mjs";
import TsConfigArray, {createTsConfigOverride} from "eslint-config-yscope/TsConfigArray.mjs";


const EslintConfig = [
    {
        ignores: [
            "dist/",
            "node_modules/",
            "src/sql-parser/generated",
            "playwright.config.ts",
        ],
    },
    CommonConfig,
    ...TsConfigArray,
    // Override TsConfigArray's default "tsconfig.json" (which has no include)
    // with tsconfig.test.json which includes all of src/ and extends tsconfig.app.json
    createTsConfigOverride(
        [
            "src/**/*.ts",
            "src/**/*.tsx",
        ],
        "./tsconfig.test.json",
    ),
    createTsConfigOverride(
        ["vite.config.ts"],
        "./tsconfig.node.json",
    ),
    ...StylisticConfigArray,
    ...ReactConfigArray,
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
        ],
        rules: {
            "dot-notation": "off",
            "@typescript-eslint/dot-notation": "error",
            // Relax rules that are impractical for React UI code:
            "max-lines": "off",
            "max-lines-per-function": "off",
            "max-statements": "off",
            "max-params": "off",
            "no-magic-numbers": "off",
            "no-nested-ternary": "off",
            "no-undefined": "off",
            "no-void": "off",
            "react/boolean-prop-naming": "off",
            "no-use-before-define": "off",
        },
    },
    {
        files: [
            "**/*.test.ts",
            "**/*.test.tsx",
            "**/test/*.ts",
            "**/test/*.tsx",
        ],
        rules: {
            "@stylistic/array-element-newline": "off",
            "@stylistic/curly-newline": "off",
            "@stylistic/jsx-sort-props": "off",
            "@stylistic/jsx-max-props-per-line": "off",
            "@stylistic/jsx-one-expression-per-line": "off",
            "@stylistic/line-comment-position": "off",
            "@stylistic/lines-around-comment": "off",
            "@stylistic/lines-between-class-members": "off",
            "@stylistic/no-mixed-operators": "off",
            "@stylistic/no-multiple-empty-lines": "off",
            "@stylistic/object-curly-newline": "off",
            "@stylistic/space-before-function-paren": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-confusing-void-expression": "off",
            "@typescript-eslint/no-dynamic-delete": "off",
            "@typescript-eslint/no-extraneous-class": "off",
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/no-shadow": "off",
            "@typescript-eslint/no-unnecessary-condition": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unnecessary-type-assertion": "off",
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-useless-constructor": "off",
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/unbound-method": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "class-methods-use-this": "off",
            "func-names": "off",
            "import-newlines/enforce": "off",
            "import/newline-after-import": "off",
            "max-classes-per-file": "off",
            "max-lines": "off",
            "max-lines-per-function": "off",
            "max-statements": "off",
            "new-cap": "off",
            "no-constant-binary-expression": "off",
            "no-duplicate-imports": "off",
            "no-empty-function": "off",
            "no-inline-comments": "off",
            "no-magic-numbers": "off",
            "no-promise-executor-return": "off",
            "no-undefined": "off",
            "no-underscore-dangle": "off",
            "object-shorthand": "off",
            "prefer-arrow-callback": "off",
            "prefer-destructuring": "off",
            "react/boolean-prop-naming": "off",
            "react/display-name": "off",
            "react/jsx-no-useless-fragment": "off",
            "sort-keys": "off",
        },
    },
];


export default EslintConfig;
