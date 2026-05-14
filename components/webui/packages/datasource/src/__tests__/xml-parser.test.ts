import {
    describe,
    expect,
    it,
} from "vitest";

import {
    extractHtmlBySelector,
    parseHtmlResponse,
    parseXmlResponse,
} from "../infinity/xml-parser";


describe("parseXmlResponse", () => {
    it("should parse simple XML into records", () => {
        const xml = `<items>
            <item><name>Alice</name><age>30</age></item>
            <item><name>Bob</name><age>25</age></item>
        </items>`;
        const frames = parseXmlResponse(xml, "item");
        expect(frames).toHaveLength(1);
        expect(frames[0]!.length).toBe(2);
        expect(frames[0]!.fields[0]!.name).toBe("name");
        expect(frames[0]!.fields[0]!.values).toEqual(["Alice",
            "Bob"]);
        expect(frames[0]!.fields[1]!.name).toBe("age");
        expect(frames[0]!.fields[1]!.values).toEqual(["30",
            "25"]);
    });

    it("should use root selector for nested elements", () => {
        const xml = `<response><results>
            <row><id>1</id><title>A</title></row>
        </results></response>`;
        const frames = parseXmlResponse(xml, "row");
        expect(frames[0]!.length).toBe(1);
        expect(frames[0]!.fields[0]!.name).toBe("id");
    });

    it("should handle empty XML with no matching elements", () => {
        const xml = "<root></root>";
        const frames = parseXmlResponse(xml, "item");
        expect(frames[0]!.length).toBe(0);
    });

    it("should auto-detect repeating element when no root selector", () => {
        const xml = `<data>
            <entry><x>1</x></entry>
            <entry><x>2</x></entry>
        </data>`;
        const frames = parseXmlResponse(xml);
        expect(frames[0]!.length).toBe(2);
    });

    it("should use column definitions when provided", () => {
        const xml = `<items>
            <item><name>Alice</name><age>30</age></item>
        </items>`;
        const frames = parseXmlResponse(xml, "item", [
            {selector: "name", text: "Host", type: "string"},
        ]);

        expect(frames[0]!.fields[0]!.name).toBe("Host");
    });
});

describe("parseHtmlResponse", () => {
    it("should parse HTML table into records", () => {
        const html = `<table>
            <tr><th>Name</th><th>Age</th></tr>
            <tr><td>Alice</td><td>30</td></tr>
            <tr><td>Bob</td><td>25</td></tr>
        </table>`;
        const frames = parseHtmlResponse(html);
        expect(frames).toHaveLength(1);
        expect(frames[0]!.length).toBe(2);
        expect(frames[0]!.fields[0]!.name).toBe("Name");
        expect(frames[0]!.fields[1]!.name).toBe("Age");
    });

    it("should handle HTML without a table", () => {
        const html = "<div>No table here</div>";
        const frames = parseHtmlResponse(html);
        expect(frames[0]!.length).toBe(0);
    });

    it("should use column definitions when provided", () => {
        const html = `<table>
            <tr><td>Alice</td><td>30</td></tr>
        </table>`;
        const frames = parseHtmlResponse(html, [
            {selector: "0", text: "Name", type: "string"},
            {selector: "1", text: "Age", type: "number"},
        ]);

        expect(frames[0]!.fields[0]!.name).toBe("Name");
        expect(frames[0]!.fields[1]!.values[0]).toBe(30);
    });
});

describe("extractHtmlBySelector", () => {
    it("should extract text from elements matching a tag selector", () => {
        const html = "<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>";
        const results = extractHtmlBySelector(html, "li");
        expect(results).toEqual(["Item 1",
            "Item 2",
            "Item 3"]);
    });

    it("should extract text from elements matching a class selector", () => {
        const html = `<div><span class="name">Alice</span><span class="age">30</span></div>
            <div><span class="name">Bob</span><span class="age">25</span></div>`;
        const results = extractHtmlBySelector(html, ".name");
        expect(results).toEqual(["Alice",
            "Bob"]);
    });

    it("should extract text from elements matching tag.class selector", () => {
        const html = "<div><span class=\"name\">Alice</span><p class=\"name\">Bob</p></div>";
        const results = extractHtmlBySelector(html, "span.name");
        expect(results).toEqual(["Alice"]);
    });

    it("should return empty array when no matches", () => {
        const html = "<div>No matching content</div>";
        const results = extractHtmlBySelector(html, ".missing");
        expect(results).toEqual([]);
    });

    it("should handle nested elements by extracting only direct text", () => {
        const html = "<div class=\"item\">Text <span>nested</span> more</div>";
        const results = extractHtmlBySelector(html, ".item");
        expect(results).toEqual(["Text nested more"]);
    });
});

describe("parseHtmlResponse with CSS selector columns", () => {
    it("should use CSS selectors in column definitions for non-table HTML", () => {
        const html = `<div class="row"><span class="host">web-01</span><span class="status">ok</span></div>
            <div class="row"><span class="host">web-02</span><span class="status">error</span></div>`;
        const frames = parseHtmlResponse(html, [
            {selector: ".host", text: "Host", type: "string"},
            {selector: ".status", text: "Status", type: "string"},
        ]);

        expect(frames[0]!.length).toBe(2);
        expect(frames[0]!.fields[0]!.name).toBe("Host");
        expect(frames[0]!.fields[0]!.values).toEqual(["web-01",
            "web-02"]);
        expect(frames[0]!.fields[1]!.name).toBe("Status");
        expect(frames[0]!.fields[1]!.values).toEqual(["ok",
            "error"]);
    });
});
