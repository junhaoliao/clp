import {useState} from "react";

import {Button} from "../../../components/ui/button";
import {Checkbox} from "../../../components/ui/checkbox";
import {Label} from "../../../components/ui/label";


/**
 * Computes the display label for the dataset selector button.
 *
 * @param selectedDatasets
 * @param availableDatasets
 * @return
 */
const computeLabel = (selectedDatasets: string[], availableDatasets: string[]): string => {
    if (
        selectedDatasets.length === availableDatasets.length ||
        0 === selectedDatasets.length
    ) {
        return "All";
    }

    if (1 === selectedDatasets.length && selectedDatasets[0]) {
        return selectedDatasets[0];
    }

    return `${selectedDatasets.length} datasets`;
};


/**
 * Dataset multi-select dropdown for CLP-S mode.
 *
 * @param root0
 * @param root0.availableDatasets
 * @param root0.disabled
 * @param root0.selectedDatasets
 * @param root0.onToggleDataset
 */
const DatasetSelector = ({availableDatasets, disabled, selectedDatasets, onToggleDataset}: {
    availableDatasets: string[];
    disabled: boolean;
    selectedDatasets: string[];
    onToggleDataset: (name: string) => void;
}) => {
    const [open, setOpen] = useState(false);

    return (
        <div className={"relative min-w-[120px]"}>
            <Button
                disabled={disabled}
                type={"button"}
                variant={"outline"}
                className={
                    "w-full justify-start rounded-md border border-input " +
                    "bg-background px-3 py-1.5 text-sm text-foreground " +
                    "hover:border-primary/50"
                }
                onClick={() => {
                    setOpen(!open);
                }}
            >
                {computeLabel(selectedDatasets, availableDatasets)}
            </Button>
            {open && (
                <div className={"absolute z-20 mt-1 w-full rounded-md border bg-background shadow-md"}>
                    {availableDatasets.map((name) => (
                        <Label
                            key={name}
                            className={
                                "flex items-center gap-2 px-3 py-1.5 text-sm " +
                                "font-normal hover:bg-accent cursor-pointer"
                            }
                        >
                            <Checkbox
                                checked={selectedDatasets.includes(name)}
                                onCheckedChange={() => {
                                    onToggleDataset(name);
                                }}/>
                            {name}
                        </Label>
                    ))}
                    {0 === availableDatasets.length && (
                        <div className={"px-3 py-2 text-sm text-muted-foreground"}>
                            No datasets
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};


export {DatasetSelector};
