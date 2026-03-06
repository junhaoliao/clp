import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as eks from "aws-cdk-lib/aws-eks";
import * as iam from "aws-cdk-lib/aws-iam";
import { KubectlV32Layer } from "@aws-cdk/lambda-layer-kubectl-v32";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface EksStackProps extends cdk.StackProps {
  vpc: ec2.IVpc;
}

export class EksStack extends cdk.Stack {
  public readonly cluster: eks.Cluster;

  constructor(scope: Construct, id: string, props: EksStackProps) {
    super(scope, id, props);

    const mastersRole = new iam.Role(this, "ClusterAdminRole", {
      assumedBy: new iam.AccountRootPrincipal(),
    });

    this.cluster = new eks.Cluster(this, "Cluster", {
      vpc: props.vpc,
      vpcSubnets: [{ subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }],
      version: eks.KubernetesVersion.V1_32,
      kubectlLayer: new KubectlV32Layer(this, "KubectlLayer"),
      defaultCapacity: 0,
      mastersRole,
      endpointAccess: eks.EndpointAccess.PUBLIC_AND_PRIVATE,
      clusterLogging: [
        eks.ClusterLoggingTypes.API,
        eks.ClusterLoggingTypes.AUDIT,
        eks.ClusterLoggingTypes.AUTHENTICATOR,
        eks.ClusterLoggingTypes.CONTROLLER_MANAGER,
        eks.ClusterLoggingTypes.SCHEDULER,
      ],
    });

    // System node group: On-Demand x86_64 for core services
    this.cluster.addNodegroupCapacity("SystemNodeGroup", {
      instanceTypes: [new ec2.InstanceType("m5.large")],
      capacityType: eks.CapacityType.ON_DEMAND,
      minSize: 2,
      maxSize: 4,
      desiredSize: 2,
      labels: { role: "system" },
    });

    // EBS CSI driver for dynamic PV provisioning
    const ebsCsiRole = new iam.Role(this, "EbsCsiDriverRole", {
      assumedBy: new iam.FederatedPrincipal(
        this.cluster.openIdConnectProvider.openIdConnectProviderArn,
        {},
        "sts:AssumeRoleWithWebIdentity"
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonEBSCSIDriverPolicy"
        ),
      ],
    });

    new eks.CfnAddon(this, "EbsCsiAddon", {
      addonName: "aws-ebs-csi-driver",
      clusterName: this.cluster.clusterName,
      serviceAccountRoleArn: ebsCsiRole.roleArn,
    });

    // gp3 StorageClass (set as default)
    new eks.KubernetesManifest(this, "Gp3StorageClass", {
      cluster: this.cluster,
      manifest: [
        {
          apiVersion: "storage.k8s.io/v1",
          kind: "StorageClass",
          metadata: {
            name: "gp3",
            annotations: {
              "storageclass.kubernetes.io/is-default-class": "true",
            },
          },
          provisioner: "ebs.csi.aws.com",
          parameters: {
            type: "gp3",
          },
          volumeBindingMode: "WaitForFirstConsumer",
          reclaimPolicy: "Delete",
        },
      ],
    });

    // Worker node group: Spot x86_64 for compression/query workers
    this.cluster.addNodegroupCapacity("WorkerNodeGroup", {
      instanceTypes: [
        new ec2.InstanceType("c5.xlarge"),
        new ec2.InstanceType("c5.2xlarge"),
        new ec2.InstanceType("m5.xlarge"),
        new ec2.InstanceType("m5.2xlarge"),
      ],
      capacityType: eks.CapacityType.SPOT,
      minSize: 0,
      maxSize: 10,
      desiredSize: 2,
      labels: { role: "worker" },
    });

    NagSuppressions.addStackSuppressions(
      this,
      [
        {
          id: "AwsSolutions-IAM4",
          reason:
            "EKS managed node groups require AWS managed policies (AmazonEKSWorkerNodePolicy, AmazonEC2ContainerRegistryReadOnly, AmazonEKS_CNI_Policy).",
        },
        {
          id: "AwsSolutions-IAM5",
          reason:
            "EKS cluster and node group roles require wildcard permissions for kubectl and CloudFormation custom resources.",
        },
        {
          id: "AwsSolutions-EKS1",
          reason:
            "Public endpoint access is enabled alongside private access for initial cluster setup. In production, restrict to private-only.",
        },
        {
          id: "AwsSolutions-L1",
          reason:
            "Lambda runtime version is managed by the CDK EKS construct and kubectl layer.",
        },
        {
          id: "AwsSolutions-SF1",
          reason:
            "Step Function is an internal CDK EKS cluster resource provider. Logging configuration is managed by CDK.",
        },
        {
          id: "AwsSolutions-SF2",
          reason:
            "Step Function is an internal CDK EKS cluster resource provider. X-Ray tracing is managed by CDK.",
        },
      ],
      true
    );
  }
}
