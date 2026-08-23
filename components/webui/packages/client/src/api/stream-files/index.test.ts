import {QUERY_JOB_TYPE} from "@webui/common/query";
import tap, {type Test} from "tap";

import {mapExtractJobType} from "./index";


await tap.test("maps IR extraction job types", (test: Test) => {
    test.equal(mapExtractJobType(QUERY_JOB_TYPE.EXTRACT_IR), "ExtractIr");
    test.end();
});

await tap.test("maps JSON extraction job types", (test: Test) => {
    test.equal(mapExtractJobType(QUERY_JOB_TYPE.EXTRACT_JSON), "ExtractJson");
    test.end();
});

await tap.test("rejects non-extraction job types at runtime", (test: Test) => {
    test.throws(
        () => mapExtractJobType(
            QUERY_JOB_TYPE.SEARCH_OR_AGGREGATION as QUERY_JOB_TYPE.EXTRACT_IR
        ),
        {message: "Unsupported extract job type: 0"}
    );
    test.end();
});
