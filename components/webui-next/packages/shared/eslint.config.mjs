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
            "**/*.test.ts",
        ],
        rules: {
            "no-duplicate-imports": "off",
            "no-magic-numbers": "off",
            "sort-keys": "off",
        },
    },
];


export default EslintConfig;
