import React, {
    useCallback,
    useEffect,
    useRef,
} from "react";

import {Table} from "antd";

import {
    SCROLL_INCREMENT,
    VIRTUAL_TABLE_HOLDER_SELECTOR,
    type VirtualTableProps,
} from "./typings";


/**
 * Virtual table that supports keyboard navigation and scroll events on the virtual scroll
 * container.
 *
 * @param props
 * @param props.onVirtualScroll
 * @param props.tableProps
 * @return
 */
const VirtualTable = <RecordType extends object = Record<string, unknown>>({
    onVirtualScroll,
    ...tableProps
}: VirtualTableProps<RecordType>) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (null === containerRef.current || "undefined" === typeof onVirtualScroll) {
            return () => {};
        }

        const scrollNode = containerRef.current.querySelector<HTMLElement>(
            VIRTUAL_TABLE_HOLDER_SELECTOR
        );

        if (null === scrollNode) {
            return () => {};
        }

        const emitScrollInfo = () => {
            const {scrollTop, scrollHeight, clientHeight} = scrollNode;
            onVirtualScroll({scrollTop, scrollHeight, clientHeight});
        };

        scrollNode.addEventListener("scroll", emitScrollInfo);

        // Fire immediately so the parent can trigger loadMore if content fits the viewport.
        emitScrollInfo();

        return () => {
            scrollNode.removeEventListener("scroll", emitScrollInfo);
        };
    }, [onVirtualScroll]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        if (null === containerRef.current) {
            return;
        }

        const scrollNode = containerRef.current.querySelector<HTMLElement>(
            VIRTUAL_TABLE_HOLDER_SELECTOR
        );

        if (null === scrollNode) {
            return;
        }

        const visibleTableHeight = scrollNode.clientHeight;
        let {scrollTop} = scrollNode;

        switch (e.key) {
            case "ArrowDown":
                scrollTop += SCROLL_INCREMENT;
                break;
            case "ArrowUp":
                // Prevent scrolling past the top.
                scrollTop = Math.max(scrollTop - SCROLL_INCREMENT, 0);
                break;
            case "PageDown":
                scrollTop += visibleTableHeight;
                break;
            case "PageUp":
                // Prevent scrolling past the top.
                scrollTop = Math.max(scrollTop - visibleTableHeight, 0);
                break;
            case "Home":
                scrollTop = 0;
                break;
            case "End":
                // Scroll to the bottom of the table.
                scrollTop = Number.MAX_SAFE_INTEGER;
                break;
            default:
                return;
        }

        scrollNode.scrollTop = scrollTop;
        e.preventDefault();
    }, []);

    return (
        <div
            ref={containerRef}
            style={{outline: "none"}}
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            <Table<RecordType>
                virtual={true}
                {...tableProps}/>
        </div>
    );
};

export default VirtualTable;
