import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import {VPC} from '../constructs/network-layer/vpc';

export interface Props extends cdk.StackProps {
  myIpAddress: string
}

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // VPC
    new VPC(this, "VPC")


    const { accountId } = new cdk.ScopedAws(this);

    // Create Bucket
    const bucket = new cdk.aws_s3.Bucket(this, 'AssetBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // OAC
    // NOTE: S3をpublicアクセスを許可せずCloudFrontのみからアクセスさせるために必要
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

    // Lambda
    const lambda = new cdk.aws_lambda.Function(this, 'FetchDisneyWaitTimeFunc', {
      code: cdk.aws_lambda.Code.fromAsset('lambda'),
      handler: 'index.lambda_handler', // 実行するファイル名.関数名
      runtime: Runtime.PYTHON_3_11, // レイヤーのライブラリに合わせる
      timeout: cdk.Duration.seconds(20),
      architecture: cdk.aws_lambda.Architecture.ARM_64
    });

    // 事前に手動用意したレイヤーを読み込む
    // TODO: レイヤーの作成もコード化したい
    lambda.addLayers(
      cdk.aws_lambda.LayerVersion.fromLayerVersionArn(this, 'requestsLayer', 'arn:aws:lambda:ap-northeast-1:242702784610:layer:pip-libraries:1')
    )

    // API Gateway
    const api = new cdk.aws_apigateway.RestApi(this,'APIGatewayForLambda',
      {
        deployOptions: {
          stageName: 'v1',
        },
      }
    );

    const park = api.root.addResource('waittime')
    park.addMethod(
      'GET', 
      new cdk.aws_apigateway.LambdaIntegration(lambda),
      {
        requestParameters:{
          "method.request.querystring.park": true,
        }
      }
    );

    // Output the API URL after deployment
    new cdk.CfnOutput(this, 'ApiUrlOutput', {
      value: api.url,
      description: 'API URL',
    });
  }
}
