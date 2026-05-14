import {
    type ClassValue,
    clsx,
} from "clsx";
import {twMerge} from "tailwind-merge";


/**
 * Merges class names with tailwind-merge conflict resolution.
 *
 * @param inputs Class values to merge.
 * @return Merged class string.
 */
const cn = (...inputs: ClassValue[]): string => {
    return twMerge(clsx(inputs));
};


export {cn};
