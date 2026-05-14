import {Badge} from "@/components/ui/badge";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";


/**
 * Badge indicating that a wildcard query matched a numeric (int/float) column.
 *
 * In CLPP, when a wildcard query like `*error*` matches integer or float
 * columns, the query engine applies the wildcard to the stringified numeric
 * value. This badge appears in search results to indicate this behavior.
 *
 * @param root0
 * @param root0.fieldName
 * @param root0.fieldType
 * @return A popover badge indicating wildcard-on-numeric matching.
 */
const WildcardOnNumericBadge = ({fieldName, fieldType}: {
    fieldName: string;
    fieldType: "int" | "float";
}) => {
    return (
        <Popover>
            <PopoverTrigger>
                <Badge
                    variant={"outline"}
                    className={"cursor-pointer border-blue-300 " +
                        "bg-blue-50 text-[10px] text-blue-700"}
                >
                    [i CLPP]
                </Badge>
            </PopoverTrigger>
            <PopoverContent
                className={"w-64"}
                side={"top"}
            >
                <div className={"space-y-1 text-xs"}>
                    <p className={"font-medium"}>Wildcard-on-Numeric Match</p>
                    <p>
                        The wildcard query matched field
                        {" "}
                        <code>
                            {fieldName}
                        </code>
                        {" "}
                        type
                        {" "}
                        <code>
                            {fieldType}
                        </code>
                        . The wildcard was applied to the
                        {" "}
                        {" "}
                        stringified numeric value.
                    </p>
                </div>
            </PopoverContent>
        </Popover>
    );
};


export {WildcardOnNumericBadge};
export default WildcardOnNumericBadge;
