import { beforeEach, describe, expect, test } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { AwsSolutionsChecks } from "cdk-nag";
import { StorageStack } from "../lib/storage-stack";

describe("StorageStack", () => {
  let app: cdk.App;
  let stack: StorageStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new StorageStack(app, "TestStorage", {
      env: { account: "123456789012", region: "us-east-1" },
    });
    template = Template.fromStack(stack);
  });

  test("S3 bucket for archives is created", () => {
    template.resourceCountIs("AWS::S3::Bucket", 1);
  });

  test("S3 bucket has server-side encryption", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      BucketEncryption: {
        ServerSideEncryptionConfiguration: [
          {
            ServerSideEncryptionByDefault: {
              SSEAlgorithm: "AES256",
            },
          },
        ],
      },
    });
  });

  test("S3 bucket blocks public access", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
    });
  });

  test("S3 bucket has versioning enabled", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      VersioningConfiguration: {
        Status: "Enabled",
      },
    });
  });

  test("S3 bucket has lifecycle rule for IA transition", () => {
    template.hasResourceProperties("AWS::S3::Bucket", {
      LifecycleConfiguration: {
        Rules: Match.arrayWith([
          Match.objectLike({
            Status: "Enabled",
            Transitions: Match.arrayWith([
              Match.objectLike({
                StorageClass: "STANDARD_IA",
                TransitionInDays: 90,
              }),
            ]),
          }),
        ]),
      },
    });
  });

  test("S3 bucket enforces SSL", () => {
    template.hasResourceProperties("AWS::S3::BucketPolicy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Effect: "Deny",
            Condition: {
              Bool: { "aws:SecureTransport": "false" },
            },
          }),
        ]),
      },
    });
  });

  test("bucket is exported for other stacks", () => {
    expect(stack.archiveBucket).toBeDefined();
  });

  test("cdk-nag produces no errors", () => {
    const nagApp = new cdk.App();
    cdk.Aspects.of(nagApp).add(new AwsSolutionsChecks({ verbose: true }));
    const nagStack = new StorageStack(nagApp, "NagStorage", {
      env: { account: "123456789012", region: "us-east-1" },
    });

    const errors = Annotations.fromStack(nagStack).findError(
      "*",
      Match.stringLikeRegexp("AwsSolutions-.*")
    );
    expect(errors).toHaveLength(0);
  });
});
