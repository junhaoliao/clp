import { beforeEach, describe, expect, test } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { AwsSolutionsChecks } from "cdk-nag";
import { VpcStack } from "../lib/vpc-stack";

describe("VpcStack", () => {
  let app: cdk.App;
  let stack: VpcStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new VpcStack(app, "TestVpc", {
      env: { account: "123456789012", region: "us-east-1" },
    });
    template = Template.fromStack(stack);
  });

  test("creates a VPC", () => {
    template.resourceCountIs("AWS::EC2::VPC", 1);
  });

  test("VPC has the correct CIDR block", () => {
    template.hasResourceProperties("AWS::EC2::VPC", {
      CidrBlock: "10.0.0.0/16",
    });
  });

  test("creates public subnets", () => {
    template.hasResourceProperties("AWS::EC2::Subnet", {
      MapPublicIpOnLaunch: true,
    });
  });

  test("creates private subnets", () => {
    template.hasResourceProperties("AWS::EC2::Subnet", {
      MapPublicIpOnLaunch: false,
    });
  });

  test("NAT gateway count defaults to 1", () => {
    template.resourceCountIs("AWS::EC2::NatGateway", 1);
  });

  test("NAT gateway count is configurable", () => {
    const customApp = new cdk.App();
    const customStack = new VpcStack(customApp, "TestVpc2Nat", {
      env: { account: "123456789012", region: "us-east-1" },
      natGateways: 2,
    });
    const customTemplate = Template.fromStack(customStack);
    customTemplate.resourceCountIs("AWS::EC2::NatGateway", 2);
  });

  test("cdk-nag produces no errors", () => {
    const nagApp = new cdk.App();
    cdk.Aspects.of(nagApp).add(new AwsSolutionsChecks({ verbose: true }));
    const nagStack = new VpcStack(nagApp, "NagVpc", {
      env: { account: "123456789012", region: "us-east-1" },
    });
    cdk.Aspects.of(nagApp).add(new AwsSolutionsChecks());

    const errors = Annotations.fromStack(nagStack).findError(
      "*",
      Match.stringLikeRegexp("AwsSolutions-.*")
    );
    expect(errors).toHaveLength(0);
  });
});
