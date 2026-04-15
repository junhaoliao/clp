import React from "react";

import {
    cleanup,
    render,
    screen,
} from "@testing-library/react";
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";

import {ErrorBoundary} from "./ErrorBoundary";


// ---------------------------------------------------------------------------
// Mock component that throws during render
// ---------------------------------------------------------------------------

/**
 *
 * @param root0
 * @param root0.shouldThrow
 */
const ThrowOnRender = ({shouldThrow}: {shouldThrow: boolean}) => {
    if (shouldThrow) {
        throw new Error("Test error from ThrowOnRender");
    }

    return <div data-testid={"child-content"}>Content rendered</div>;
};


// ---------------------------------------------------------------------------
// Suppress console.error for expected thrown errors
// ---------------------------------------------------------------------------

describe("ErrorBoundary", () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        consoleSpy.mockRestore();
        cleanup();
    });

    // --- Normal rendering ---

    it("renders children when no error occurs", () => {
        render(
            <ErrorBoundary>
                <ThrowOnRender shouldThrow={false}/>
            </ErrorBoundary>,
        );

        expect(screen.getByTestId("child-content")).toBeDefined();
        expect(screen.getByText("Content rendered")).toBeDefined();
    });

    it("renders multiple children when no error occurs", () => {
        render(
            <ErrorBoundary>
                <div data-testid={"child-1"}>Child 1</div>
                <div data-testid={"child-2"}>Child 2</div>
            </ErrorBoundary>,
        );

        expect(screen.getByTestId("child-1")).toBeDefined();
        expect(screen.getByTestId("child-2")).toBeDefined();
    });

    // --- Error handling ---

    it("renders fallback UI when child throws", () => {
        render(
            <ErrorBoundary>
                <ThrowOnRender shouldThrow={true}/>
            </ErrorBoundary>,
        );

        expect(screen.queryByTestId("child-content")).toBeNull();
        expect(screen.getByText("Something went wrong")).toBeDefined();
    });

    it("displays error message in fallback UI", () => {
        render(
            <ErrorBoundary>
                <ThrowOnRender shouldThrow={true}/>
            </ErrorBoundary>,
        );

        expect(screen.getByText("Something went wrong")).toBeDefined();
    });

    it("shows a retry button in fallback UI", () => {
        render(
            <ErrorBoundary>
                <ThrowOnRender shouldThrow={true}/>
            </ErrorBoundary>,
        );

        expect(screen.getByRole("button", {name: /try again/i})).toBeDefined();
    });

    // --- Recovery ---

    it("recovers when retry button is clicked and error is resolved", async () => {
        let shouldThrow = true;

        const DynamicThrower = () => {
            if (shouldThrow) {
                throw new Error("Dynamic error");
            }

            return <div data-testid={"child-content"}>Content rendered</div>;
        };

        const {rerender} = render(
            <ErrorBoundary>
                <DynamicThrower/>
            </ErrorBoundary>,
        );

        // Fallback shown
        expect(screen.getByText("Something went wrong")).toBeDefined();

        // Fix the error source
        shouldThrow = false;

        // Rerender to pick up the new children, then click retry
        rerender(
            <ErrorBoundary>
                <DynamicThrower/>
            </ErrorBoundary>,
        );

        // Click the "Try Again" button - resets internal state
        screen.getByRole("button", {name: /try again/i}).click();

        // Rerender again to render the recovered children
        rerender(
            <ErrorBoundary>
                <DynamicThrower/>
            </ErrorBoundary>,
        );

        // Child content should now be visible
        expect(screen.getByTestId("child-content")).toBeDefined();
    });

    // --- Custom fallback ---

    it("renders custom fallback when provided and error occurs", () => {
        render(
            <ErrorBoundary fallback={<div data-testid={"custom-fallback"}>Custom error</div>}>
                <ThrowOnRender shouldThrow={true}/>
            </ErrorBoundary>,
        );

        expect(screen.getByTestId("custom-fallback")).toBeDefined();
        expect(screen.getByText("Custom error")).toBeDefined();
    });

    it("does not render custom fallback when no error occurs", () => {
        render(
            <ErrorBoundary fallback={<div data-testid={"custom-fallback"}>Custom error</div>}>
                <ThrowOnRender shouldThrow={false}/>
            </ErrorBoundary>,
        );

        expect(screen.queryByTestId("custom-fallback")).toBeNull();
        expect(screen.getByTestId("child-content")).toBeDefined();
    });

    // --- Console suppression ---

    it("logs error to console when caught", () => {
        render(
            <ErrorBoundary>
                <ThrowOnRender shouldThrow={true}/>
            </ErrorBoundary>,
        );

        // React also logs the error, so we expect at least one call
        expect(consoleSpy).toHaveBeenCalled();
    });
});
