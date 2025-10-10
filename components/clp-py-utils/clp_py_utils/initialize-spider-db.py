#!/usr/bin/env python3
import argparse
import logging
import pathlib
import re
import sys
from contextlib import closing

from pydantic import ValidationError
from sql_adapter import SQL_Adapter

from clp_py_utils.clp_config import CLPConfig
from clp_py_utils.core import read_yaml_config_file

# Setup logging
# Create logger
logger = logging.getLogger(__file__)
logger.setLevel(logging.INFO)
# Setup console logging
logging_console_handler = logging.StreamHandler()
logging_formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
logging_console_handler.setFormatter(logging_formatter)
logger.addHandler(logging_console_handler)


table_creators = [
    """
CREATE TABLE IF NOT EXISTS `drivers`
(
    `id`        BINARY(16) NOT NULL,
    `heartbeat` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `schedulers`
(
    `id`      BINARY(16)                        NOT NULL,
    `address` VARCHAR(40)                       NOT NULL,
    `port`    INT UNSIGNED                      NOT NULL,
    CONSTRAINT `scheduler_driver_id` FOREIGN KEY (`id`) REFERENCES `drivers` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    PRIMARY KEY (`id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS jobs
(
    `id`            BINARY(16) NOT NULL,
    `client_id`     BINARY(16) NOT NULL,
    `creation_time` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `state`         ENUM ('running', 'success', 'fail', 'cancel') NOT NULL DEFAULT 'running',
    KEY (`client_id`) USING BTREE,
    INDEX idx_jobs_creation_time (`creation_time`),
    INDEX idx_jobs_state (`state`),
    PRIMARY KEY (`id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS tasks
(
    `id`          BINARY(16)                                                        NOT NULL,
    `job_id`      BINARY(16)                                                        NOT NULL,
    `func_name`   VARCHAR(64)                                                       NOT NULL,
    `language`    ENUM('cpp', 'python')                                             NOT NULL,
    `state`       ENUM ('pending', 'ready', 'running', 'success', 'cancel', 'fail') NOT NULL,
    `timeout`     FLOAT,
    `max_retry`   INT UNSIGNED DEFAULT 0,
    `retry`       INT UNSIGNED DEFAULT 0,
    `instance_id` BINARY(16),
    CONSTRAINT `task_job_id` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    PRIMARY KEY (`id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS input_tasks
(
    `job_id`   BINARY(16)   NOT NULL,
    `task_id`  BINARY(16)   NOT NULL,
    `position` INT UNSIGNED NOT NULL,
    CONSTRAINT `input_task_job_id` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `input_task_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    INDEX (`job_id`, `position`),
    PRIMARY KEY (`task_id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS output_tasks
(
    `job_id`   BINARY(16)   NOT NULL,
    `task_id`  BINARY(16)   NOT NULL,
    `position` INT UNSIGNED NOT NULL,
    CONSTRAINT `output_task_job_id` FOREIGN KEY (`job_id`) REFERENCES `jobs` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `output_task_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    INDEX (`job_id`, `position`),
    PRIMARY KEY (`task_id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `data`
(
    `id`            BINARY(16)     NOT NULL,
    `value`         VARBINARY(999) NOT NULL,
    `hard_locality` BOOL DEFAULT FALSE,
    `persisted`     BOOL DEFAULT FALSE,
    PRIMARY KEY (`id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `task_outputs`
(
    `task_id`  BINARY(16)   NOT NULL,
    `position` INT UNSIGNED NOT NULL,
    `type`     VARCHAR(999)  NOT NULL,
    `value`    VARBINARY(999),
    `data_id`  BINARY(16),
    CONSTRAINT `output_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `output_data_id` FOREIGN KEY (`data_id`) REFERENCES `data` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
    PRIMARY KEY (`task_id`, `position`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `task_inputs`
(
    `task_id`              BINARY(16)   NOT NULL,
    `position`             INT UNSIGNED NOT NULL,
    `type`                 VARCHAR(999)  NOT NULL,
    `output_task_id`       BINARY(16),
    `output_task_position` INT UNSIGNED,
    `value`                VARBINARY(999), -- Use VARBINARY for all types of values
    `data_id`              BINARY(16),
    CONSTRAINT `input_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `input_task_output_match` FOREIGN KEY (`output_task_id`, `output_task_position`) REFERENCES task_outputs (`task_id`, `position`) ON UPDATE NO ACTION ON DELETE SET NULL,
    CONSTRAINT `input_data_id` FOREIGN KEY (`data_id`) REFERENCES `data` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
    PRIMARY KEY (`task_id`, `position`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `task_dependencies`
(
    `parent` BINARY(16) NOT NULL,
    `child`  BINARY(16) NOT NULL,
    KEY (`parent`) USING BTREE,
    KEY (`child`) USING BTREE,
    CONSTRAINT `task_dep_parent` FOREIGN KEY (`parent`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `task_dep_child` FOREIGN KEY (`child`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
""",
    """
CREATE TABLE IF NOT EXISTS `task_instances`
(
    `id`         BINARY(16) NOT NULL,
    `task_id`    BINARY(16) NOT NULL,
    `start_time` TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `instance_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    PRIMARY KEY (`id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `scheduler_leases`
(
    `scheduler_id` BINARY(16) NOT NULL,
    `task_id`      BINARY(16) NOT NULL,
    `lease_time`   TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT `lease_scheduler_id` FOREIGN KEY (`scheduler_id`) REFERENCES `schedulers` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `lease_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    INDEX (`scheduler_id`),
    PRIMARY KEY (`scheduler_id`, `task_id`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `data_locality`
(
    `id`      BINARY(16)  NOT NULL,
    `address` VARCHAR(40) NOT NULL,
    KEY (`id`) USING BTREE,
    CONSTRAINT `locality_data_id` FOREIGN KEY (`id`) REFERENCES `data` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
""",
    """
CREATE TABLE IF NOT EXISTS `data_ref_driver`
(
    `id`        BINARY(16) NOT NULL,
    `driver_id` BINARY(16) NOT NULL,
    KEY (`id`) USING BTREE,
    KEY (`driver_id`) USING BTREE,
    CONSTRAINT `data_driver_ref_id` FOREIGN KEY (`id`) REFERENCES `data` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `data_ref_driver_id` FOREIGN KEY (`driver_id`) REFERENCES `drivers` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
""",
    """
CREATE TABLE IF NOT EXISTS `data_ref_task`
(
    `id`      BINARY(16) NOT NULL,
    `task_id` BINARY(16) NOT NULL,
    KEY (`id`) USING BTREE,
    KEY (`task_id`) USING BTREE,
    CONSTRAINT `data_task_ref_id` FOREIGN KEY (`id`) REFERENCES `data` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE,
    CONSTRAINT `data_ref_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
""",
    """
CREATE TABLE IF NOT EXISTS `client_kv_data`
(
    `kv_key`    VARCHAR(64)    NOT NULL,
    `value`     VARBINARY(999) NOT NULL,
    `client_id` BINARY(16)     NOT NULL,
    PRIMARY KEY (`client_id`, `kv_key`)
);
""",
    """
CREATE TABLE IF NOT EXISTS `task_kv_data`
(
    `kv_key`  VARCHAR(64)    NOT NULL,
    `value`   VARBINARY(999) NOT NULL,
    `task_id` BINARY(16)     NOT NULL,
    PRIMARY KEY (`task_id`, `kv_key`),
    CONSTRAINT `kv_data_task_id` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON UPDATE NO ACTION ON DELETE CASCADE
);
""",
]


def main(argv):
    args_parser = argparse.ArgumentParser(description="Sets up Spider database.")
    args_parser.add_argument("--config", "-c", required=True, help="CLP configuration file.")
    parsed_args = args_parser.parse_args(argv[1:])

    config_path = pathlib.Path(parsed_args.config)
    try:
        clp_config = CLPConfig.model_validate(read_yaml_config_file(config_path))
        clp_config.database.load_credentials_from_env()
        if clp_config.spider_db is None:
            return 0
        clp_config.spider_db.load_credentials_from_env()
    except (ValidationError, ValueError) as err:
        logger.error(err)
        return -1
    except:
        logger.exception("Failed to load CLP configuration.")
        return -1

    spider_db_config = clp_config.spider_db
    if not spider_db_config:
        logger.error("Spider database configuration not found in CLP configuration.")
        return -1

    try:
        sql_adapter = SQL_Adapter(clp_config.database)
        with closing(sql_adapter.create_root_mariadb_connection()) as db_conn, closing(
            db_conn.cursor()
        ) as db_cursor:
            db_name = spider_db_config.name
            db_user = spider_db_config.username
            db_password = spider_db_config.password
            clp_user = clp_config.database.username
            if not _validate_name(db_name):
                logger.error(f"Invalid database name: {db_name}")
                return -1
            if not _validate_name(db_user):
                logger.error(f"Invalid database user name: {db_user}")
                return -1
            if not _validate_name(clp_user):
                logger.error(f"Invalid CLP database user name: {clp_user}")
                return -1
            if not _validate_name(db_password):
                logger.error(f"Invalid database user password")
                return -1

            db_cursor.execute(f"""CREATE DATABASE IF NOT EXISTS `{db_name}`""")
            if db_password is not None:
                db_cursor.execute(
                    f"""CREATE USER IF NOT EXISTS '{db_user}'@'%' IDENTIFIED BY '{db_password}'"""
                )
            else:
                db_cursor.execute(f"""CREATE USER IF NOT EXISTS '{db_user}'@'%' IDENTIFIED BY ''""")
            db_cursor.execute(f"""GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{db_user}'@'%'""")
            db_cursor.execute(f"""GRANT ALL PRIVILEGES ON `{db_name}`.* TO '{clp_user}'@'%'""")

            db_cursor.execute(f"""USE `{db_name}`""")
            for table_creator in table_creators:
                db_cursor.execute(table_creator)
    except:
        logger.exception("Failed to setup Spider database.")
        return -1

    return 0


_name_pattern = re.compile(r"^[A-Za-z0-9_-]+$")


def _validate_name(name: str) -> bool:
    """
    Validates that the input string contains only alphanumeric characters, underscores, or hyphens.
    :param name: The input string to validate.
    :return: If the input string is valid.
    """
    return _name_pattern.match(name) is not None


if "__main__" == __name__:
    sys.exit(main(sys.argv))
