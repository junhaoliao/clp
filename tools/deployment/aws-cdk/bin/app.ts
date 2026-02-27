#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { VpcStack } from "../lib/vpc-stack";
import { EksStack } from "../lib/eks-stack";
import { StorageStack } from "../lib/storage-stack";
import { ClpStack } from "../lib/clp-stack";

const app = new cdk.App();

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
};

// Apply cdk-nag compliance checks globally
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const vpcStack = new VpcStack(app, "ClpVpc", {
  env,
  natGateways: app.node.tryGetContext("natGateways") ?? 1,
});

const eksStack = new EksStack(app, "ClpEks", {
  env,
  vpc: vpcStack.vpc,
});

const storageStack = new StorageStack(app, "ClpStorage", { env });

new ClpStack(app, "ClpHelm", {
  env,
  cluster: eksStack.cluster,
  archiveBucket: storageStack.archiveBucket,
});

app.synth();
