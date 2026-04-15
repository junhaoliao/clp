import {clsx} from "clsx";
import {twMerge} from "tailwind-merge";


/**
 * Merges Tailwind CSS classes with clsx and tailwind-merge.
 *
 * @param inputs
 */
const cn = (...inputs: Parameters<typeof clsx>) => {
    return twMerge(clsx(inputs));
};


export {cn};
