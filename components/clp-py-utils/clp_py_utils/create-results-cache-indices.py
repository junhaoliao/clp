import argparse
import logging
import sys

from pymongo import IndexModel, MongoClient
from pymongo.errors import OperationFailure

# Setup logging
# Create logger
logger = logging.getLogger(__file__)
logger.setLevel(logging.INFO)
# Setup console logging
logging_console_handler = logging.StreamHandler()
logging_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
logging_console_handler.setFormatter(logging_formatter)
logger.addHandler(logging_console_handler)


def initialize_replica_set(client, uri):
    try:
        result = client.admin.command("replSetGetStatus")
        logger.info("Replica set already initialized: %s", result)
    except OperationFailure as e:
        logger.info("Initializing replica set")

        # Explicit host specification is required, or the docker's ID would be used as the hostname.
        config = {
            "_id": "rs0",
            "members": [{"_id": 0, "host": "localhost:27017"}],
        }
        client.admin.command("replSetInitiate", config)
        logger.info("Replica set initialized successfully.")


def main(argv):
    args_parser = argparse.ArgumentParser(description="Creates results cache indices for CLP.")
    args_parser.add_argument("--uri", required=True, help="URI of the results cache.")
    args_parser.add_argument(
        "--stream-collection", required=True, help="Collection for stream metadata."
    )
    parsed_args = args_parser.parse_args(argv[1:])

    results_cache_uri = parsed_args.uri
    stream_collection_name = parsed_args.stream_collection

    try:
        with MongoClient(results_cache_uri, directConnection=True) as results_cache_client:
            initialize_replica_set(results_cache_client, results_cache_uri)

        with MongoClient(results_cache_uri) as results_cache_client:
            stream_collection = results_cache_client.get_default_database()[stream_collection_name]
            file_split_id_index = IndexModel(["file_split_id"])
            orig_file_id_index = IndexModel(["orig_file_id", "begin_msg_ix", "end_msg_ix"])
            stream_collection.create_indexes([file_split_id_index, orig_file_id_index])
    except Exception:
        logger.exception("Failed to create clp results cache indices.")
        return -1

    return 0


if "__main__" == __name__:
    sys.exit(main(sys.argv))
