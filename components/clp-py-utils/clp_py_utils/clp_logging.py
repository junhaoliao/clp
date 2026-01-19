import logging
from typing import get_args, Literal

LoggingLevel = Literal[
    "INFO",
    "DEBUG",
    "WARN",
    "WARNING",
    "ERROR",
    "CRITICAL",
]


def get_logging_formatter() -> logging.Formatter:
    return logging.Formatter("%(asctime)s %(name)s [%(levelname)s] %(message)s")


def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    # Setup console logging
    logging_console_handler = logging.StreamHandler()
    logging_console_handler.setFormatter(get_logging_formatter())
    logger.addHandler(logging_console_handler)
    # Prevent double logging from sub loggers
    logger.propagate = False
    return logger


def set_logging_level(logger: logging.Logger, level: str) -> None:
    if level not in get_args(LoggingLevel):
        logger.warning(f"Invalid logging level: {level}, using INFO as default")
        logger.setLevel(logging.INFO)
        return

    logger.setLevel(level)
