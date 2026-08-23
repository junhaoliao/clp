"""Smoke tests to validate that CLP Python projects can be imported without errors."""

import stat
from pathlib import Path

import pytest
from clp_mcp_server.constants import QueryJobType
from clp_package_utils.controller import (
    _write_aws_container_env_files,
    _write_container_env_file,
    AWS_CONTAINER_COMPONENT_NAMES,
)
from clp_package_utils.general import JobType
from clp_py_utils.clp_config import (
    API_SERVER_COMPONENT_NAME,
    ClpConfig,
    COMPRESSION_SCHEDULER_COMPONENT_NAME,
    COMPRESSION_WORKER_COMPONENT_NAME,
    GARBAGE_COLLECTOR_COMPONENT_NAME,
    LOG_INGESTOR_COMPONENT_NAME,
    QUERY_SCHEDULER_COMPONENT_NAME,
    QUERY_WORKER_COMPONENT_NAME,
    QueryJobPollingConfig,
    StorageEngine,
    WEBUI_COMPONENT_NAME,
)
from clp_py_utils.core import FileMetadata
from clp_py_utils.s3_utils import (
    AWS_ENV_VAR_ACCESS_KEY_ID,
    AWS_ENV_VAR_SECRET_ACCESS_KEY,
    AWS_ENV_VAR_SESSION_TOKEN,
    generate_container_auth_options,
)
from job_orchestration.scheduler.constants import CompressionJobStatus

DUMMY_ACCESS_KEY = "dummy-access-key"
DUMMY_SECRET_KEY = "dummy-secret-key"  # noqa: S105
PRIVATE_DIRECTORY_MODE = 0o700
PRIVATE_FILE_MODE = 0o600


def _s3_authentication(auth_type: str) -> dict[str, str]:
    return {"type": auth_type}


def _s3_storage(auth_type: str, key_prefix: str) -> dict[str, object]:
    return {
        "type": "s3",
        "staging_directory": f"var/data/staged-{key_prefix.rstrip('/')}",
        "s3_config": {
            "bucket": "test-bucket",
            "region_code": "us-east-1",
            "key_prefix": key_prefix,
            "endpoint_url": "http://127.0.0.1:4566",
            "aws_authentication": _s3_authentication(auth_type),
        },
    }


def _clp_config(
    *,
    logs_input_auth: str | None = None,
    archive_output_auth: str | None = None,
    stream_output_auth: str | None = None,
) -> ClpConfig:
    config: dict[str, object] = {}
    if logs_input_auth is not None:
        config["logs_input"] = {
            "type": "s3",
            "aws_authentication": _s3_authentication(logs_input_auth),
        }
    if archive_output_auth is not None:
        config["archive_output"] = {"storage": _s3_storage(archive_output_auth, "archives/")}
    if stream_output_auth is not None:
        config["stream_output"] = {"storage": _s3_storage(stream_output_auth, "streams/")}
    return ClpConfig.model_validate(config)


def _set_dummy_aws_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(AWS_ENV_VAR_ACCESS_KEY_ID, DUMMY_ACCESS_KEY)
    monkeypatch.setenv(AWS_ENV_VAR_SECRET_ACCESS_KEY, DUMMY_SECRET_KEY)
    monkeypatch.delenv(AWS_ENV_VAR_SESSION_TOKEN, raising=False)


def _expected_aws_assignments() -> list[str]:
    return [
        f"{AWS_ENV_VAR_ACCESS_KEY_ID}={DUMMY_ACCESS_KEY}",
        f"{AWS_ENV_VAR_SECRET_ACCESS_KEY}={DUMMY_SECRET_KEY}",
    ]


def test_clp_native_py_project_enum_classes() -> None:
    """
    Verifies that the following CLP Python projects can be imported successfully by testing
    conversions between their representative enum classes and literal values:

    - clp-mcp-server
    - clp-package-utils
    - clp-py-utils
    - job-orchestration
    """
    assert QueryJobType.SEARCH_OR_AGGREGATION == QueryJobType(0)
    assert JobType.COMPRESSION == JobType("compression")
    assert StorageEngine.CLP == StorageEngine("clp")
    assert CompressionJobStatus.PENDING == CompressionJobStatus(0)


def test_query_job_polling_config_accepts_canonical_and_legacy_names() -> None:
    """Ensures documented polling keys and their legacy aliases resolve identically."""
    initial_backoff_ms = 17
    max_backoff_ms = 29
    canonical = QueryJobPollingConfig.model_validate(
        {
            "initial_backoff_ms": initial_backoff_ms,
            "max_backoff_ms": max_backoff_ms,
        }
    )
    legacy = QueryJobPollingConfig.model_validate(
        {
            "initial_backoff": initial_backoff_ms,
            "max_backoff": max_backoff_ms,
        }
    )

    assert canonical.initial_backoff_ms == initial_backoff_ms
    assert canonical.max_backoff_ms == max_backoff_ms
    assert legacy == canonical
    assert canonical.model_dump() == {
        "initial_backoff_ms": initial_backoff_ms,
        "max_backoff_ms": max_backoff_ms,
    }


def test_api_server_uses_only_stream_output_authentication(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The API server should consume stream-output authentication only."""
    _set_dummy_aws_environment(monkeypatch)

    _, stream_assignments = generate_container_auth_options(
        _clp_config(stream_output_auth="env_vars"), API_SERVER_COMPONENT_NAME
    )
    _, archive_assignments = generate_container_auth_options(
        _clp_config(archive_output_auth="env_vars"), API_SERVER_COMPONENT_NAME
    )

    assert stream_assignments == _expected_aws_assignments()
    assert archive_assignments == []


def test_log_ingestor_uses_only_logs_input_authentication(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The log ingestor should consume logs-input authentication only."""
    _set_dummy_aws_environment(monkeypatch)

    _, input_assignments = generate_container_auth_options(
        _clp_config(logs_input_auth="env_vars"), LOG_INGESTOR_COMPONENT_NAME
    )
    _, stream_assignments = generate_container_auth_options(
        _clp_config(stream_output_auth="env_vars"), LOG_INGESTOR_COMPONENT_NAME
    )

    assert input_assignments == _expected_aws_assignments()
    assert stream_assignments == []


def test_webui_is_not_an_aws_storage_consumer() -> None:
    """The WebUI should no longer be accepted as an S3-consuming component."""
    with pytest.raises(ValueError, match="Container type webui is not valid"):
        generate_container_auth_options(ClpConfig(), WEBUI_COMPONENT_NAME)


def test_query_scheduler_is_not_an_aws_storage_consumer() -> None:
    """The query scheduler should not receive credentials used only by query workers."""
    with pytest.raises(ValueError, match="Container type query_scheduler is not valid"):
        generate_container_auth_options(ClpConfig(), QUERY_SCHEDULER_COMPONENT_NAME)


@pytest.mark.parametrize("storage", ["archive", "input"])
def test_compression_worker_uses_archive_and_input_authentication(
    monkeypatch: pytest.MonkeyPatch, storage: str
) -> None:
    """Compression workers should consume archive-output and logs-input authentication."""
    _set_dummy_aws_environment(monkeypatch)
    config = (
        _clp_config(archive_output_auth="env_vars")
        if storage == "archive"
        else _clp_config(logs_input_auth="env_vars")
    )

    _, assignments = generate_container_auth_options(config, COMPRESSION_WORKER_COMPONENT_NAME)

    assert assignments == _expected_aws_assignments()


def test_compression_scheduler_uses_only_logs_input_authentication(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Compression schedulers should use logs-input authentication only."""
    _set_dummy_aws_environment(monkeypatch)

    _, input_assignments = generate_container_auth_options(
        _clp_config(logs_input_auth="env_vars"), COMPRESSION_SCHEDULER_COMPONENT_NAME
    )
    _, archive_assignments = generate_container_auth_options(
        _clp_config(archive_output_auth="env_vars"), COMPRESSION_SCHEDULER_COMPONENT_NAME
    )

    assert input_assignments == _expected_aws_assignments()
    assert archive_assignments == []


def test_garbage_collector_uses_only_archive_output_authentication(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Garbage collection should use archive-output authentication only."""
    _set_dummy_aws_environment(monkeypatch)

    _, archive_assignments = generate_container_auth_options(
        _clp_config(archive_output_auth="env_vars"), GARBAGE_COLLECTOR_COMPONENT_NAME
    )
    _, stream_assignments = generate_container_auth_options(
        _clp_config(stream_output_auth="env_vars"), GARBAGE_COLLECTOR_COMPONENT_NAME
    )

    assert archive_assignments == _expected_aws_assignments()
    assert stream_assignments == []


@pytest.mark.parametrize("storage", ["archive", "stream"])
def test_query_worker_uses_archive_and_stream_output_authentication(
    monkeypatch: pytest.MonkeyPatch, storage: str
) -> None:
    """Query workers should consume both configured output storages."""
    _set_dummy_aws_environment(monkeypatch)
    config = (
        _clp_config(archive_output_auth="env_vars")
        if storage == "archive"
        else _clp_config(stream_output_auth="env_vars")
    )

    _, assignments = generate_container_auth_options(config, QUERY_WORKER_COMPONENT_NAME)

    assert assignments == _expected_aws_assignments()


def test_env_vars_authentication_requires_both_host_variables(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The env-vars mode should require both long-term credential variables."""
    monkeypatch.delenv(AWS_ENV_VAR_ACCESS_KEY_ID, raising=False)
    monkeypatch.delenv(AWS_ENV_VAR_SECRET_ACCESS_KEY, raising=False)
    monkeypatch.delenv(AWS_ENV_VAR_SESSION_TOKEN, raising=False)

    with pytest.raises(ValueError, match="environment variables not set"):
        generate_container_auth_options(
            _clp_config(stream_output_auth="env_vars"), API_SERVER_COMPONENT_NAME
        )


def test_env_vars_authentication_rejects_a_session_token(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """The env-vars mode should retain its explicit session-token rejection."""
    _set_dummy_aws_environment(monkeypatch)
    monkeypatch.setenv(AWS_ENV_VAR_SESSION_TOKEN, "dummy-session-token")

    with pytest.raises(ValueError, match="AWS_SESSION_TOKEN not supported"):
        generate_container_auth_options(
            _clp_config(stream_output_auth="env_vars"), API_SERVER_COMPONENT_NAME
        )


def test_container_env_file_is_private_and_clears_stale_values(tmp_path: Path) -> None:
    """Container env files should be private and truncate stale assignments."""
    env_file_path = tmp_path / "container-env" / "api_server.aws.env"
    assignments = _expected_aws_assignments()

    _write_container_env_file(env_file_path, assignments)

    assert stat.S_IMODE(env_file_path.parent.stat().st_mode) == PRIVATE_DIRECTORY_MODE
    assert stat.S_IMODE(env_file_path.stat().st_mode) == PRIVATE_FILE_MODE
    assert env_file_path.read_text() == "".join(f"{value}\n" for value in assignments)

    _write_container_env_file(env_file_path, [])

    assert env_file_path.read_text() == ""
    assert stat.S_IMODE(env_file_path.stat().st_mode) == PRIVATE_FILE_MODE


@pytest.mark.parametrize("invalid_character", ["\n", "\r", "\0"])
def test_container_env_file_rejects_unsafe_values(tmp_path: Path, invalid_character: str) -> None:
    """Container env files should reject control characters that create new entries."""
    with pytest.raises(ValueError, match="newlines or NUL bytes"):
        _write_container_env_file(
            tmp_path / "container-env" / "api_server.aws.env",
            [f"AWS_ACCESS_KEY_ID=dummy{invalid_character}value"],
        )


def test_aws_container_env_files_are_scoped_and_clear_stale_values(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    """AWS env files should exist only for consumers and clear obsolete credentials."""
    _set_dummy_aws_environment(monkeypatch)
    container_env_dir = tmp_path / "container-env"

    _write_aws_container_env_files(_clp_config(stream_output_auth="env_vars"), container_env_dir)

    assert {path.name for path in container_env_dir.iterdir()} == {
        f"{component_name}.aws.env" for component_name in AWS_CONTAINER_COMPONENT_NAMES
    }
    assert not (container_env_dir / "webui.aws.env").exists()
    assert (container_env_dir / "api_server.aws.env").read_text() != ""
    assert (container_env_dir / "query_worker.aws.env").read_text() != ""
    assert (container_env_dir / "compression_worker.aws.env").read_text() == ""
    assert (container_env_dir / "log_ingestor.aws.env").read_text() == ""

    monkeypatch.delenv(AWS_ENV_VAR_ACCESS_KEY_ID)
    monkeypatch.delenv(AWS_ENV_VAR_SECRET_ACCESS_KEY)
    _write_aws_container_env_files(ClpConfig(), container_env_dir)

    assert all(path.stat().st_size == 0 for path in container_env_dir.iterdir())


def test_file_metadata_estimates_zstandard_file_sizes() -> None:
    """Tests case-insensitive recognition of the standard Zstandard file extension."""
    file_size = 100

    for path in [
        Path("app.log.zst"),
        Path("app.log.clp.zst"),
        Path("app.log.tar.zst"),
        Path("app.log.ZST"),
    ]:
        assert file_size * 8 == FileMetadata(path, file_size).estimated_uncompressed_size


def test_file_metadata_estimates_gzip_file_sizes() -> None:
    """Tests case-insensitive recognition of the supported gzip file extensions."""
    file_size = 100

    for path in [
        Path("app.log.gz"),
        Path("app.log.GZ"),
        Path("app.log.gzip"),
        Path("app.log.GZIP"),
        Path("app.log.tgz"),
        Path("app.log.TGZ"),
        Path("app.log.tar.gz"),
        Path("app.log.TAR.GZ"),
    ]:
        assert file_size * 13 == FileMetadata(path, file_size).estimated_uncompressed_size
