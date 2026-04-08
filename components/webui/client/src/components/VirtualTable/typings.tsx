import type {TableProps} from "antd";


/**
 * Number of pixels to scroll vertically when using keyboard arrow navigation.
 */
const SCROLL_INCREMENT = 32;

/**
 * CSS selector for the virtual table body element.
 */
const VIRTUAL_TABLE_HOLDER_SELECTOR = ".ant-table-tbody-virtual-holder";

/**
 * Scroll info passed to the onVirtualScroll callback.
 */
interface VirtualScrollInfo {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
}

/**
 * Antd Table props with virtual omitted since set by VirtualTable, plus an optional callback for
 * scroll events on the virtual scroll container.
 */
type VirtualTableProps<RecordType> = Omit<TableProps<RecordType>, "virtual"> & {
    onVirtualScroll?: (info: VirtualScrollInfo) => void;
};

export {
    SCROLL_INCREMENT,
    VIRTUAL_TABLE_HOLDER_SELECTOR,
};
export type {VirtualScrollInfo, VirtualTableProps};
