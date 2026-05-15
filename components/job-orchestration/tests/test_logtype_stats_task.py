"""
Tests for logtype_stats_task module.

Tests cover:
- LogtypeStatsJobConfig model validation
- _make_clp_s_logtype_stats_command_and_env_vars command construction
- _store_logtype_stats_results result parsing
"""

import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from job_orchestration.scheduler.job_config import LogtypeStatsJobConfig


# ── LogtypeStatsJobConfig ──────────────────────────────────────────────────


class TestLogtypeStatsJobConfig:
    """Tests for the LogtypeStatsJobConfig Pydantic model."""

    def test_default_dataset_is_none(self):
        config = LogtypeStatsJobConfig()
        assert config.dataset is None

    def test_dataset_can_be_set(self):
        config = LogtypeStatsJobConfig(dataset="my-dataset")
        assert config.dataset == "my-dataset"

    def test_extra_fields_are_ignored(self):
        config = LogtypeStatsJobConfig(dataset="x", unknown_field=True)
        assert config.dataset == "x"
        assert not hasattr(config, "unknown_field")


# ── _make_clp_s_logtype_stats_command_and_env_vars ─────────────────────────


class TestMakeClpSLogtypeStatsCommand:
    """Tests for _make_clp_s_logtype_stats_command_and_env_vars."""

    @pytest.fixture()
    def _import_function(self):
        """Import the function fresh to avoid Celery app side effects."""
        from job_orchestration.executor.query.logtype_stats_task import (
            _make_clp_s_logtype_stats_command_and_env_vars,
        )

        return _make_clp_s_logtype_stats_command_and_env_vars

    def test_filesystem_storage_builds_correct_command(self, _import_function):
        make_cmd = _import_function

        # Build a minimal WorkerConfig-like object with FS storage
        worker_config = MagicMock()
        worker_config.archive_output.storage.type = "fs"
        worker_config.archive_output.get_directory.return_value = Path("/data/archives")

        command, env_vars = make_cmd(
            clp_home=Path("/opt/clp"),
            worker_config=worker_config,
            archive_id="abc-123",
            dataset="test-ds",
        )

        assert command is not None
        assert command[0] == "/opt/clp/bin/clp-s"
        assert command[1] == "--experimental"
        assert command[2] == "s"
        assert str(Path("/data/archives/test-ds")) in command
        assert "--archive-id" in command
        assert "abc-123" in command
        assert "stats.logtypes" in command
        assert env_vars is None

    @patch("job_orchestration.executor.query.logtype_stats_task.generate_s3_url")
    @patch(
        "job_orchestration.executor.query.logtype_stats_task.get_credential_env_vars",
    )
    def test_s3_storage_builds_correct_command(
        self, mock_cred_env, mock_s3_url, _import_function,
    ):
        make_cmd = _import_function
        mock_s3_url.return_value = "s3://my-bucket/prefix/test-ds/abc-123"
        mock_cred_env.return_value = {"AWS_ACCESS_KEY_ID": "key"}

        worker_config = MagicMock()
        worker_config.archive_output.storage.type = "s3"
        s3_config = worker_config.archive_output.storage.s3_config
        s3_config.key_prefix = "prefix/"
        s3_config.region_code = "us-east-1"
        s3_config.bucket = "my-bucket"
        s3_config.endpoint_url = "https://s3.amazonaws.com"
        s3_config.aws_authentication = MagicMock()

        command, env_vars = make_cmd(
            clp_home=Path("/opt/clp"),
            worker_config=worker_config,
            archive_id="abc-123",
            dataset="test-ds",
        )

        assert command is not None
        assert command[0] == "/opt/clp/bin/clp-s"
        assert "--experimental" == command[1]
        assert "s" == command[2]
        assert "s3://my-bucket/prefix/test-ds/abc-123" in command
        assert "--auth" in command
        assert "s3" in command
        assert "stats.logtypes" in command
        assert env_vars is not None
        assert "AWS_ACCESS_KEY_ID" in env_vars

    @patch("job_orchestration.executor.query.logtype_stats_task.generate_s3_url")
    def test_s3_url_error_returns_none(self, mock_s3_url, _import_function):
        make_cmd = _import_function
        mock_s3_url.side_effect = ValueError("bad URL")

        worker_config = MagicMock()
        worker_config.archive_output.storage.type = "s3"
        s3_config = worker_config.archive_output.storage.s3_config
        s3_config.key_prefix = "prefix/"
        s3_config.region_code = "us-east-1"
        s3_config.bucket = "my-bucket"
        s3_config.endpoint_url = "https://s3.amazonaws.com"
        s3_config.aws_authentication = MagicMock()

        command, env_vars = make_cmd(
            clp_home=Path("/opt/clp"),
            worker_config=worker_config,
            archive_id="bad",
            dataset="ds",
        )

        assert command is None
        assert env_vars is None


# ── _store_logtype_stats_results ───────────────────────────────────────────


class TestStoreLogtypeStatsResults:
    """Tests for _store_logtype_stats_results."""

    @pytest.fixture()
    def _import_function(self):
        from job_orchestration.executor.query.logtype_stats_task import (
            _store_logtype_stats_results,
        )

        return _store_logtype_stats_results

    def test_parses_valid_json_lines(self, _import_function):
        store = _import_function
        stdout_data = json.dumps({"logtype": "lt1", "count": 10}) + "\n" + \
            json.dumps({"logtype": "lt2", "count": 5}) + "\n"

        with patch("job_orchestration.executor.query.logtype_stats_task.pymongo") as mock_pymongo:
            mock_client = MagicMock()
            mock_pymongo.MongoClient.return_value.__enter__ = MagicMock(
                return_value=mock_client,
            )
            mock_pymongo.MongoClient.return_value.__exit__ = MagicMock(
                return_value=False,
            )
            mock_collection = MagicMock()
            mock_client.get_default_database.return_value.__getitem__ = MagicMock(
                return_value=mock_collection,
            )

            result = store(
                results_cache_uri="mongodb://localhost",
                collection_name="job-1",
                archive_id="arc-1",
                dataset="ds",
                stdout_data=stdout_data,
            )

            assert result is True
            assert mock_collection.insert_many.called
            inserted = mock_collection.insert_many.call_args[0][0]
            assert len(inserted) == 2
            assert inserted[0]["archive_id"] == "arc-1"
            assert inserted[0]["dataset"] == "ds"

    def test_empty_stdout_returns_true(self, _import_function):
        store = _import_function

        with patch("job_orchestration.executor.query.logtype_stats_task.pymongo"):
            result = store(
                results_cache_uri="mongodb://localhost",
                collection_name="job-1",
                archive_id="arc-1",
                dataset=None,
                stdout_data="",
            )

            assert result is True

    def test_skips_invalid_json_lines(self, _import_function):
        store = _import_function
        stdout_data = "not-json\n" + json.dumps({"logtype": "lt1", "count": 1}) + "\n"

        with patch("job_orchestration.executor.query.logtype_stats_task.pymongo") as mock_pymongo:
            mock_client = MagicMock()
            mock_pymongo.MongoClient.return_value.__enter__ = MagicMock(
                return_value=mock_client,
            )
            mock_pymongo.MongoClient.return_value.__exit__ = MagicMock(
                return_value=False,
            )
            mock_collection = MagicMock()
            mock_client.get_default_database.return_value.__getitem__ = MagicMock(
                return_value=mock_collection,
            )

            result = store(
                results_cache_uri="mongodb://localhost",
                collection_name="job-1",
                archive_id="arc-1",
                dataset=None,
                stdout_data=stdout_data,
            )

            assert result is True
            inserted = mock_collection.insert_many.call_args[0][0]
            assert len(inserted) == 1
            assert inserted[0]["logtype"] == "lt1"
