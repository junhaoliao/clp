import DatasetSelect from "./DatasetSelect";


/**
 * Renders a dataset selector with an input label.
 *
 * @return
 */
const Dataset = () => {
    return (
        <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">
                Dataset
            </label>
            <DatasetSelect isMultiSelect={true}/>
        </div>
    );
};

export default Dataset;
