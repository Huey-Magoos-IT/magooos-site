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

  // Make a direct API call to the API Gateway endpoint
  const options = {
    hostname: 'puvzjk01yl.execute-api.us-east-2.amazonaws.com',
    port: 443,
    path: '/prod/data/generate-report',
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