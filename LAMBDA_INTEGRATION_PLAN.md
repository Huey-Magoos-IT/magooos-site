# Lambda Integration Plan for Data Department

## Overview

This document outlines the plan for integrating the AWS Lambda function `Qu_API_Extraction_3-0` with the Data Department page in the MagooOS application. The Lambda function will process data extraction requests and store results in an S3 bucket, which will then be displayed on the Data Department page.

## Current Architecture

Based on the project documentation, the current architecture follows these patterns:

1. **Authentication Flow**:
   - Cognito handles user authentication
   - API Gateway validates JWT tokens before forwarding requests to the backend
   - Frontend includes JWT tokens in API requests via RTK Query

2. **Lambda Integration**:
   - Lambda functions are triggered by events (e.g., Cognito post-confirmation)
   - Lambda functions use the built-in `https` module to make HTTP requests
   - Lambda functions are configured with IAM roles for permissions

3. **API Gateway Integration**:
   - API Gateway has a proxy integration to the EC2 instance
   - The {proxy+} resource forwards all paths to the EC2 instance
   - The EC2 instance runs the Express server on port 80

## Implementation Plan

### 1. Backend Implementation

#### 1.1 Create Data Controller

Create a new controller file `server/src/controllers/dataController.ts` with the following functionality:

```typescript
import { Request, Response } from 'express';
import https from 'https';

/**
 * Generate a data report by invoking the Lambda function through API Gateway
 */
export const generateReport = async (req: Request, res: Response): Promise<void> => {
  const { start_date, end_date, output_bucket, location_id, discount_ids } = req.body;
  console.log("[POST /data/generate-report] Generating report:", { start_date, end_date });

  // Input validation
  if (!start_date || !end_date) {
    console.error("[POST /data/generate-report] Missing required fields");
    res.status(400).json({ 
      success: false,
      message: "Start date and end date are required" 
    });
    return;
  }

  // Prepare payload for Lambda function
  const payload = JSON.stringify({
    start_date,
    end_date,
    output_bucket,
    location_id,
    discount_ids
  });

  // Make a direct API call to the API Gateway endpoint that triggers the Lambda
  const options = {
    hostname: 'puvzjk01yl.execute-api.us-east-2.amazonaws.com',
    port: 443,
    path: '/prod/lambda/Qu_API_Extraction_3-0',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    }
  };

  try {
    const lambdaResponse = await new Promise<string>((resolve, reject) => {
      const req = https.request(options, (response) => {
        let data = '';
        
        response.on('data', (chunk) => {
          data += chunk;
        });
        
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`API Gateway returned status code ${response.statusCode}: ${data}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(payload);
      req.end();
    });
    
    console.log("[POST /data/generate-report] Lambda invocation result:", lambdaResponse);
    
    res.status(200).json({
      success: true,
      message: "Report generation started successfully",
      jobId: new Date().getTime().toString() // Generate a pseudo job ID
    });
  } catch (error: any) {
    console.error("[POST /data/generate-report] Error:", error);
    res.status(500).json({ 
      success: false,
      message: "Error generating report",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
```

#### 1.2 Create Data Routes

Create a new routes file `server/src/routes/dataRoutes.ts`:

```typescript
import { Router } from 'express';
import * as dataController from '../controllers/dataController';

const router = Router();

// Generate data report (invokes Lambda function)
router.post('/generate-report', dataController.generateReport);

export default router;
```

#### 1.3 Register Routes in Main Server

Update `server/src/index.ts` to include the new routes:

```typescript
// Add import
import dataRoutes from "./routes/dataRoutes";

// Add route registration
app.use("/data", dataRoutes);
```

### 2. Frontend Implementation

#### 2.1 Update API Client

Update `client/src/state/api.ts` to add the new endpoint:

```typescript
// Add interface for data report parameters
export interface DataReportParams {
  start_date: string;
  end_date: string;
  output_bucket: string;
  location_id: string;
  discount_ids: number[];
}

export interface DataReportResponse {
  success: boolean;
  message: string;
  jobId?: string;
}

// Add to endpoints
generateDataReport: build.mutation<DataReportResponse, DataReportParams>({
  query: (params) => ({
    url: 'data/generate-report',
    method: 'POST',
    body: params,
  }),
  invalidatesTags: ["DataReports"],
}),

// Add to exports
export const {
  // Existing exports...
  useGenerateDataReportMutation,
} = api;
```

#### 2.2 Update Data Department Page

Update `client/src/app/departments/data/page.tsx` to use the new API endpoint:

```typescript
// Add import
import { useGenerateDataReportMutation } from "@/state/api";

// Inside component
const [generateReport, { isLoading: isGenerating }] = useGenerateDataReportMutation();

// Update handleGenerateReport function
const handleGenerateReport = async () => {
  if (!startDate || !endDate) {
    setNotification({
      open: true,
      message: "Please select both start and end dates",
      severity: 'error'
    });
    return;
  }

  const formData = {
    start_date: formatDateForApi(startDate),
    end_date: formatDateForApi(endDate),
    output_bucket: "redflag-reporting",
    location_id: selectedLocations.join(","),
    discount_ids: discountIds
  };

  try {
    console.log("Generating report with data:", formData);
    const response = await generateReport(formData).unwrap();
    
    if (response.success) {
      setNotification({
        open: true,
        message: "Report generation started successfully. The file will appear in the list when ready.",
        severity: 'success'
      });
      
      // Set a timeout to refresh the file list after a delay
      setTimeout(() => {
        fetchFiles();
      }, 10000); // Refresh after 10 seconds
    } else {
      setNotification({
        open: true,
        message: response.message || "Failed to generate report",
        severity: 'error'
      });
    }
  } catch (err: any) {
    console.error("Report generation failed:", err);
    setNotification({
      open: true,
      message: err.message || "Failed to generate report",
      severity: 'error'
    });
  }
};
```

### 3. API Gateway Configuration

#### 3.1 Create Lambda Integration

1. Go to API Gateway in AWS Console
2. Select the API with ID `puvzjk01yl`
3. Create a new resource under `/prod`:
   - Resource Path: `/lambda/Qu_API_Extraction_3-0`
   - Method: POST
   - Integration Type: Lambda Function
   - Lambda Function: `Qu_API_Extraction_3-0`
   - Use Lambda Proxy Integration: Yes

#### 3.2 Configure Lambda Permissions

1. Go to Lambda in AWS Console
2. Select the function `Qu_API_Extraction_3-0`
3. Go to "Permissions" tab
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

### 4. S3 Bucket Configuration

Ensure the S3 bucket `redflag-reporting` has the correct permissions:

1. CORS configuration to allow access from the frontend domain
2. Bucket policy to allow the Lambda function to write to it
3. IAM role for the Lambda function with S3 write permissions

## Testing Plan

1. **Backend Testing**:
   - Test the `/data/generate-report` endpoint with Postman
   - Verify proper error handling for invalid inputs
   - Check CloudWatch logs for Lambda execution

2. **Frontend Testing**:
   - Test the form submission on the Data Department page
   - Verify success and error notifications
   - Test file list refresh after report generation

3. **Integration Testing**:
   - End-to-end test from form submission to file appearance in S3
   - Verify file contents match the expected format

## Deployment Steps

1. Deploy backend changes:
   ```bash
   cd /home/ubuntu/magooos-site
   git pull origin main
   cd server
   npm install
   pm2 restart all
   ```

2. Deploy API Gateway changes:
   - Deploy the API to the `prod` stage
   - Test the endpoint with a sample request

3. Verify Lambda permissions:
   - Check CloudWatch logs for any permission errors
   - Update IAM roles if needed

## Monitoring and Maintenance

1. Set up CloudWatch alarms for:
   - Lambda errors
   - API Gateway 5xx errors
   - S3 bucket size

2. Regular maintenance:
   - Review CloudWatch logs
   - Check S3 bucket usage
   - Update Lambda function as needed