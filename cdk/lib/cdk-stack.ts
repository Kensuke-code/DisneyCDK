import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { accountId } = new cdk.ScopedAws(this);

    // Create Bucket
    const bucket = new cdk.aws_s3.Bucket(this, 'AssetBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // OAC
    const cfnOriginAccessControl = new cdk.aws_cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
          name: 'OriginAccessControlForContentsBucket',
          originAccessControlOriginType: 's3',
          signingBehavior: 'always',
          signingProtocol: 'sigv4',
          description: 'Access Control',
      },
    });

    // CloudFront
    const distribution = new cdk.aws_cloudfront.Distribution(this, 'AssetDistribution', {
      comment: 'distribution.',
      defaultBehavior: {
        origin: new cdk.aws_cloudfront_origins.S3Origin(bucket),
      },
    });

    const cfnDistribution = distribution.node.defaultChild as cdk.aws_cloudfront.CfnDistribution;
    // OAI削除（勝手に設定されるため）
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.S3OriginConfig.OriginAccessIdentity', '');
    // OAC設定
    cfnDistribution.addPropertyOverride('DistributionConfig.Origins.0.OriginAccessControlId', cfnOriginAccessControl.attrId);

    // S3 BucketPolicy
    const contentsBucketPolicyStatement = new cdk.aws_iam.PolicyStatement({
      actions: ['s3:GetObject'],
      effect: cdk.aws_iam.Effect.ALLOW,
      principals: [
        new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com'),
      ],
      resources: [`${bucket.bucketArn}/*`],
    });
    contentsBucketPolicyStatement.addCondition('StringEquals', {
      'AWS:SourceArn': `arn:aws:cloudfront::${accountId}:distribution/${distribution.distributionId}`
    })
    bucket.addToResourcePolicy(contentsBucketPolicyStatement);

  }
}
