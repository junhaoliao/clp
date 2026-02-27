import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface VpcStackProps extends cdk.StackProps {
  /** Number of NAT gateways. Defaults to 1 for cost optimization. */
  natGateways?: number;
}

export class VpcStack extends cdk.Stack {
  public readonly vpc: ec2.Vpc;

  constructor(scope: Construct, id: string, props?: VpcStackProps) {
    super(scope, id, props);

    this.vpc = new ec2.Vpc(this, "Vpc", {
      ipAddresses: ec2.IpAddresses.cidr("10.0.0.0/16"),
      maxAzs: 2,
      natGateways: props?.natGateways ?? 1,
      subnetConfiguration: [
        {
          name: "Public",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "Private",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        },
      ],
    });

    // Add VPC flow logs for compliance
    this.vpc.addFlowLog("FlowLog", {
      destination: ec2.FlowLogDestination.toCloudWatchLogs(),
    });

    NagSuppressions.addStackSuppressions(this, [
      {
        id: "AwsSolutions-VPC7",
        reason: "VPC flow logs are enabled via addFlowLog above.",
      },
      {
        id: "AwsSolutions-IAM5",
        reason:
          "VPC flow log role uses managed policy with wildcards as required by CloudWatch Logs.",
      },
    ]);
  }
}
