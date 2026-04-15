import React from "react";

import {Button} from "../../../components/ui/button";
import {Input} from "../../../components/ui/input";


/**
 * Query input with case sensitivity toggle.
 *
 * @param root0
 * @param root0.isCaseSensitive
 * @param root0.disabled
 * @param root0.inputRef
 * @param root0.onCaseSensitiveChange
 * @param root0.onQueryChange
 * @param root0.query
 */
const QueryInput = ({
    isCaseSensitive,
    disabled,
    inputRef,
    onCaseSensitiveChange,
    onQueryChange,
    query,
}: {
    disabled: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    isCaseSensitive: boolean;
    onCaseSensitiveChange: (v: boolean) => void;
    onQueryChange: (v: string) => void;
    query: string;
}) => (
    <div className={"relative flex-1 min-w-[200px]"}>
        <Input
            className={"pr-12"}
            disabled={disabled}
            placeholder={"Enter your query"}
            ref={inputRef}
            value={query}
            onChange={(e) => {
                onQueryChange(e.target.value);
            }}/>
        <Button
            size={"icon"}
            type={"button"}
            className={
                "absolute right-1.5 top-1/2 -translate-y-1/2 h-auto " +
                "rounded px-2 py-0.5 text-xs border-transparent " +
                "hover:bg-accent"
            }
            title={isCaseSensitive ?
                "Case Sensitive" :
                "Case Insensitive"}
            variant={isCaseSensitive ?
                "outline" :
                "ghost"}
            onClick={() => {
                onCaseSensitiveChange(!isCaseSensitive);
            }}
        >
            {isCaseSensitive ?
                "Aa" :
                "aa"}
        </Button>
    </div>
);


export {QueryInput};
