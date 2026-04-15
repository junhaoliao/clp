/**
 * Format a byte count into a human-readable string.
 *
 * @param bytes The number of bytes.
 * @param decimals Number of decimal places (default 2).
 * @return Formatted string like "1.23 GiB".
 */
const formatSizeInBytes = (bytes: number, decimals = 2): string => {
    if (0 === bytes) {
        return "0 Bytes";
    }

    const k = 1024;
    const sizes = ["Bytes",
        "KiB",
        "MiB",
        "GiB",
        "TiB",
        "PiB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / (k ** i)).toFixed(decimals))} ${sizes[i]}`;
};


export {formatSizeInBytes};
