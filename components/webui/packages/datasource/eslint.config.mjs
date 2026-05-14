import CommonConfig from "eslint-config-yscope/CommonConfig.mjs";
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
        ],
        "./tsconfig.eslint.json"
    ),
    createTsConfigOverride(
        ["vitest.config.ts"],
        "./tsconfig.eslint.json"
    ),
    ...StylisticConfigArray,
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
];


export default EslintConfig;
