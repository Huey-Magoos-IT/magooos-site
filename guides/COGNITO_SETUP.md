# AWS Cognito Setup Guide

## Important Notes About AWS Free Tier
- Cognito has a free tier of 50,000 monthly active users
- API Gateway has 1 million API calls free per month
- Make sure to check AWS free tier page for the most up-to-date information as pricing can change

## Prerequisites
- AWS Account with appropriate permissions
- Project codebase cloned and set up locally
- AWS CLI configured (optional but recommended)

## 1. Create Cognito User Pool

### Navigate to Cognito in AWS Console
1. Log into AWS Console
2. Search for "Cognito" in the services search bar
3. Click "Create user pool"

### Configure Sign-in Experience
1. Configure sign-in options:
   - Select "Username and email" 
   - Check "Allow users to sign in with preferred username"
   - Check "Make username case sensitive"
   - Click "Next"

2. Configure security requirements:
   - Keep Cognito defaults for password strength (requires one number, special character, uppercase, lowercase)
   - Set MFA to "No MFA" for simplicity
   - For account recovery, select "Email only"
   - Click "Next"

3. Configure sign-up experience:
   - Enable self-registration
   - Allow Cognito to automatically send verification messages
   - Set email verification method to "Send email message"
   - No additional required attributes needed
   - Use "Send email with Cognito" for simplicity (you can use SES for real emails in production)
   - Click "Next"

4. Configure message delivery:
   - Use Cognito's email functionality
   - Leave "FROM email address" as default
   - Click "Next"

5. Name your user pool:
   - Name: "pm-project-management-user-pool"
   - Click "Next"

6. Configure app integration:
   - Don't use Cognito hosted UI
   - Under "App clients", click "Create app client"
   - Name: "project-management-client"
   - Uncheck "Generate client secret"
   - Keep other defaults
   - Click "Create app client"
   - Click "Next" and then "Create user pool"

## 2. Create Lambda Trigger for User Creation

### Create Lambda Function
1. Go to Lambda in AWS Console
2. Click "Create function"
3. Select "Author from scratch"
4. Basic information:
   - Name: "pm-lambda-trigger"
   - Runtime: Node.js 18.x
   - Architecture: x86_64
   - Click "Create function"

### Add Lambda Function Code
The lambda function (`extras/post-confirmation-lambda.js`) syncs user data including email to the RDS database:
```javascript
import https from 'node:https';

export const handler = async (event) => {
  const postData = JSON.stringify({
    username: event.request.userAttributes.preferred_username || event.username,
    cognitoId: event.username,
    email: event.request.userAttributes.email,
    profilePictureUrl: "i1.jpeg",
    teamId: 1  // Default team ID
  });

  const options = {
    hostname: '[YOUR-API-GATEWAY-URL]', // Remove https:// and trailing slash
    port: 443,
    path: '/create-user',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    await new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        res.setEncoding('UTF-8');
        let responseBody = '';
        res.on('data', (chunk) => responseBody += chunk);
        res.on('end', () => resolve(responseBody));
      });

      req.on('error', (error) => reject(error));
      req.write(postData);
      req.end();
    });

    return event;
  } catch (error) {
    console.error('Error:', error);
    return event;
  }
};
```

## 3. Set Up API Gateway Authorization

### Create Cognito Authorizer
1. Go to API Gateway in AWS Console
2. Select your API
3. Go to "Authorizers"
4. Click "Create New Authorizer"
   - Name: "pm-api-gateway-authorizer"
   - Type: Cognito
   - User Pool: Select your created user pool
   - Token Source: "authorization"
   - Click "Create"

### Configure API Routes to Use Authorizer
1. Go to your API's Resources
2. For proxy integration:
   - Create a new resource
   - Check "Configure as proxy resource"
   - Resource Name: "{proxy+}"
   - Enable CORS
   - Click "Create Resource"

3. Set up integration:
   - Select "HTTP Proxy"
   - Endpoint URL: Your EC2 or backend URL
   - Click "Save"

## 4. Frontend Integration

### Install Required Packages
```bash
cd client
npm install aws-amplify @aws-amplify/ui-react
```

### Add Environment Variables
Create/modify .env.local in client directory:
```
NEXT_PUBLIC_COGNITO_USER_POOL_ID=your-user-pool-id
NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=your-client-id
```

### Configure Amplify
Add to client/src/app/authProvider.tsx:
```typescript
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "",
      userPoolClientId:
        process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID || "",
    },
  },
});

export default function AuthProvider({ children }: { children: any }) {
  return (
    <Authenticator>
      {({ user }) => user ? children : <h1>Please sign in below:</h1>}
    </Authenticator>
  );
}
```

### Customize Sign-up Form Fields
```typescript
const formFields = {
  signUp: {
    username: {
      order: 1,
      placeholder: 'Choose a username',
      label: 'Username',
      inputProps: { required: true }
    },
    email: {
      order: 2,
      placeholder: 'Enter your email address',
      label: 'Email',
      type: 'email',
      inputProps: { required: true }
    },
    password: {
      order: 3,
      placeholder: 'Enter your password',
      label: 'Password',
      type: 'password',
      inputProps: { required: true }
    },
    confirm_password: {
      order: 4,
      placeholder: 'Confirm your password',
      label: 'Confirm Password',
      type: 'password',
      inputProps: { required: true }
    }
  }
};

// The form includes email verification, and the post-confirmation lambda syncs email to the database.
```

### Add Auth Provider to App
Wrap your app with AuthProvider in client/src/app/layout.tsx:
```typescript
import AuthProvider from './authProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

## 5. Backend Integration

### Add User Creation Endpoint
Add to server/src/controllers/userController.ts:
```typescript
export const createUser = async (req, res) => {
  try {
    const { username, cognitoId, email, profilePictureUrl, teamId } = req.body;
    
    const user = await prisma.user.create({
      data: {
        username,
        cognitoId,
        email,
        profilePictureUrl,
        teamId
      }
    });

    res.json({ message: "User created successfully", user });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: "Error creating user" });
  }
};

// Supports user creation modals like ModalCreateUser and ModalCreateLocationUser, which include email.
```

Add to server/src/routes/userRoutes.ts:
```typescript
router.post('/create-user', createUser);
```

## 6. Connect Lambda to Cognito

### Add Lambda Trigger to User Pool
1. Go to your Cognito User Pool
2. Go to "User Pool Properties"
3. Under "Lambda triggers", find "Post confirmation"
4. Select your Lambda function
5. Click "Save changes"

## 7. Additional IAM Considerations for Backend Services

If your backend server (e.g., the Express application running on EC2, or other microservices) needs to perform administrative actions on users within this Cognito User Pool (such as disabling, enabling, or administratively updating user attributes), the IAM role associated with that backend service will require specific permissions targeting the User Pool.

For example, the backend service's IAM role (e.g., `EC2-Backend-CognitoDisableUser-Role` in the project) has an IAM policy granting permissions for actions like:
- `cognito-idp:AdminDisableUser`
- `cognito-idp:AdminEnableUser`
- `cognito-idp:AdminUpdateUserAttributes` for email and other attributes
- `cognito-idp:AdminGetUser` for user retrieval

These permissions are scoped to the specific User Pool resource:
`arn:aws:cognito-idp:us-east-2:974496641387:userpool/us-east-2_5rTsYPjpA`

**Example Policy Statement Snippet:**
```json
{
    "Effect": "Allow",
    "Action": [
        "cognito-idp:AdminDisableUser",
        "cognito-idp:AdminEnableUser",
        "cognito-idp:AdminUpdateUserAttributes",
        "cognito-idp:AdminGetUser"
    ],
    "Resource": "arn:aws:cognito-idp:us-east-2:974496641387:userpool/us-east-2_5rTsYPjpA"
}
```
This is distinct from the permissions required for Lambda triggers (like the post-confirmation trigger) or the API Gateway authorizer setup. Ensure that any backend service performing user management actions has its IAM role appropriately configured with these specific Cognito permissions.
## 7. AWS Amplify Hosting Configuration

### Add Environment Variables to Amplify
1. Go to AWS Amplify Console
2. Select your app
3. Go to "Environment variables"
4. Add variables:
   - NEXT_PUBLIC_COGNITO_USER_POOL_ID
   - NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID
5. Click "Save"
6. Redeploy your application

## 8. Add API Authorization Headers

In your API configuration (e.g., client/src/state/api.ts):
```typescript
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL,
  prepareHeaders: async (headers) => {
    const session = await fetchAuthSession();
    const accessToken = session.tokens?.accessToken;
    
    if (accessToken) {
      headers.set('authorization', `Bearer ${accessToken}`);
    }
    return headers;
  }
});
```

## Testing

1. Test User Registration:
   - Go to your deployed application
   - Click "Create Account"
   - Fill in required fields
   - Verify email
   - Check Cognito User Pool for new user
   - Check RDS database for new user entry

2. Test Authentication:
   - Sign in with created user
   - Verify JWT token in browser's local storage
   - Test protected API endpoints
   - Verify user session persistence

3. Test Sign Out:
   - Click sign out
   - Verify redirect to login
   - Verify token removal
   - Verify protected routes are inaccessible

## Common Issues & Troubleshooting

1. CORS Issues:
   - Ensure API Gateway has proper CORS configuration
   - Check browser console for CORS errors
   - Verify API Gateway deployment after CORS changes

2. Authorization Errors:
   - Check JWT token format in requests
   - Verify Cognito Authorizer configuration
   - Check API Gateway logs for authorization failures

3. Lambda Trigger Issues:
   - Check CloudWatch logs for Lambda execution errors
   - Verify Lambda IAM roles and permissions
   - Check network access for Lambda to API Gateway

4. User Pool Configuration:
   - Verify email verification settings
   - Check password policies
   - Verify app client settings

## Security Considerations

1. Token Management:
   - Implement token refresh logic
   - Secure token storage
   - Handle token expiration

2. API Security:
   - Use HTTPS only
   - Implement rate limiting
   - Monitor API usage

3. User Data:
   - Minimize sensitive data in JWT tokens
   - Implement proper error handling
   - Log security events

## Maintenance

1. Regular Tasks:
   - Monitor CloudWatch logs
   - Check API Gateway metrics
   - Review Cognito user pool activity

2. Updates:
   - Keep dependencies updated
   - Review AWS security recommendations
   - Update Lambda function as needed

3. Backup:
   - Regular database backups
   - Configuration backups
   - Document all changes

## Cost Management

1. Set up AWS Budget:
   - Create a zero-spend budget alert
   - Set threshold to $0.10 to avoid early warnings
   - Configure email notifications

2. Monitor Free Tier Usage:
   - Check AWS Free Tier page regularly
   - Monitor usage in AWS Console
   - Set up CloudWatch alarms for limits

3. Avoid Common Charges:
   - Be careful with IPv4 addresses
   - Disable automatic backups if not needed
   - Monitor storage autoscaling