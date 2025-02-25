# API Gateway Setup for Lambda Integration

This guide provides instructions for setting up the API Gateway to invoke the Lambda function `Qu_API_Extraction_3-0` for the Data Department page.

## Prerequisites

- AWS Console access with appropriate permissions
- The Lambda function `Qu_API_Extraction_3-0` already exists

## Steps

### 1. Create API Gateway Resource

1. Go to the AWS Console and navigate to API Gateway
2. Select the API with ID `puvzjk01yl`
3. Go to "Resources" in the left sidebar
4. Select the root resource (`/`) or the `/prod` resource
5. Click "Actions" dropdown and select "Create Resource"
6. Configure the resource:
   - Resource Name: `lambda`
   - Resource Path: `/lambda`
   - Check "Enable API Gateway CORS" if needed
7. Click "Create Resource"

### 2. Create Child Resource

1. Select the newly created `/lambda` resource
2. Click "Actions" dropdown and select "Create Resource"
3. Configure the resource:
   - Resource Name: `Qu_API_Extraction_3-0`
   - Resource Path: `/Qu_API_Extraction_3-0`
   - Check "Enable API Gateway CORS" if needed
4. Click "Create Resource"

### 3. Create POST Method

1. Select the `/lambda/Qu_API_Extraction_3-0` resource
2. Click "Actions" dropdown and select "Create Method"
3. Select "POST" from the dropdown and click the checkmark
4. Configure the method:
   - Integration type: Lambda Function
   - Lambda Region: us-east-2
   - Lambda Function: `Qu_API_Extraction_3-0`
   - Use Lambda Proxy integration: Yes
5. Click "Save"
6. When prompted to add permissions to the Lambda function, click "OK"

### 4. Configure CORS (if needed)

1. Select the `/lambda/Qu_API_Extraction_3-0` resource
2. Click "Actions" dropdown and select "Enable CORS"
3. Configure CORS settings:
   - Access-Control-Allow-Origin: `'https://master.d25xr2dg5ij9ce.amplifyapp.com'`
   - Access-Control-Allow-Headers: `'Content-Type,Authorization'`
   - Access-Control-Allow-Methods: `'OPTIONS,POST'`
4. Click "Enable CORS and replace existing CORS headers"
5. Click "Yes, replace existing values"

### 5. Deploy API

1. Click "Actions" dropdown and select "Deploy API"
2. Select "prod" as the deployment stage
3. Add a deployment description (e.g., "Added Lambda integration for Data Department")
4. Click "Deploy"

### 6. Test the Integration

1. In the API Gateway console, go to the "Resources" section
2. Select the POST method under `/lambda/Qu_API_Extraction_3-0`
3. Click the "Test" tab
4. Enter a test payload:
   ```json
   {
     "start_date": "01152025",
     "end_date": "01152025",
     "output_bucket": "redflag-reporting",
     "location_id": "1767,1825,4045",
     "discount_ids": [77406, 135733]
   }
   ```
5. Click "Test" to execute the request
6. Verify that the Lambda function is invoked successfully

## Troubleshooting

### Lambda Permission Issues

If you encounter permission issues, you may need to manually add a resource-based policy to the Lambda function:

1. Go to the Lambda console
2. Select the function `Qu_API_Extraction_3-0`
3. Go to the "Permissions" tab
4. Add a resource-based policy to allow API Gateway to invoke the function:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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

### CORS Issues

If you encounter CORS issues when testing from the frontend:

1. Ensure that the API Gateway CORS configuration is correct
2. Check that the Lambda function is returning the appropriate CORS headers
3. Verify that the frontend is making requests to the correct endpoint

## Conclusion

Once the API Gateway is configured correctly, the Data Department page will be able to invoke the Lambda function to generate reports. The reports will be stored in the S3 bucket and displayed on the page.