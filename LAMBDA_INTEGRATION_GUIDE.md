# Lambda Function Integration Guide for MagooOS

This guide provides end-to-end instructions for adding new Lambda functions to the MagooOS architecture while maintaining consistency with existing patterns.

## 1. Create Lambda Function

### Implementation Template
```typescript
import { PrismaClient } from '@prisma/client';
import https from 'node:https';
import AWS from 'aws-sdk';

const prisma = new PrismaClient();
const secretsManager = new AWS.SecretsManager();

export const handler = async (event) => {
  try {
    console.log("Lambda triggered with event:", JSON.stringify(event, null, 2));
    
    // 1. Process request
    const result = await prisma.task.findMany({
      where: { projectId: event.projectId },
      include: { author: true }
    });

    // 2. Notify API Gateway if needed
    await notifyApiGateway(result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error('Lambda error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function notifyApiGateway(data) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "puvzjk01yl.execute-api.us-east-2.amazonaws.com",
      path: "/prod/task-updates",
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => resolve(responseData));
    });
    
    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}
```

## 2. AWS Infrastructure Setup

### Lambda Function Creation
1. Navigate to AWS Lambda console
2. Click "Create function"
3. Select "Author from scratch"
4. Configure basic settings:
   - Name: `magooos-[function-name]` (e.g., `magooos-task-processor`)
   - Runtime: Node.js 18.x
   - Architecture: x86_64
   - Execution role: Use existing role `huey-site-lambda-trigger-role-3jzovpze`
5. Click "Create function"

### VPC Configuration
Configure the Lambda to run in the same VPC as the RDS database:

1. In the Lambda function configuration, go to "VPC" section
2. Click "Edit"
3. Select:
   - VPC: `vpc-08bef18ff975172bc` (huey_vpc)
   - Subnets: Select private subnets (not `subnet-0faa424cc9d894d87` which is public)
   - Security groups: Select the security group that allows access to RDS
4. Click "Save"

### IAM Role Configuration
The existing role `huey-site-lambda-trigger-role-3jzovpze` has the following policies:
- AmazonAPIGatewayInvokeFullAccess
- AmazonRDSFullAccess
- AmazonVPCFullAccess
- AWSLambdaBasicExecutionRole-0fe8f9e4-06ee-4b61-9fe6-a7aeef954403

If you need additional permissions, add them to this role or create a new role with similar permissions.

## 3. API Gateway Integration

### Add Resource and Method
1. Go to API Gateway console
2. Select API ID: `puvzjk01yl`
3. Navigate to Resources
4. Select the parent resource where you want to add your endpoint
   - For a new top-level endpoint, select the root resource
   - For a sub-resource, select the appropriate parent
5. Click "Create Resource"
   - Resource Name: Your endpoint name (e.g., "task-processor")
   - Resource Path: Your endpoint path (e.g., "/task-processor")
   - Enable CORS: Check if needed
6. Click "Create Resource"
7. With your new resource selected, click "Create Method"
8. Select HTTP method (GET, POST, etc.) and click the checkmark
9. Configure the method:
   - Integration type: Lambda Function
   - Lambda Region: us-east-2
   - Lambda Function: Your function name
   - Use Default Timeout: Checked
10. Click "Save"

### Alternative: Use Existing Proxy Resource
If you want to use the existing proxy integration:

1. Your Lambda can be invoked through the `/{proxy+}` resource (Resource ID: `joaq73`)
2. The path would be: `/your-function-path`
3. The full URL would be: `https://puvzjk01yl.execute-api.us-east-2.amazonaws.com/prod/your-function-path`

### Deploy API Changes
1. Click "Actions" dropdown
2. Select "Deploy API"
3. Deployment stage: "prod"
4. Deployment description: Brief description of your changes
5. Click "Deploy"

## 4. Cognito Integration (if needed)

If your Lambda needs to be triggered by Cognito events:

1. Go to Cognito User Pools
2. Select your user pool (either `us-east-2_DFYcwTG48` or `us-east-2_5rTsYPjpA`)
3. Go to "User Pool Properties"
4. Under "Lambda triggers", find the appropriate trigger (e.g., "Post confirmation")
5. Select your Lambda function
6. Click "Save changes"

This will automatically add the necessary resource-based policy to your Lambda function.

## 5. Frontend Integration

```typescript
// client/src/state/api.ts
export const api = createApi({
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
    prepareHeaders: async (headers) => {
      const session = await fetchAuthSession();
      headers.set('Authorization', `Bearer ${session.tokens?.accessToken}`);
      return headers;
    }
  }),
  endpoints: (build) => ({
    // Add your new endpoint
    processTask: build.mutation({
      query: (payload) => ({
        url: 'task-processor', // The path you configured in API Gateway
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Tasks']
    })
  })
});

// Add to exports
export const {
  // Existing exports...
  useProcessTaskMutation
} = api;
```

## 6. Testing Your Lambda

### Test in Lambda Console
1. In the Lambda console, go to the "Test" tab
2. Create a new test event with sample data
3. Click "Test" to execute the function

### Test via API Gateway
1. In API Gateway console, go to your method
2. Click the "Test" tab
3. Configure test request (headers, query strings, request body)
4. Click "Test" to execute

### Test from Frontend
```typescript
import { useProcessTaskMutation } from '@/state/api';

function YourComponent() {
  const [processTask, { isLoading, error }] = useProcessTaskMutation();
  
  const handleSubmit = async (data) => {
    try {
      const result = await processTask(data).unwrap();
      console.log('Success:', result);
    } catch (err) {
      console.error('Error:', err);
    }
  };
  
  return (
    <button onClick={() => handleSubmit({ projectId: 1 })}>
      Process Task
    </button>
  );
}
```

## 7. Monitoring and Troubleshooting

### CloudWatch Logs
1. Go to CloudWatch console
2. Navigate to "Log groups"
3. Find your Lambda's log group: `/aws/lambda/magooos-[function-name]`
4. Click on the log group to view log streams

### Common Issues and Solutions

#### CORS Issues
If you encounter CORS errors:
1. In API Gateway, select your resource
2. Click "Actions" > "Enable CORS"
3. Configure CORS settings:
   - Access-Control-Allow-Origin: 'https://master.d25xr2dg5ij9ce.amplifyapp.com'
   - Access-Control-Allow-Headers: 'Content-Type,Authorization'
   - Access-Control-Allow-Methods: 'OPTIONS,POST,GET'
4. Click "Save" and redeploy the API

#### VPC Connectivity Issues
If your Lambda can't connect to RDS or other resources:
1. Ensure Lambda is in the correct VPC and subnets
2. Check security group rules allow necessary traffic
3. Verify NAT Gateway `nat-07dc202d907238542` is functioning properly

#### Permission Issues
If you see "Access Denied" errors:
1. Check CloudWatch logs for specific permission errors
2. Review the IAM role permissions
3. Add missing permissions as needed

## 8. Security Best Practices

1. **Least Privilege Principle**:
   - Use the existing role or create a new one with only necessary permissions
   - Regularly audit and remove unused permissions

2. **Environment Variables**:
   - Use environment variables for configuration
   - Don't hardcode sensitive information in your code

3. **Input Validation**:
   - Validate all input parameters
   - Implement proper error handling

4. **Logging and Monitoring**:
   - Log appropriate information for debugging
   - Don't log sensitive data
   - Set up CloudWatch alarms for errors

This guide aligns with existing patterns in:
- `server/src/lambda/index.js`
- `COGNITO_SETUP.md`
- `client/src/state/api.ts`