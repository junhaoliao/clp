import datetime
import json
import os
from pathlib import Path
from typing import Any

import msgpack
from celery.app.task import Task
from celery.utils.log import get_task_logger
from clp_py_utils.clp_config import (
    Database,
    StorageEngine,
    StorageType,
    WorkerConfig,
)
from clp_py_utils.clp_logging import set_logging_level
from clp_py_utils.s3_utils import (
    generate_s3_url,
    get_credential_env_vars,
)
from clp_py_utils.sql_adapter import SqlAdapter
import pymongo

from job_orchestration.executor.query.celery import app
from job_orchestration.executor.query.utils import (
    report_task_failure,
    run_query_task,
)
from job_orchestration.executor.utils import load_worker_config
from job_orchestration.scheduler.job_config import LogtypeStatsJobConfig
from job_orchestration.scheduler.scheduler_data import QueryTaskResult, QueryTaskStatus

# Setup logging
logger = get_task_logger(__name__)


def _make_clp_s_logtype_stats_command_and_env_vars(
    clp_home: Path,
    worker_config: WorkerConfig,
    archive_id: str,
    dataset: str,
) -> tuple[list[str] | None, dict[str, str] | None]:
    command = [
        str(clp_home / "bin" / "clp-s"),
        "--experimental",
        "s",
    ]
    if StorageType.S3 == worker_config.archive_output.storage.type:
        s3_config = worker_config.archive_output.storage.s3_config
        s3_object_key = f"{s3_config.key_prefix}{dataset}/{archive_id}"
        try:
            s3_url = generate_s3_url(
                s3_config.endpoint_url, s3_config.region_code, s3_config.bucket, s3_object_key
            )
        except ValueError as ex:
            logger.error(f"Encountered error while generating S3 url: {ex}")
            return None, None
        # fmt: off
        command.extend((
            s3_url,
            "--auth",
            "s3"
        ))
        # fmt: on
        env_vars = dict(os.environ)
        env_vars.update(get_credential_env_vars(s3_config.aws_authentication))
    else:
        archives_dir = worker_config.archive_output.get_directory() / dataset
        # fmt: off
        command.extend((
            "--archive-id",
            archive_id,
            str(archives_dir),
        ))
        # fmt: on
        env_vars = None

    command.append("stats.logtypes")
    return command, env_vars


def _make_clp_s_schema_tree_command_and_env_vars(
    clp_home: Path,
    worker_config: WorkerConfig,
    archive_id: str,
    dataset: str,
) -> tuple[list[str] | None, dict[str, str] | None]:
    command = [
        str(clp_home / "bin" / "clp-s"),
        "--experimental",
        "s",
    ]
    if StorageType.S3 == worker_config.archive_output.storage.type:
        s3_config = worker_config.archive_output.storage.s3_config
        s3_object_key = f"{s3_config.key_prefix}{dataset}/{archive_id}"
        try:
            s3_url = generate_s3_url(
                s3_config.endpoint_url, s3_config.region_code, s3_config.bucket, s3_object_key
            )
        except ValueError as ex:
            logger.error(f"Encountered error while generating S3 url: {ex}")
            return None, None
        # fmt: off
        command.extend((
            s3_url,
            "--auth",
            "s3"
        ))
        # fmt: on
        env_vars = dict(os.environ)
        env_vars.update(get_credential_env_vars(s3_config.aws_authentication))
    else:
        archives_dir = worker_config.archive_output.get_directory() / dataset
        # fmt: off
        command.extend((
            "--archive-id",
            archive_id,
            str(archives_dir),
        ))
        # fmt: on
        env_vars = None

    command.append("stats.schema_tree")
    return command, env_vars


def _store_logtype_stats_results(
    results_cache_uri: str,
    collection_name: str,
    archive_id: str,
    dataset: str | None,
    stdout_data: str,
) -> bool:
    logtypes = []
    for line in stdout_data.strip().splitlines():
        line = line.strip()
        if 0 == len(line):
            continue
        try:
            record = json.loads(line)
            record["archive_id"] = archive_id
            if dataset is not None:
                record["dataset"] = dataset
            logtypes.append(record)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse logtype stats line: {line}")
            continue

    if 0 == len(logtypes):
        logger.info(f"No logtype stats results for archive {archive_id}")
        return True

    with pymongo.MongoClient(results_cache_uri) as mongo_client:
        collection = mongo_client.get_default_database()[collection_name]
        collection.insert_many(logtypes)

    return True


def _store_schema_tree_results(
    results_cache_uri: str,
    collection_name: str,
    stdout_data: str,
) -> bool:
    for line in stdout_data.strip().splitlines():
        line = line.strip()
        if 0 == len(line):
            continue
        try:
            parsed = json.loads(line)
            break
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse schema tree line: {line}")
            continue
    else:
        logger.info("No schema tree data found in output")
        return True

    # clp-s stats.schema_tree outputs a JSON array of tree nodes
    if isinstance(parsed, list):
        nodes = parsed
    else:
        nodes = [parsed]

    schema_tree_doc = {
        "_schema_tree": True,
        "nodes": nodes,
    }

    with pymongo.MongoClient(results_cache_uri) as mongo_client:
        collection = mongo_client.get_default_database()[collection_name]
        collection.insert_one(schema_tree_doc)

    return True


@app.task(bind=True)
def logtype_stats(
    self: Task,
    job_id: str,
    task_id: int,
    job_config_blob: bytes,
    archive_id: str,
    clp_metadata_db_conn_params: dict,
    results_cache_uri: str,
    dataset: str | None = None,
) -> dict[str, Any]:
    task_name = "logtype_stats"

    # Setup logging to file
    clp_logs_dir = Path(os.getenv("CLP_LOGS_DIR"))
    clp_logging_level = os.getenv("CLP_LOGGING_LEVEL")
    set_logging_level(logger, clp_logging_level)

    logger.info(f"Started {task_name} task for job {job_id}")

    start_time = datetime.datetime.now()
    sql_adapter = SqlAdapter(Database.model_validate(clp_metadata_db_conn_params))

    # Load configuration
    clp_config_path = Path(os.getenv("CLP_CONFIG_PATH"))
    worker_config = load_worker_config(clp_config_path, logger)
    if worker_config is None:
        return report_task_failure(
            sql_adapter=sql_adapter,
            task_id=task_id,
            start_time=start_time,
        )

    storage_engine = worker_config.package.storage_engine
    if StorageEngine.CLP_S != storage_engine:
        logger.error(f"Logtype stats is only supported for CLP-S storage engine, got {storage_engine}")
        return report_task_failure(
            sql_adapter=sql_adapter,
            task_id=task_id,
            start_time=start_time,
        )

    # Make task_command
    clp_home = Path(os.getenv("CLP_HOME"))
    logtype_stats_config = LogtypeStatsJobConfig.model_validate(msgpack.unpackb(job_config_blob))

    task_command, env_vars = _make_clp_s_logtype_stats_command_and_env_vars(
        clp_home=clp_home,
        worker_config=worker_config,
        archive_id=archive_id,
        dataset=dataset or "default",
    )
    if not task_command:
        logger.error(f"Error creating {task_name} command")
        return report_task_failure(
            sql_adapter=sql_adapter,
            task_id=task_id,
            start_time=start_time,
        )

    task_results, stdout_data = run_query_task(
        sql_adapter=sql_adapter,
        logger=logger,
        clp_logs_dir=clp_logs_dir,
        task_command=task_command,
        env_vars=env_vars,
        task_name=task_name,
        job_id=job_id,
        task_id=task_id,
        start_time=start_time,
    )

    if QueryTaskStatus.SUCCEEDED == task_results.status:
        _store_logtype_stats_results(
            results_cache_uri=results_cache_uri,
            collection_name=job_id,
            archive_id=archive_id,
            dataset=dataset,
            stdout_data=stdout_data,
        )

        # Also fetch and store the schema tree from this archive
        schema_tree_command, schema_tree_env_vars = (
            _make_clp_s_schema_tree_command_and_env_vars(
                clp_home=clp_home,
                worker_config=worker_config,
                archive_id=archive_id,
                dataset=dataset or "default",
            )
        )
        if schema_tree_command:
            schema_tree_results, schema_tree_stdout = run_query_task(
                sql_adapter=sql_adapter,
                logger=logger,
                clp_logs_dir=clp_logs_dir,
                task_command=schema_tree_command,
                env_vars=schema_tree_env_vars,
                task_name="schema_tree",
                job_id=job_id,
                task_id=task_id,
                start_time=start_time,
            )
            if QueryTaskStatus.SUCCEEDED == schema_tree_results.status:
                _store_schema_tree_results(
                    results_cache_uri=results_cache_uri,
                    collection_name=job_id,
                    stdout_data=schema_tree_stdout,
                )

    return task_results.model_dump()
