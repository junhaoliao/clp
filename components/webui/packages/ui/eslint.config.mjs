import CommonConfig from "eslint-config-yscope/CommonConfig.mjs";
import ReactConfigArray from "eslint-config-yscope/ReactConfigArray.mjs";
import StylisticConfigArray from "eslint-config-yscope/StylisticConfigArray.mjs";
import TsConfigArray, {createTsConfigOverride} from "eslint-config-yscope/TsConfigArray.mjs";


const EslintConfig = [
    {
        ignores: [
            "dist/",
            "node_modules/",
        ],
    },
    CommonConfig,
    ...TsConfigArray,
    createTsConfigOverride(
        [
            "src/**/*.ts",
            "src/**/*.tsx",
        ],
        "./tsconfig.eslint.json"
    ),
    createTsConfigOverride(
        ["vitest.config.ts"],
        "./tsconfig.eslint.json"
    ),
    ...StylisticConfigArray,
    ...ReactConfigArray,
    {
        rules: {
            "new-cap": [
                "error",
                {
                    capIsNewExceptionPattern: "^(Type|Value)\\.",
                },
            ],
        },
    },
    {
        files: [
            "**/*.ts",
            "**/*.tsx",
        ],
        rules: {
            "dot-notation": "off",
            "@typescript-eslint/dot-notation": "error",
        },
    },
];


export default EslintConfig;
