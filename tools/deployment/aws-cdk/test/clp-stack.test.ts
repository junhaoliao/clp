import { beforeEach, describe, expect, test } from "vitest";
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { KubectlV32Layer } from "@aws-cdk/lambda-layer-kubectl-v32";
import { AwsSolutionsChecks, NagSuppressions } from "cdk-nag";
import { ClpStack } from "../lib/clp-stack";

/**
 * Creates a real EKS cluster in the given stack so that OIDC and kubectl
 * resources are available for the ClpStack under test.
 */
function createTestCluster(stack: cdk.Stack): eks.Cluster {
  const vpc = new ec2.Vpc(stack, "Vpc");
  return new eks.Cluster(stack, "TestCluster", {
    vpc,
    version: eks.KubernetesVersion.V1_32,
    kubectlLayer: new KubectlV32Layer(stack, "Kubectl"),
    defaultCapacity: 0,
  });
}

/**
 * The HelmChart Values property contains CDK tokens (bucket name, region),
 * so CloudFormation renders it as {"Fn::Join": ["", [...]]} instead of a
 * plain JSON string. This helper resolves the Fn::Join and parses the JSON.
 */
function getHelmValues(template: Template): Record<string, unknown> {
  const resources = template.findResources("Custom::AWSCDK-EKS-HelmChart");
  const helmResource = Object.values(resources)[0];
  const valuesProperty = helmResource.Properties.Values;

  if (typeof valuesProperty === "string") {
    return JSON.parse(valuesProperty);
  }

  // Resolve Fn::Join: join the array elements, stringifying objects as-is
  if (valuesProperty["Fn::Join"]) {
    const [separator, parts] = valuesProperty["Fn::Join"];
    const resolved = parts
      .map((p: unknown) => (typeof p === "string" ? p : "PLACEHOLDER"))
      .join(separator);
    return JSON.parse(resolved);
  }

  throw new Error("Unexpected Values format in HelmChart resource");
}

describe("ClpStack", () => {
  let app: cdk.App;
  let stack: ClpStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const env = { account: "123456789012", region: "us-east-1" };

    const depStack = new cdk.Stack(app, "DepStack", { env });
    const cluster = createTestCluster(depStack);
    const archiveBucket = new s3.Bucket(depStack, "Bucket");

    stack = new ClpStack(app, "TestClp", { env, cluster, archiveBucket });
    template = Template.fromStack(stack);
  });

  test("HelmChart resource is created", () => {
    template.resourceCountIs("Custom::AWSCDK-EKS-HelmChart", 1);
  });

  test("Helm chart is deployed to clp namespace", () => {
    template.hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
      Namespace: "clp",
    });
  });

  test("Helm chart uses the clp chart from y-scope repo", () => {
    template.hasResourceProperties("Custom::AWSCDK-EKS-HelmChart", {
      Chart: "clp",
      Repository: "https://y-scope.github.io/clp",
    });
  });

  test("Helm values set distributedDeployment to true", () => {
    const values = getHelmValues(template);
    expect(values).toHaveProperty("distributedDeployment", true);
  });

  test("Helm values set storage class to gp3", () => {
    const values = getHelmValues(template);
    expect(values).toHaveProperty("storage.storageClassName", "gp3");
  });

  test("Helm values set logs_input type to s3", () => {
    const values = getHelmValues(template);
    expect(values).toHaveProperty("clpConfig.logs_input.type", "s3");
  });

  test("Helm values reference S3 bucket for archive output", () => {
    const values = getHelmValues(template);
    expect(values).toHaveProperty("clpConfig.archive_output.storage.type", "s3");
  });

  test("Helm values reference S3 bucket for stream output", () => {
    const values = getHelmValues(template);
    expect(values).toHaveProperty("clpConfig.stream_output.storage.type", "s3");
  });

  test("Helm values set IRSA annotation on service account", () => {
    const values = getHelmValues(template);
    const sa = (values as any).serviceAccount;
    expect(sa).toBeDefined();
    expect(sa.annotations).toHaveProperty("eks.amazonaws.com/role-arn");
  });

  test("IRSA role for S3 access is created", () => {
    template.hasResourceProperties("AWS::IAM::Role", {
      AssumeRolePolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: "sts:AssumeRoleWithWebIdentity",
          }),
        ]),
      }),
    });
  });

  test("IRSA role has S3 permissions for the archive bucket", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["s3:GetObject", "s3:PutObject"]),
            Effect: "Allow",
          }),
        ]),
      }),
    });
  });

  test("cdk-nag produces no errors", () => {
    const nagApp = new cdk.App();
    const env = { account: "123456789012", region: "us-east-1" };
    cdk.Aspects.of(nagApp).add(new AwsSolutionsChecks({ verbose: true }));

    const nagDepStack = new cdk.Stack(nagApp, "NagDep", { env });
    const cluster = createTestCluster(nagDepStack);
    const archiveBucket = new s3.Bucket(nagDepStack, "Bucket", {
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
    });

    // Suppress nag issues on the dependency stack (not what we're testing)
    NagSuppressions.addStackSuppressions(
      nagDepStack,
      [
        { id: "AwsSolutions-IAM4", reason: "Dependency stack for testing." },
        { id: "AwsSolutions-IAM5", reason: "Dependency stack for testing." },
        { id: "AwsSolutions-EKS1", reason: "Dependency stack for testing." },
        { id: "AwsSolutions-L1", reason: "Dependency stack for testing." },
        { id: "AwsSolutions-S1", reason: "Dependency stack for testing." },
        { id: "AwsSolutions-S10", reason: "Dependency stack for testing." },
        { id: "AwsSolutions-SF1", reason: "Dependency stack for testing." },
        { id: "AwsSolutions-SF2", reason: "Dependency stack for testing." },
      ],
      true
    );

    const nagStack = new ClpStack(nagApp, "NagClp", {
      env,
      cluster,
      archiveBucket,
    });

    const errors = Annotations.fromStack(nagStack).findError(
      "*",
      Match.stringLikeRegexp("AwsSolutions-.*")
    );
    expect(errors).toHaveLength(0);
  });
});
