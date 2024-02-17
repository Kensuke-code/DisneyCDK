import { Construct } from "constructs";
import * as ec2 from "aws-cdk-lib/aws-ec2";

export class VPC extends Construct {

  constructor(scope: Construct, id: string) {
    super(scope,id);

    // VPC
    const vpc = new ec2.Vpc(this, 'Vpc', {
      ipAddresses: ec2.IpAddresses.cidr('10.0.0.0/16'),
      subnetConfiguration: [
        {
          name: 'PublicSubnet',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24
        }
      ]
    });

    // SecurityGroup
    const securityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
      vpc: vpc,
    });

    // Allow SSH access on port tcp/22
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22)
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80)
    );
    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443)
    );

    // UserData
    const userData = ec2.UserData.forLinux({ shebang: '#!/bin/bash -x' })
    userData.addCommands(
      'yum -y update',
      'yum -y install git',
      'yum -y install docker',
      'usermod -a -G docker ec2-user',
      'systemctl start docker',
      'systemctl enable docker',
      'mkdir -p /usr/local/lib/docker/cli-plugins/',
      'curl -SL https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-linux-aarch64 -o /usr/local/lib/docker/cli-plugins/docker-compose',
      'chmod +x /usr/local/lib/docker/cli-plugins/docker-compose'
    )

    const machineImage = ec2.MachineImage.latestAmazonLinux2023({
      edition: ec2.AmazonLinuxEdition.STANDARD,
      cpuType: ec2.AmazonLinuxCpuType.ARM_64,
    });

    // EC2インスタンス作成
    const instance = new ec2.Instance(this, 'DisneyGachaInstance', {
      vpc: vpc,
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      userData: userData,
      securityGroup: securityGroup,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC
      },
      ssmSessionPermissions: true,
      machineImage: machineImage
    });

    // ElasticIP
    new ec2.CfnEIP(this, "ElasticIP",{
      domain: "vpc",
      instanceId: instance.instanceId
    });

  }

}