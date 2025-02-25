# Lambda Function Permissions Guide

This guide outlines the necessary IAM roles and permissions for the Lambda function `Qu_API_Extraction_3-0` to function properly within the MagooOS architecture.

## Required IAM Roles and Policies

The Lambda function needs the following permissions to operate correctly:

### 1. Basic Execution Role

At minimum, the Lambda function needs the `AWSLambdaBasicExecutionRole` which allows it to:
- Create CloudWatch log groups
- Create CloudWatch log streams
- Put log events into CloudWatch

This is the policy document for the basic execution role:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "logs:CreateLogGroup",
            "Resource": "arn:aws:logs:us-east-2:974496641387:*"
        },
        {
            "Effect": "Allow",
            "Action": [
                "logs:CreateLogStream",
                "logs:PutLogEvents"
            ],
            "Resource": [
                "arn:aws:logs:us-east-2:974496641387:log-group:/aws/lambda/Qu_API_Extraction_3-0:*"
            ]
        }
    ]
}
```

### 2. S3 Access

Since the Lambda function needs to write data to the S3 bucket "redflag-reporting", it needs the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::redflag-reporting",
                "arn:aws:s3:::redflag-reporting/*"
            ]
        }
    ]
}
```

### 3. API Gateway Invocation Permission

For the API Gateway to invoke the Lambda function, a resource-based policy must be attached to the Lambda function:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowAPIGatewayInvoke",
            "Effect": "Allow",
            "Principal": {
                "Service": "apigateway.amazonaws.com"
            },
            "Action": "lambda:InvokeFunction",
            "Resource": "arn:aws:lambda:us-east-2:974496641387:function:Qu_API_Extraction_3-0",
            "Condition": {
                "ArnLike": {
                    "AWS:SourceArn": "arn:aws:execute-api:us-east-2:974496641387:puvzjk01yl/*/POST/lambda/Qu_API_Extraction_3-0"
                }
            }
        }
    ]
}
```

Note the `"Sid": "AllowAPIGatewayInvoke"` which is a unique Statement ID that identifies this particular permission statement.

### 4. VPC Access (If Needed)

If the Lambda function needs to access resources in a VPC (like an RDS database), it needs the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "ec2:CreateNetworkInterface",
                "ec2:DescribeNetworkInterfaces",
                "ec2:DeleteNetworkInterface",
                "ec2:AssignPrivateIpAddresses",
                "ec2:UnassignPrivateIpAddresses"
            ],
            "Resource": "*"
        }
    ]
}
```

## How to Configure Permissions

### Option 1: Use Existing Role

If you already have a role with appropriate permissions (like the one used for the Cognito trigger Lambda), you can reuse it:

1. Go to the Lambda function in the AWS Console
2. Go to the "Configuration" tab
3. Click on "Permissions"
4. Click "Edit" next to the execution role
5. Select "Use an existing role"
6. Choose the role "huey-site-lambda-trigger-role-3jzovpze"

### Option 2: Create a New Role

If you prefer to create a dedicated role for this Lambda function:

1. Go to the IAM console
2. Click "Roles" in the left sidebar
3. Click "Create role"
4. Select "AWS service" as the trusted entity type
5. Select "Lambda" as the service
6. Click "Next: Permissions"
7. Attach the following policies:
   - AWSLambdaBasicExecutionRole
   - AmazonS3FullAccess (or a more restricted policy as shown above)
8. Click "Next: Tags"
9. Add any tags if needed
10. Click "Next: Review"
11. Name the role "Qu_API_Extraction_3-0-role"
12. Click "Create role"

### Adding Resource-Based Policy

After setting up the execution role, you need to add the resource-based policy to allow API Gateway to invoke the Lambda:

1. Go to the Lambda function in the AWS Console
2. Go to the "Permissions" tab
3. Under "Resource-based policy statements", click "Add permissions"
4. Select "AWS service" as the principal
5. Select "API Gateway" as the service
6. For "Source ARN", enter: `arn:aws:execute-api:us-east-2:974496641387:puvzjk01yl/*/POST/lambda/Qu_API_Extraction_3-0`
7. For "Statement ID", enter: `AllowAPIGatewayInvoke` (this must be unique within the policy)
8. For "Action", select: `lambda:InvokeFunction` (this is the action that API Gateway needs to invoke the Lambda)
9. Click "Save"

## Verifying Permissions

To verify that the permissions are set up correctly:

1. Test the API Gateway endpoint as described in the API_GATEWAY_SETUP.md guide
2. Check the CloudWatch logs for the Lambda function to see if there are any permission errors
3. If you see errors like "Access Denied", review the IAM roles and policies

## Troubleshooting Common Permission Issues

### S3 Access Issues

If the Lambda function can't write to the S3 bucket, check:
- The bucket name is correct in the Lambda code
- The IAM role has the necessary S3 permissions
- The bucket policy doesn't restrict access

### API Gateway Invocation Issues

If API Gateway can't invoke the Lambda function, check:
- The resource-based policy is correctly configured
- The API Gateway endpoint ARN is correct
- The API Gateway deployment was successful

### VPC Access Issues

If the Lambda function needs to access resources in a VPC but can't, check:
- The Lambda function is configured to use the correct VPC
- The security groups allow the necessary traffic
- The IAM role has the necessary VPC permissions