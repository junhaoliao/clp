import React from "react";

import {Nullable} from "@webui/common/utility-types";
import {
    Check,
    X,
} from "lucide-react";

import {
    QUERY_LOADING_STATE,
    QUERY_LOADING_STATE_DESCRIPTIONS,
    QUERY_LOADING_STATE_VALUES,
} from "../../typings/query";


interface LoadingStepProps {
    description: string;
    isActive: boolean;
    isCompleted: boolean;
    isError: boolean;
    label: string;
    stepIndex: number;
    isLast: boolean;
}

/**
 * Returns the CSS class name for a step indicator circle.
 *
 * @param isActive Whether the step is currently active.
 * @param isCompleted Whether the step is completed.
 * @param isError Whether the step is in an error state.
 * @return The class name string.
 */
const getIndicatorClassName = (
    isActive: boolean,
    isCompleted: boolean,
    isError: boolean,
): string => {
    const base = [
        "flex h-9 w-9 shrink-0 items-center justify-center",
        "rounded-full border-2 text-sm font-semibold transition-colors",
    ].join(" ");

    if (isError) {
        return `${base} border-red-500 bg-red-500 text-white`;
    }

    if (isCompleted) {
        return `${base} border-primary bg-primary text-primary-foreground`;
    }

    if (isActive) {
        return `${base} border-primary bg-primary/10 text-primary`;
    }

    return `${base} border-muted-foreground/30 bg-background text-muted-foreground/50`;
};

/**
 * Returns the CSS class name for a step label.
 *
 * @param isActive Whether the step is currently active.
 * @param isCompleted Whether the step is completed.
 * @param isError Whether the step is in an error state.
 * @return The class name string.
 */
const getLabelClassName = (
    isActive: boolean,
    isCompleted: boolean,
    isError: boolean,
): string => {
    const base = "text-sm font-semibold leading-none";

    if (isError) {
        return `${base} text-red-600`;
    }

    if (isCompleted || isActive) {
        return `${base} text-foreground`;
    }

    return `${base} text-muted-foreground/50`;
};

/**
 * Returns the CSS class name for a step description.
 *
 * @param isActive Whether the step is currently active.
 * @param isCompleted Whether the step is completed.
 * @param isError Whether the step is in an error state.
 * @return The class name string.
 */
const getDescriptionClassName = (
    isActive: boolean,
    isCompleted: boolean,
    isError: boolean,
): string => {
    const base = "mt-1.5 text-xs leading-relaxed";

    if (isError) {
        return `${base} text-red-500`;
    }

    if (isCompleted || isActive) {
        return `${base} text-muted-foreground`;
    }

    return `${base} text-muted-foreground/40`;
};

/**
 * Renders the content inside a step indicator circle.
 *
 * @param isError
 * @param isCompleted
 * @param stepIndex
 * @return The step indicator content.
 */
const renderStepContent = (
    isError: boolean,
    isCompleted: boolean,
    stepIndex: number,
): React.ReactNode => {
    if (isError) {
        return <X className={"h-4 w-4"}/>;
    }

    if (isCompleted) {
        return <Check className={"h-4 w-4"}/>;
    }

    return stepIndex + 1;
};

/**
 * Renders a single step in the loading stepper.
 *
 * @param root0 The step props.
 * @param root0.description
 * @param root0.isActive
 * @param root0.isCompleted
 * @param root0.isError
 * @param root0.label
 * @param root0.stepIndex
 * @param root0.isLast
 * @return The step element.
 */
const LoadingStep = ({
    description,
    isActive,
    isCompleted,
    isError,
    label,
    stepIndex,
    isLast,
}: LoadingStepProps) => {
    return (
        <div className={"flex gap-4"}>
            {/* Indicator column: circle + connecting line */}
            <div className={"flex flex-col items-center"}>
                <div className={getIndicatorClassName(isActive, isCompleted, isError)}>
                    {renderStepContent(isError, isCompleted, stepIndex)}
                </div>
                {!isLast && (
                    <div
                        style={{minHeight: "2rem"}}
                        className={`
                            w-0.5 flex-1 transition-colors
                            ${isCompleted ?
                        "bg-primary" :
                        "bg-muted-foreground/20"}
                        `}/>
                )}
            </div>

            {/* Text column */}
            <div className={"pb-8"}>
                <p className={getLabelClassName(isActive, isCompleted, isError)}>
                    {label}
                </p>
                <p className={getDescriptionClassName(isActive, isCompleted, isError)}>
                    {description}
                </p>
            </div>
        </div>
    );
};

interface LoadingProps {
    currentState: QUERY_LOADING_STATE;
    errorMsg: Nullable<string>;
}

/**
 * Displays the status of a pending query job with a vertical stepper.
 *
 * @param root0 The loading props.
 * @param root0.currentState
 * @param root0.errorMsg
 * @return The loading page element.
 */
const Loading = ({
    currentState,
    errorMsg,
}: LoadingProps) => {
    const currentIdx = QUERY_LOADING_STATE_VALUES.indexOf(currentState);
    const hasError = null !== errorMsg;

    return (
        <div className={"flex h-full flex-col items-center justify-center bg-background"}>
            {/* Progress bar */}
            <div className={"absolute top-0 left-0 right-0"}>
                <div className={"h-1 w-full bg-muted"}>
                    <div
                        className={`h-full transition-all duration-500 ease-out ${
                            hasError ?
                                "bg-red-500" :
                                "bg-primary"
                        }`}
                        style={{
                            width: hasError ?
                                "100%" :
                                `${((currentIdx + 1) / QUERY_LOADING_STATE_VALUES.length) * 100}%`,
                        }}/>
                </div>
            </div>

            {/* Stepper card */}
            <div className={"w-full max-w-md rounded-xl border bg-card p-6 shadow-sm"}>
                <h2 className={"mb-6 text-lg font-semibold text-card-foreground"}>
                    Loading Log Viewer
                </h2>

                <div className={"flex flex-col"}>
                    {QUERY_LOADING_STATE_VALUES.map((state, idx) => {
                        const isActive = (currentState === state);
                        const isCompleted = (idx < currentIdx);
                        const stateInfo = QUERY_LOADING_STATE_DESCRIPTIONS[state];
                        const isLast = idx === QUERY_LOADING_STATE_VALUES.length - 1;

                        return (
                            <React.Fragment key={state}>
                                <LoadingStep
                                    description={stateInfo.description}
                                    isActive={isActive}
                                    isCompleted={isCompleted}
                                    isError={false}
                                    isLast={isLast && !hasError}
                                    label={stateInfo.label}
                                    stepIndex={idx}/>
                                {isActive && hasError && (
                                    <LoadingStep
                                        description={errorMsg as string}
                                        isActive={isActive}
                                        isCompleted={false}
                                        isError={true}
                                        isLast={true}
                                        label={"Error"}
                                        stepIndex={idx}/>
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Loading;
