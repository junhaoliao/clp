import {
    render,
    screen,
} from "@testing-library/react";
import {
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {PanelChrome} from "../panel-chrome";


describe("PanelChrome", () => {
    it("should render loading state", () => {
        render(
            <PanelChrome state={"loading"}>
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.getByLabelText("Loading panel data")).toBeTruthy();
        expect(screen.queryByText("content")).toBeNull();
    });

    it("should render error state", () => {
        render(
            <PanelChrome
                errorMessage={"Query failed"}
                state={"error"}
            >
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.getByText("Query failed")).toBeTruthy();
        expect(screen.queryByText("content")).toBeNull();
    });

    it("should render empty state", () => {
        render(
            <PanelChrome state={"empty"}>
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.getByText("No data")).toBeTruthy();
        expect(screen.queryByText("content")).toBeNull();
    });

    it("should render children in data state", () => {
        render(
            <PanelChrome state={"data"}>
                <div>chart-content</div>
            </PanelChrome>,
        );
        expect(screen.getByText("chart-content")).toBeTruthy();
    });

    it("should show rowsTruncated warning in data state", () => {
        render(
            <PanelChrome
                rowsTruncated={true}
                state={"data"}
            >
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.getByText(/Results truncated/)).toBeTruthy();
    });

    it("should not show rowsTruncated warning when rowsTruncated is false", () => {
        render(
            <PanelChrome
                rowsTruncated={false}
                state={"data"}
            >
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.queryByText(/Results truncated/)).toBeNull();
    });

    it("should show slow query indicator in loading state", () => {
        render(
            <PanelChrome
                isSlowQuery={true}
                state={"loading"}
            >
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.getByText("Query is taking longer than usual...")).toBeTruthy();
    });

    it("should not show slow query indicator when isSlowQuery is false", () => {
        render(
            <PanelChrome
                isSlowQuery={false}
                state={"loading"}
            >
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.queryByText("Query is taking longer than usual...")).toBeNull();
    });

    it("should show retry button when onRetry is provided in error state", () => {
        const onRetry = vi.fn();
        render(
            <PanelChrome
                errorMessage={"fail"}
                state={"error"}
                onRetry={onRetry}
            >
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.getByText("Retry")).toBeTruthy();
    });

    it("should not show retry button when onRetry is absent in error state", () => {
        render(
            <PanelChrome
                errorMessage={"fail"}
                state={"error"}
            >
                <div>content</div>
            </PanelChrome>,
        );
        expect(screen.queryByText("Retry")).toBeNull();
    });
});

describe("PanelChrome — isRefetching / LinearProgressBar", () => {
    it("should show linear progress bar when isRefetching and state is data", () => {
        const {container} = render(
            <PanelChrome
                isRefetching={true}
                state={"data"}
            >
                <div>content</div>
            </PanelChrome>,
        );

        expect(container.querySelector(".animate-indeterminate-progress")).toBeTruthy();
        expect(screen.getByText("content")).toBeTruthy();
    });

    it("should not show progress bar when isRefetching is false", () => {
        const {container} = render(
            <PanelChrome
                isRefetching={false}
                state={"data"}
            >
                <div>content</div>
            </PanelChrome>,
        );

        expect(container.querySelector(".animate-indeterminate-progress")).toBeNull();
    });

    it("should not show progress bar when isRefetching is undefined", () => {
        const {container} = render(
            <PanelChrome state={"data"}>
                <div>content</div>
            </PanelChrome>,
        );

        expect(container.querySelector(".animate-indeterminate-progress")).toBeNull();
    });

    it("should not show progress bar when isRefetching but state is loading (skeleton takes precedence)", () => {
        const {container} = render(
            <PanelChrome
                isRefetching={true}
                state={"loading"}
            >
                <div>content</div>
            </PanelChrome>,
        );

        expect(container.querySelector(".animate-indeterminate-progress")).toBeNull();
        expect(screen.getByLabelText("Loading panel data")).toBeTruthy();
    });

    it("should not show progress bar when isRefetching but state is error", () => {
        const {container} = render(
            <PanelChrome
                errorMessage={"fail"}
                isRefetching={true}
                state={"error"}
            >
                <div>content</div>
            </PanelChrome>,
        );

        expect(container.querySelector(".animate-indeterminate-progress")).toBeNull();
    });

    it("should not show progress bar when isRefetching but state is empty", () => {
        const {container} = render(
            <PanelChrome
                isRefetching={true}
                state={"empty"}
            >
                <div>content</div>
            </PanelChrome>,
        );

        expect(container.querySelector(".animate-indeterminate-progress")).toBeNull();
    });

    it("should keep content visible while progress bar is shown during refetch", () => {
        render(
            <PanelChrome
                isRefetching={true}
                state={"data"}
            >
                <div data-testid={"panel-content"}>my-chart</div>
            </PanelChrome>,
        );
        expect(screen.getByTestId("panel-content")).toBeTruthy();
        expect(screen.getByText("my-chart")).toBeTruthy();
    });
});
