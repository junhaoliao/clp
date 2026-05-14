import {
    useEffect,
    useRef,
    useState,
} from "react";


/**
 * Uses IntersectionObserver to determine if a DOM element is in the viewport.
 * Returns a ref callback to attach to the container, and a boolean visibility flag.
 * Panels that are off-screen skip query execution and render a lightweight placeholder.
 *
 * @param rootMargin
 */
export function useLazyPanel (rootMargin = "200px 0px"): {
    ref: (node: Element | null) => void;
    isVisible: boolean;
} {
    const [isVisible, setIsVisible] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);
    const elementRef = useRef<Element | null>(null);

    const ref = (node: Element | null) => {
    // Cleanup previous observer
        if (observerRef.current) {
            observerRef.current.disconnect();
            observerRef.current = null;
        }

        elementRef.current = node;

        if (!node) {
            return;
        }

        observerRef.current = new IntersectionObserver(
            ([entry]) => {
                if (entry) {
                    setIsVisible(entry.isIntersecting);
                }
            },
            {rootMargin, threshold: 0},
        );
        observerRef.current.observe(node);
    };

    useEffect(() => {
        return () => {
            if (observerRef.current) {
                observerRef.current.disconnect();
            }
        };
    }, []);

    return {ref, isVisible};
}
