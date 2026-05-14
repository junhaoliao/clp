import {
    useCallback,
    useEffect,
} from "react";

import {Combobox} from "@base-ui/react/combobox";
import {useQuery} from "@tanstack/react-query";
import {CLP_DEFAULT_DATASET_NAME} from "@webui/common/config";
import {message} from "antd";

import {SETTINGS_MAX_DATASETS_PER_QUERY} from "../../../../config";
import useSearchStore from "../../SearchState";
import {SEARCH_UI_STATE} from "../../SearchState/typings";
import {fetchDatasetNames} from "./sql";


interface DatasetItem {
    label: string;
    value: string;
}

interface DatasetSelectProps {
    isMultiSelect: boolean;
}

/**
 * Renders a dataset selector component that allows users to select from available datasets.
 *
 * @param props
 * @param props.isMultiSelect
 * @return
 */
const DatasetSelect = ({isMultiSelect}: DatasetSelectProps) => {
    const datasets = useSearchStore((state) => state.selectedDatasets);
    const searchUiState = useSearchStore((state) => state.searchUiState);
    const updateDatasets = useSearchStore((state) => state.updateSelectedDatasets);

    const [messageApi, contextHolder] = message.useMessage();

    const {data, isPending, isSuccess, error} = useQuery({
        queryKey: ["datasets"],
        queryFn: fetchDatasetNames,
    });

    const getFallbackDatasets = useCallback((): string[] => {
        const available = data || [];
        if (0 === available.length) {
            return [];
        }

        return available.includes(CLP_DEFAULT_DATASET_NAME) ?
            [CLP_DEFAULT_DATASET_NAME] :
            [available[0] as string];
    }, [data]);

    useEffect(() => {
        if (isSuccess && 0 < data.length && 0 === datasets.length) {
            updateDatasets(getFallbackDatasets());
        }
    }, [isSuccess, data, datasets, getFallbackDatasets, updateDatasets]);

    useEffect(() => {
        if (error) {
            messageApi.error({
                key: "fetchError",
                content: "Error fetching datasets.",
            });
        }
    }, [error, messageApi]);

    useEffect(() => {
        if (isSuccess && 0 === data.length) {
            messageApi.warning({
                key: "noData",
                content: "No data has been ingested. Please ingest data to search.",
            });
            updateDatasets([]);
        }
    }, [data, isSuccess, messageApi, updateDatasets]);

    const handleMultiValueChange = (items: DatasetItem[]) => {
        const values = items.map((item) => item.value);

        if (null !== SETTINGS_MAX_DATASETS_PER_QUERY &&
            values.length > SETTINGS_MAX_DATASETS_PER_QUERY
        ) {
            messageApi.warning({
                key: "maxDatasetsExceeded",
                content: `Maximum of ${SETTINGS_MAX_DATASETS_PER_QUERY} datasets can be` +
                    " selected per query.",
            });

            return;
        }
        updateDatasets(0 === values.length ?
            getFallbackDatasets() :
            values);
    };

    const handleSingleValueChange = (item: DatasetItem | null) => {
        if (item) {
            updateDatasets([item.value]);
        }
    };

    const isDisabled = searchUiState === SEARCH_UI_STATE.QUERY_ID_PENDING ||
        searchUiState === SEARCH_UI_STATE.QUERYING;

    const options: DatasetItem[] = (data || []).map((name) => ({
        label: name,
        value: name,
    }));

    const selectedItems: DatasetItem[] = datasets.map((name) => ({
        label: name,
        value: name,
    }));

    const disabledClass = isDisabled ?
        " opacity-50 pointer-events-none" :
        "";

    const inputGroupClass =
        "flex items-center h-8 rounded-md border border-input" +
        " bg-background px-2 text-sm min-w-[140px] max-w-[300px]" +
        disabledClass;

    const popupClass = "bg-popover border rounded-md shadow-md text-sm max-h-48 overflow-auto";

    const emptyClass = "px-2 py-1.5 text-muted-foreground";

    const itemClass = "flex items-center gap-2 px-2 py-1.5 cursor-pointer hover:bg-accent data-[selected]:bg-accent/50";

    return (
        <>
            {contextHolder}
            {isMultiSelect ?
                <Combobox.Root<DatasetItem, true>
                    multiple
                    items={options}
                    value={selectedItems}
                    onValueChange={handleMultiValueChange}
                >
                    <Combobox.InputGroup className={inputGroupClass}>
                        <Combobox.Value>
                            {(selectedValue: DatasetItem[]) => (
                                <Combobox.Chips className="flex flex-wrap gap-1">
                                    {selectedValue.map((item) => (
                                        <Combobox.Chip
                                            key={item.value}
                                            className="flex items-center gap-0.5 bg-secondary rounded px-1.5 py-0.5 text-xs"
                                        >
                                            {item.label}
                                            <Combobox.ChipRemove
                                                aria-label={`Remove ${item.label}`}
                                                className="text-muted-foreground hover:text-foreground ml-0.5"
                                            >
                                                x
                                            </Combobox.ChipRemove>
                                        </Combobox.Chip>
                                    ))}
                                    <Combobox.Input
                                        className="bg-transparent text-sm outline-none flex-1 min-w-[60px]"
                                        placeholder={isPending ? "Loading..." : "Select datasets..."}
                                        disabled={isDisabled}
                                    />
                                </Combobox.Chips>
                            )}
                        </Combobox.Value>
                        <Combobox.Trigger
                            aria-label="Toggle"
                            className="text-xs text-muted-foreground hover:text-foreground ml-1"
                        >
                            v
                        </Combobox.Trigger>
                    </Combobox.InputGroup>

                    <Combobox.Portal>
                        <Combobox.Positioner className="z-50" sideOffset={4}>
                            <Combobox.Popup className={popupClass}>
                                <Combobox.Empty className={emptyClass}>
                                    {isPending ? "Loading..." : "No datasets found"}
                                </Combobox.Empty>
                                <Combobox.List>
                                    {(item: DatasetItem) => (
                                        <Combobox.Item
                                            className={itemClass}
                                            key={item.value}
                                            value={item}
                                        >
                                            <Combobox.ItemIndicator className="text-primary text-[10px]">
                                                *
                                            </Combobox.ItemIndicator>
                                            <span>{item.label}</span>
                                        </Combobox.Item>
                                    )}
                                </Combobox.List>
                            </Combobox.Popup>
                        </Combobox.Positioner>
                    </Combobox.Portal>
                </Combobox.Root> :
                <Combobox.Root<DatasetItem, false>
                    items={options}
                    value={0 < selectedItems.length ?
                        selectedItems[0] :
                        null}
                    onValueChange={handleSingleValueChange}
                >
                    <Combobox.InputGroup className={inputGroupClass}>
                        <Combobox.Input
                            className="bg-transparent text-sm outline-none flex-1 min-w-[60px]"
                            placeholder={isPending ? "Loading..." : "Select dataset..."}
                            disabled={isDisabled}
                        />
                        <Combobox.Trigger
                            aria-label="Toggle"
                            className="text-xs text-muted-foreground hover:text-foreground ml-1"
                        >
                            v
                        </Combobox.Trigger>
                    </Combobox.InputGroup>

                    <Combobox.Portal>
                        <Combobox.Positioner className="z-50" sideOffset={4}>
                            <Combobox.Popup className={popupClass}>
                                <Combobox.Empty className={emptyClass}>
                                    {isPending ? "Loading..." : "No datasets found"}
                                </Combobox.Empty>
                                <Combobox.List>
                                    {(item: DatasetItem) => (
                                        <Combobox.Item
                                            className={itemClass}
                                            key={item.value}
                                            value={item}
                                        >
                                            <Combobox.ItemIndicator className="text-primary text-[10px]">
                                                *
                                            </Combobox.ItemIndicator>
                                            <span>{item.label}</span>
                                        </Combobox.Item>
                                    )}
                                </Combobox.List>
                            </Combobox.Popup>
                        </Combobox.Positioner>
                    </Combobox.Portal>
                </Combobox.Root>}
        </>
    );
};

export default DatasetSelect;
