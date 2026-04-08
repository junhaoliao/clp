import {
    useEffect,
    useRef,
    useState,
} from "react";

import {Response} from "@webui/common/socket";
import {Nullable} from "@webui/common/utility-types";

import {getSharedSocket} from "./SocketSingleton";


/**
 * Fetches the `message` field for a set of document IDs from a MongoDB collection. Each message
 * is fetched individually via the `collection::findOne::message` socket event, keeping each
 * payload bounded to a single document.
 *
 * @param collectionName Collection to query, or null to skip fetching.
 * @param docIds List of document `_id` values to fetch messages for.
 * @return Map of document `_id` to `message` string, or null while pending.
 */
const useDocumentMessages = (
    collectionName: Nullable<string>,
    docIds: string[],
): Nullable<Map<string, string>> => {
    const [messages, setMessages] = useState<Nullable<Map<string, string>>>(null);

    // Track which IDs have already been fetched so we only request new ones.
    const fetchedRef = useRef<Map<string, string>>(new Map());
    const prevCollectionRef = useRef<Nullable<string>>(null);

    useEffect(() => {
        if (null === collectionName || 0 === docIds.length) {
            return () => {
            };
        }

        // Reset fetched cache if the collection changes (new search).
        if (collectionName !== prevCollectionRef.current) {
            fetchedRef.current = new Map();
            prevCollectionRef.current = collectionName;
        }

        const newIds = docIds.filter((id) => !fetchedRef.current.has(id));
        if (0 === newIds.length) {
            return () => {
            };
        }

        let cancelled = false;
        const socket = getSharedSocket();

        const fetchAll = async () => {
            const results = await Promise.allSettled(
                newIds.map((docId) => socket.emitWithAck("collection::findOne::message", {
                    collectionName,
                    docId,
                }).then((response: Response<{message: string}>) => {
                    if ("data" in response) {
                        return {docId: docId, message: response.data.message};
                    }

                    return null;
                }))
            );

            if (cancelled) {
                return;
            }

            for (const result of results) {
                if ("fulfilled" === result.status && null !== result.value) {
                    fetchedRef.current.set(result.value.docId, result.value.message);
                }
            }

            setMessages(new Map(fetchedRef.current));
        };

        fetchAll().catch((error: unknown) => {
            console.error("Error fetching messages:", error);
        });

        return () => {
            cancelled = true;
        };
    }, [collectionName,
        docIds]);

    return messages;
};

export {useDocumentMessages};
