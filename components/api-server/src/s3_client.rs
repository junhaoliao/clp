use clp_rust_utils::aws::AWS_DEFAULT_REGION;
use clp_rust_utils::clp_config::package::config::Config;
use clp_rust_utils::clp_config::package::config::StreamOutputStorage;

use crate::error::ClientError;

/// Creates the S3 client used for stream-output operations, when stream output is S3-backed.
///
/// # Errors
///
/// Returns [`ClientError::Aws`] when the default AWS S3 endpoint is selected without a region.
pub async fn create_stream_output_s3_client(
    config: &Config,
) -> Result<Option<aws_sdk_s3::Client>, ClientError> {
    let StreamOutputStorage::S3 { s3_config, .. } = &config.stream_output.storage else {
        return Ok(None);
    };

    if s3_config.region_code.is_none() && s3_config.endpoint_url.is_none() {
        return Err(ClientError::Aws {
            description: "a region code must be given when using the default AWS S3 endpoint"
                .to_owned(),
        });
    }

    let region = s3_config
        .region_code
        .as_ref()
        .map_or(AWS_DEFAULT_REGION, non_empty_string::NonEmptyString::as_str);
    Ok(Some(
        clp_rust_utils::s3::create_new_client(
            region,
            s3_config.endpoint_url.as_ref(),
            &s3_config.aws_authentication,
        )
        .await,
    ))
}

#[cfg(test)]
mod tests {
    use clp_rust_utils::clp_config::package::config::Config;
    use clp_rust_utils::clp_config::package::config::StreamOutputStorage;

    use super::create_stream_output_s3_client;
    use crate::error::ClientError;

    fn s3_storage(region_code: Option<&str>, endpoint_url: Option<&str>) -> StreamOutputStorage {
        serde_json::from_value(serde_json::json!({
            "type": "s3",
            "staging_directory": "/var/data/streams",
            "s3_config": {
                "bucket": "test-bucket",
                "region_code": region_code,
                "key_prefix": "test-prefix/",
                "endpoint_url": endpoint_url,
                "aws_authentication": {
                    "type": "credentials",
                    "credentials": {
                        "access_key_id": "test-access-key",
                        "secret_access_key": "test-secret-key"
                    }
                }
            }
        }))
        .expect("test S3 config should deserialize")
    }

    #[tokio::test]
    async fn filesystem_output_does_not_create_an_s3_client() {
        let config = Config::default();

        assert!(
            create_stream_output_s3_client(&config)
                .await
                .expect("filesystem stream output should be valid")
                .is_none()
        );
    }

    #[tokio::test]
    async fn default_endpoint_requires_a_region() {
        let mut config = Config::default();
        config.stream_output.storage = s3_storage(None, None);

        let error = create_stream_output_s3_client(&config)
            .await
            .expect_err("the default endpoint should require a region");

        assert!(matches!(
            error,
            ClientError::Aws { description }
                if description
                    == "a region code must be given when using the default AWS S3 endpoint"
        ));
    }

    #[tokio::test]
    async fn custom_endpoint_creates_a_cloneable_client_without_a_region() {
        let mut config = Config::default();
        config.stream_output.storage = s3_storage(None, Some("http://127.0.0.1:4566"));

        let client = create_stream_output_s3_client(&config)
            .await
            .expect("custom-endpoint S3 config should be valid")
            .expect("S3 stream output should create a client");
        let cloned_client = client.clone();

        let _list_operation = client
            .list_objects_v2()
            .bucket("test-bucket")
            .prefix("test-prefix/");
        let _get_operation = cloned_client
            .get_object()
            .bucket("test-bucket")
            .key("test-prefix/object");
    }
}
