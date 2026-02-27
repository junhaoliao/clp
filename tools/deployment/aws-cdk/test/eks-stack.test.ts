import { beforeEach, describe, expect, test } from "vitest";
import * as cdk from "aws-cdk-lib";
import { Annotations, Match, Template } from "aws-cdk-lib/assertions";
import { AwsSolutionsChecks } from "cdk-nag";
import { VpcStack } from "../lib/vpc-stack";
import { EksStack } from "../lib/eks-stack";

describe("EksStack", () => {
  let app: cdk.App;
  let vpcStack: VpcStack;
  let eksStack: EksStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    const env = { account: "123456789012", region: "us-east-1" };
    vpcStack = new VpcStack(app, "TestVpc", { env });
    eksStack = new EksStack(app, "TestEks", { env, vpc: vpcStack.vpc });
    template = Template.fromStack(eksStack);
  });

  test("EKS cluster is created", () => {
    template.resourceCountIs("Custom::AWSCDK-EKS-Cluster", 1);
  });

  test("EKS cluster uses Kubernetes 1.32", () => {
    template.hasResourceProperties("Custom::AWSCDK-EKS-Cluster", {
      Config: Match.objectLike({
        version: "1.32",
      }),
    });
  });

  test("control plane logging is enabled", () => {
    template.hasResourceProperties("Custom::AWSCDK-EKS-Cluster", {
      Config: Match.objectLike({
        logging: {
          clusterLogging: [
            {
              enabled: true,
              types: Match.arrayWith(["api", "audit", "authenticator"]),
            },
          ],
        },
      }),
    });
  });

  test("cluster endpoint is configured for private access", () => {
    template.hasResourceProperties("Custom::AWSCDK-EKS-Cluster", {
      Config: Match.objectLike({
        resourcesVpcConfig: Match.objectLike({
          endpointPrivateAccess: true,
        }),
      }),
    });
  });

  test("system node group exists with On-Demand capacity", () => {
    template.hasResourceProperties("AWS::EKS::Nodegroup", {
      CapacityType: "ON_DEMAND",
    });
  });

  test("worker node group exists with Spot capacity", () => {
    template.hasResourceProperties("AWS::EKS::Nodegroup", {
      CapacityType: "SPOT",
    });
  });

  test("worker node group uses Graviton instance types", () => {
    template.hasResourceProperties("AWS::EKS::Nodegroup", {
      CapacityType: "SPOT",
      InstanceTypes: Match.arrayWith(["c7g.xlarge"]),
    });
  });

  test("cluster is exported for other stacks", () => {
    expect(eksStack.cluster).toBeDefined();
  });

  test("cdk-nag produces no errors", () => {
    const nagApp = new cdk.App();
    const env = { account: "123456789012", region: "us-east-1" };
    cdk.Aspects.of(nagApp).add(new AwsSolutionsChecks({ verbose: true }));
    const nagVpc = new VpcStack(nagApp, "NagVpc", { env });
    const nagEks = new EksStack(nagApp, "NagEks", { env, vpc: nagVpc.vpc });

    const errors = Annotations.fromStack(nagEks).findError(
      "*",
      Match.stringLikeRegexp("AwsSolutions-.*")
    );
    expect(errors).toHaveLength(0);
  });
});
