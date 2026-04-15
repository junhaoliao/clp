import {
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";


const PROGRESS_INCREMENT = 5;
const PROGRESS_INTERVAL_MILLIS = 100;

/**
 * A hook that manages a pseudo progress value for search queries.
 * Progress increments from 0 to 100 in steps of 5 every 100ms.
 */
const usePseudoProgress = (): {
    progress: number | null;
    start: () => void;
    stop: () => void;
} => {
    const [progress, setProgress] = useState<number | null>(null);
    const intervalIdRef = useRef<number>(0);

    const start = useCallback(() => {
        if (0 !== intervalIdRef.current) {
            return;
        }

        intervalIdRef.current = window.setInterval(() => {
            setProgress((v) => {
                if (100 <= (v ?? 0) + PROGRESS_INCREMENT) {
                    return 100;
                }

                return (v ?? 0) + PROGRESS_INCREMENT;
            });
        }, PROGRESS_INTERVAL_MILLIS);
    }, []);

    const stop = useCallback(() => {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = 0;
        setProgress(null);
    }, []);

    useEffect(() => {
        return () => {
            if (0 !== intervalIdRef.current) {
                clearInterval(intervalIdRef.current);
                intervalIdRef.current = 0;
            }
        };
    }, []);

    return {progress, start, stop};
};


export {usePseudoProgress};
