import https from "node:https";

export const handler = async (event) => {
    console.log("GetLocations Lambda triggered with event:", JSON.stringify(event, null, 2));

    // API Gateway endpoint for DynamoDB proxy
    const options = {
        hostname: "puvzjk01yl.execute-api.us-east-2.amazonaws.com", // Use the same API Gateway URL as other functions
        port: 443,
        path: "/prod/locations", // This will need to be configured in API Gateway
        method: "GET",
        headers: {
            "Content-Type": "application/json"
        }
    };

    try {
        console.log("Attempting to fetch locations from DynamoDB");

        const responseBody = await new Promise((resolve, reject) => {
            const req = https.request(options, res => {
                let body = "";
                
                res.setEncoding("utf8");
                
                res.on("data", chunk => body += chunk);
                
                res.on("end", () => {
                    console.log(`Response status: ${res.statusCode}`);
                    console.log("Response body:", body);
                    
                    // Check if the response indicates an error
                    if (res.statusCode >= 400) {
                        reject(new Error(`API request failed with status ${res.statusCode}: ${body}`));
                    } else {
                        resolve(body);
                    }
                });
            });

            req.on("error", (error) => {
                console.error("Request error:", error);
                reject(error);
            });

            req.end();
        });

        // Return the locations fetched from DynamoDB
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*", // Update with specific domain in production
                "Access-Control-Allow-Credentials": true,
                "Content-Type": "application/json"
            },
            body: responseBody
        };

    } catch (error) {
        console.error("Error fetching locations:", {
            error: error.message,
            stack: error.stack
        });
        
        // Return error response
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*", // Update with specific domain in production
                "Access-Control-Allow-Credentials": true,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Error fetching locations",
                error: error.message
            })
        };
    }
};