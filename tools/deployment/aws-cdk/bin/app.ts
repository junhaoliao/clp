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

// Optional per-user namespace to allow multiple deployments in the same account.
// Usage: npx cdk deploy --all -c ns=junhao
const ns = app.node.tryGetContext("ns");
const prefix = ns ? `${ns}-` : "";

// Apply cdk-nag compliance checks globally
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const vpcStack = new VpcStack(app, `${prefix}ClpVpc`, {
  env,
  natGateways: app.node.tryGetContext("natGateways") ?? 1,
});

const eksStack = new EksStack(app, `${prefix}ClpEks`, {
  env,
  vpc: vpcStack.vpc,
});

const storageStack = new StorageStack(app, `${prefix}ClpStorage`, { env });

new ClpStack(app, `${prefix}ClpHelm`, {
  env,
  cluster: eksStack.cluster,
  archiveBucket: storageStack.archiveBucket,
});

app.synth();
