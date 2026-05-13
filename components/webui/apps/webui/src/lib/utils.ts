import {
    type ClassValue,
    clsx,
} from "clsx";
import {twMerge} from "tailwind-merge";


/**
 *
 * @param inputs
 */
export function cn (...inputs: ClassValue[]): string {
    return twMerge(clsx(inputs));
}

/**
 *
 * @param n
 */
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Convert a Date to a datetime-local string (YYYY-MM-DDTHH:mm:ss).
 *
 * @param d
 */
export const toLocal = (d: Date): string => {
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hour = pad(d.getHours());
    const minute = pad(d.getMinutes());
    const second = pad(d.getSeconds());

    return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
};
