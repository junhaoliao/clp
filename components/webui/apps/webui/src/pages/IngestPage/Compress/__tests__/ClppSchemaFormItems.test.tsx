import {
    render,
    screen,
} from "@testing-library/react";
import {Form} from "antd";
import {
    describe,
    expect,
    it,
    vi,
} from "vitest";


vi.mock("@tanstack/react-query", async () => {
    const actual = await vi.importActual("@tanstack/react-query");
    return {
        ...actual,
        useQuery: () => ({
            data: [
                {id: "schema-1", name: "Test Schema", content: ":timestamp:string\n:level:string"},
                {id: "schema-2", name: "Another Schema", content: ":msg:string"},
            ],
            isLoading: false,
        }),
    };
});

vi.mock("@monaco-editor/react", () => ({
    Editor: ({value, onChange}: {value?: string; onChange?: (v: string) => void}) => (
        <textarea
            data-testid={"monaco-editor"}
            value={value ?? ""}
            onChange={(e) => {
                onChange?.(e.target.value);
            }}
        />
    ),
}));

vi.mock("hono/client", () => ({
    hc: () => ({}),
}));

vi.mock("@/features/clpp/components/schema-monaco-editor/monaco-loader", () => ({}));


const ClppSchemaFormItems = (await import("../ClppSchemaFormItems")).default;


describe("ClppSchemaFormItems", () => {
    it("should render the unstructured logs schema label", () => {
        render(
            <Form>
                <ClppSchemaFormItems/>
            </Form>,
        );
        expect(screen.getByText("Unstructured logs processor")).toBeTruthy();
    });

    it("should render the Ant Design Select", () => {
        render(
            <Form>
                <ClppSchemaFormItems/>
            </Form>,
        );
        const select = screen.getByRole("combobox");
        expect(select).toBeTruthy();
    });

    it("should not render the Monaco editor by default", () => {
        render(
            <Form>
                <ClppSchemaFormItems/>
            </Form>,
        );
        expect(screen.queryByTestId("monaco-editor")).toBeNull();
    });
});
