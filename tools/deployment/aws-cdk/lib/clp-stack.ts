import * as cdk from "aws-cdk-lib";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface ClpStackProps extends cdk.StackProps {
  cluster: eks.ICluster;
  archiveBucket: s3.IBucket;
}

export class ClpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ClpStackProps) {
    super(scope, id, props);

    const { cluster, archiveBucket } = props;

    // Create an IRSA (IAM Roles for Service Accounts) role for S3 access.
    // Use CfnJson to avoid token-in-map-key resolution errors.
    const oidcProviderArn =
      cluster instanceof eks.Cluster
        ? cluster.openIdConnectProvider.openIdConnectProviderArn
        : cdk.Fn.importValue("EksOidcProviderArn");

    const oidcIssuer =
      cluster instanceof eks.Cluster
        ? cluster.clusterOpenIdConnectIssuerUrl
        : cdk.Fn.importValue("EksOidcIssuerUrl");

    const conditionKey = new cdk.CfnJson(this, "OidcConditionKey", {
      value: {
        [`${oidcIssuer}:sub`]: "system:serviceaccount:clp:clp-s3-access",
        [`${oidcIssuer}:aud`]: "sts.amazonaws.com",
      },
    });

    const s3AccessRole = new iam.Role(this, "ClpS3AccessRole", {
      assumedBy: new iam.FederatedPrincipal(
        oidcProviderArn,
        {
          StringEquals: conditionKey,
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
    });

    s3AccessRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
        ],
        resources: [archiveBucket.bucketArn, `${archiveBucket.bucketArn}/*`],
      })
    );

    // S3 config shared by archive_output, stream_output, and logs_input
    const s3AuthConfig = {
      aws_authentication: {
        type: "default", // Uses the SDK credential chain (picks up IRSA)
      },
      region_code: this.region,
      bucket: archiveBucket.bucketName,
    };

    // Deploy CLP Helm chart
    new eks.HelmChart(this, "ClpHelmChart", {
      cluster,
      chart: "clp",
      repository: "https://y-scope.github.io/clp",
      namespace: "clp",
      createNamespace: true,
      values: {
        image: {
          clpPackage: {
            repository: "ghcr.io/junhaoliao/clp/clp-package",
            tag: "main",
          },
        },
        distributedDeployment: true,
        storage: {
          storageClassName: "gp3",
        },
        serviceAccount: {
          annotations: {
            "eks.amazonaws.com/role-arn": s3AccessRole.roleArn,
          },
        },
        clpConfig: {
          logs_input: {
            type: "s3",
            aws_authentication: {
              type: "default",
            },
          },
          archive_output: {
            storage: {
              type: "s3",
              s3_config: {
                ...s3AuthConfig,
                key_prefix: "archives/",
              },
            },
          },
          stream_output: {
            storage: {
              type: "s3",
              s3_config: {
                ...s3AuthConfig,
                key_prefix: "streams/",
              },
            },
          },
        },
      },
    });

    NagSuppressions.addStackSuppressions(
      this,
      [
        {
          id: "AwsSolutions-IAM5",
          reason:
            "IRSA role needs wildcard permissions on S3 bucket objects (bucket/*).",
        },
        {
          id: "AwsSolutions-IAM4",
          reason: "Managed policies used by EKS Helm chart lambda handler.",
        },
        {
          id: "AwsSolutions-L1",
          reason:
            "Lambda runtime version is managed by the CDK EKS construct.",
        },
      ],
      true
    );
  }
}
