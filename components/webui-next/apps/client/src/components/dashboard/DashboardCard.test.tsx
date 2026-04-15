import {
    render,
    screen,
} from "@testing-library/react";
import {
    describe,
    expect,
    test,
} from "vitest";

import {DashboardCard} from "./DashboardCard";


describe("DashboardCard", () => {
    test("renders title and children", () => {
        render(
            <DashboardCard title={"Space Savings"}>
                <p>97.39%</p>
            </DashboardCard>
        );

        expect(screen.getByText("Space Savings")).toBeInTheDocument();
        expect(screen.getByText("97.39%")).toBeInTheDocument();
    });

    test("renders without children", () => {
        render(<DashboardCard title={"Empty Card"}/>);

        expect(screen.getByText("Empty Card")).toBeInTheDocument();
    });

    test("shows loading skeleton when isLoading is true", () => {
        const {container} = render(
            <DashboardCard
                isLoading={true}
                title={"Loading Card"}
            >
                <p>Hidden content</p>
            </DashboardCard>
        );

        // Children should not be visible when loading
        expect(screen.queryByText("Hidden content")).not.toBeInTheDocument();

        // Loading skeleton should be present
        expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    });

    test("applies custom backgroundColor", () => {
        const {container} = render(
            <DashboardCard
                backgroundColor={"rgb(240, 248, 255)"}
                title={"Styled Card"}
            >
                <p>Content</p>
            </DashboardCard>
        );

        expect(container.firstChild).toHaveStyle({backgroundColor: "rgb(240, 248, 255)"});
    });

    test("applies custom titleColor", () => {
        render(
            <DashboardCard
                title={"Colored Title"}
                titleColor={"rgb(255, 0, 0)"}
            >
                <p>Content</p>
            </DashboardCard>
        );

        expect(screen.getByText("Colored Title")).toHaveStyle({color: "rgb(255, 0, 0)"});
    });

    test("applies custom className", () => {
        const {container} = render(
            <DashboardCard
                className={"custom-class"}
                title={"Custom"}
            >
                <p>Content</p>
            </DashboardCard>
        );

        expect(container.firstChild).toHaveClass("custom-class");
    });

    test("does not show loading state by default", () => {
        const {container} = render(
            <DashboardCard title={"Normal Card"}>
                <p>Visible content</p>
            </DashboardCard>
        );

        expect(screen.getByText("Visible content")).toBeInTheDocument();
        expect(container.querySelector(".animate-pulse")).not.toBeInTheDocument();
    });
});
