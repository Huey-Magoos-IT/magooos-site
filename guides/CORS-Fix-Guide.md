# How to Fix the CORS Error in API Gateway

The error "blocked by CORS policy" means your API Gateway isn't configured to accept requests from your frontend's domain. Here’s how to fix it for your HTTP API.

## Step 1: Navigate to the API Gateway Console

1.  Open the [AWS Management Console](https://aws.amazon.com/console/).
2.  Go to the **API Gateway** service.
3.  Find and select your HTTP API, which appears to be `sutpql04fb`.

## Step 2: Configure CORS

1.  In the left-hand navigation pane, under your API's name, click on **CORS**.
2.  You will see a configuration screen. You need to tell it which domains (origins), headers, and methods are allowed. Enter the following values:
    *   **Access-Control-Allow-Origin**: `https://master.d25xr2dg5ij9ce.amplifyapp.com`
        *   This is the most critical part. It explicitly tells the browser that your Amplify app is allowed to make requests.
    *   **Access-Control-Allow-Headers**: `Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token`
        *   These are the headers your frontend sends, and the API Gateway needs to know they are allowed. `Authorization` is essential for your Cognito-based security.
    *   **Access-Control-Allow-Methods**: `*`
        *   This allows all HTTP methods (GET, POST, PATCH, etc.). You can restrict this to `POST` if you want to be more specific for this endpoint.
    *   **Access-Control-Expose-Headers**: `Content-Length,Content-Type,Date`
    *   **Access-Control-Max-Age**: `300`
        *   This tells the browser to cache the preflight response for 5 minutes (300 seconds), which reduces the number of preflight requests.

## Step 3: Save Your Changes

1.  Click the **Save** button.
2.  API Gateway will automatically add an `OPTIONS` route to your API to handle preflight requests. This is what browsers use to check for CORS permissions before sending the actual `POST` request.

After completing these steps, the CORS error should be resolved. It may take a minute or two for the changes to propagate. You might need to do a hard refresh on your browser page.

This configuration ensures that only your Amplify application can communicate with your API, maintaining the security of your backend.