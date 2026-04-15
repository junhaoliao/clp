import React from "react";

import {
    CLP_DEFAULT_DATASET_NAME,
    CLP_STORAGE_ENGINES,
    STORAGE_TYPE,
} from "@clp/webui-shared";
import {useForm} from "@tanstack/react-form";
import {CircleHelp} from "lucide-react";
import {toast} from "sonner";

import {useSubmitCompressionJob} from "../../../api";
import {DashboardCard} from "../../../components/dashboard/DashboardCard";
import {Button} from "../../../components/ui/button";
import {Checkbox} from "../../../components/ui/checkbox";
import {Input} from "../../../components/ui/input";
import {Label} from "../../../components/ui/label";
import {
    SETTINGS_LOGS_INPUT_TYPE,
    SETTINGS_STORAGE_ENGINE,
} from "../../../config";
import {PathsSelect} from "./PathsSelect";


const DATASET_HELPER_TEXT = `If left empty, dataset "${CLP_DEFAULT_DATASET_NAME}" will be used.`;
const DATASET_PLACEHOLDER_TEXT = "The dataset for new archives";
const TIMESTAMP_KEY_HELPER_TEXT =
    "If not provided, events will not have assigned timestamps and can only be searched " +
    "from the command line without a timestamp filter. Certain characters require escaping. " +
    "See the JSON search syntax docs. This field is ignored when \"Convert to JSON\" is enabled.";
const TIMESTAMP_KEY_PLACEHOLDER_TEXT =
    "The path (e.g. x.y) for the field containing the log event's timestamp";
const UNSTRUCTURED_HELPER_TEXT =
    "Enable this for non-JSON logs. Each log event will be parsed and converted to JSON " +
    "with `timestamp` and `message` fields. See the documentation for more details.";


/**
 * A small circle-question icon that shows a tooltip on hover, matching the
 * original webui pattern where Ant Design Form.Item tooltip renders a
 * question mark icon next to the label.
 *
 * @param root0
 * @param root0.text
 */
const HelperTooltip = ({text}: {text: string}) => (
    <span
        className={"ml-1 inline-flex items-center text-muted-foreground hover:text-foreground cursor-help"}
        title={text}
    >
        <CircleHelp className={"h-3.5 w-3.5"}/>
    </span>
);


/**
 * CLP-S specific form fields (dataset, unstructured, timestamp key).
 *
 * @param root0
 * @param root0.form
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ClpSFields = ({form}: {form: any}) => (
    <>
        <form.Field name={"dataset"}>
            {/* eslint-disable @typescript-eslint/no-explicit-any */}
            {(field: any) => {
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                const datasetValue: string = field.state.value;
                const hasError = datasetValue && !(/^\w+$/).test(datasetValue);

                return (
                    <div className={"space-y-2"}>
                        <Label>
                            Dataset
                            {" "}
                            <HelperTooltip text={DATASET_HELPER_TEXT}/>
                        </Label>
                        <Input
                            placeholder={DATASET_PLACEHOLDER_TEXT}
                            value={datasetValue}
                            className={hasError ?
                                "border-destructive" :
                                ""}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                field.handleChange(e.target.value);
                            }}/>
                        {hasError && (
                            <p className={"text-xs text-destructive"}>
                                Must contain only letters, numbers, and underscores.
                            </p>
                        )}
                    </div>
                );
            }}
        </form.Field>

        <form.Field name={"unstructured"}>
            {(field: any) => (
                <div className={"space-y-2"}>
                    <div className={"flex items-center gap-2"}>
                        <Checkbox
                            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
                            checked={field.state.value}
                            id={"unstructured"}
                            onCheckedChange={(checked: unknown) => {
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                field.handleChange(true === checked);
                            }}/>
                        <Label
                            className={"text-sm font-normal"}
                            htmlFor={"unstructured"}
                        >
                            Convert to JSON
                        </Label>
                        <HelperTooltip text={UNSTRUCTURED_HELPER_TEXT}/>
                    </div>
                </div>
            )}
        </form.Field>

        {/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access */}
        <form.Subscribe
            selector={(s: any) => s.values.unstructured}
        >
            {(unstructured: boolean) => (
                <form.Field name={"timestampKey"}>
                    {(field: any) => (
                        <div className={"space-y-2"}>
                            <Label>
                                Timestamp Key
                                {" "}
                                <HelperTooltip text={TIMESTAMP_KEY_HELPER_TEXT}/>
                            </Label>
                            <Input
                                disabled={unstructured}
                                placeholder={TIMESTAMP_KEY_PLACEHOLDER_TEXT}
                                // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                value={field.state.value as string}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                    field.handleChange(e.target.value);
                                }}/>
                        </div>
                    )}
                </form.Field>
            )}
        </form.Subscribe>
    </>
);


/**
 * Form for submitting compression jobs.
 */
const CompressForm = () => {
    const submitJob = useSubmitCompressionJob();
    const isClpS = CLP_STORAGE_ENGINES.CLP_S === SETTINGS_STORAGE_ENGINE;
    const isFs = STORAGE_TYPE.FS === SETTINGS_LOGS_INPUT_TYPE;

    const form = useForm({
        defaultValues: {
            paths: [] as string[],
            dataset: "",
            timestampKey: "",
            unstructured: false,
        },
        onSubmit: ({value}) => {
            if (0 === value.paths.length) {
                toast.error("At least one path is required.");

                return;
            }

            const payload: {
                paths: string[];
                dataset?: string;
                timestampKey?: string;
                unstructured?: boolean;
            } = {paths: value.paths};

            if (isClpS) {
                payload.dataset = value.dataset.trim() || CLP_DEFAULT_DATASET_NAME;
                if (!value.unstructured && value.timestampKey.trim()) {
                    payload.timestampKey = value.timestampKey.trim();
                }
                if (value.unstructured) {
                    payload.unstructured = true;
                }
            }

            submitJob.mutate(payload, {
                onSuccess: (data) => {
                    toast.success(`Compression job #${data.jobId} submitted successfully`);
                    form.reset();
                },
                onError: (error: unknown) => {
                    const msg = error instanceof Error ?
                        error.message :
                        String(error);

                    toast.error(`Failed to submit compression job: ${msg}`);
                },
            });
        },
    });

    return (
        <DashboardCard title={"Submit Compression Job"}>
            <form
                className={"space-y-4"}
                onSubmit={(e) => {
                    e.preventDefault();
                    // eslint-disable-next-line @typescript-eslint/no-floating-promises
                    form.handleSubmit();
                }}
            >
                {/* Paths selector (tree browser for FS, text input for S3) */}
                <form.Field name={"paths"}>
                    {/* eslint-disable @typescript-eslint/no-explicit-any */}
                    {(field: any) => (
                        <div className={"space-y-2"}>
                            <Label>
                                Paths
                                {" "}
                                <span className={"text-destructive"}>*</span>
                            </Label>
                            {isFs ?
                                (
                                    <PathsSelect
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                        paths={field.state.value as string[]}
                                        onPathsChange={(paths: string[]) => {
                                            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                            field.handleChange(paths);
                                        }}/>
                                ) :
                                (
                                    <Input
                                        placeholder={"s3://bucket/path1, s3://bucket/path2"}
                                        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
                                        value={(field.state.value as string[]).join(", ")}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
                                            field.handleChange(
                                                e.target.value.split(",").map((s) => s.trim())
                                                    .filter(Boolean),
                                            );
                                        }}/>
                                )}
                            {/* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access */}
                            {0 < field.state.meta.errors.length && (
                                <p className={"text-xs text-destructive"}>
                                    {/* eslint-disable @typescript-eslint/no-unsafe-member-access */}
                                    {field.state.meta.errors[0]?.message ?? "Invalid paths"}
                                </p>
                            )}
                        </div>
                    )}
                </form.Field>

                {/* CLP-S only fields */}
                {isClpS && <ClpSFields form={form}/>}

                {/* Submit */}
                <Button
                    disabled={submitJob.isPending}
                    type={"submit"}
                >
                    {submitJob.isPending ?
                        "Submitting..." :
                        "Submit"}
                </Button>

            </form>
        </DashboardCard>
    );
};


export {CompressForm};
