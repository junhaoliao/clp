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
        [`${oidcIssuer}:sub`]: "system:serviceaccount:clp:clp-service-account",
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

    // Export the role ARN for use with `helm install`
    new cdk.CfnOutput(this, "S3AccessRoleArn", {
      value: s3AccessRole.roleArn,
      description: "IRSA role ARN for CLP service account S3 access",
    });

    new cdk.CfnOutput(this, "ArchiveBucketName", {
      value: archiveBucket.bucketName,
      description: "S3 bucket for CLP archives and streams",
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
