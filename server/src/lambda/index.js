import https from "node:https";

export const handler = async (event) => {
    console.log("Lambda triggered with event:", JSON.stringify(event, null, 2));

    // Extract username from Cognito event (username first, then fall back to email)
    const username = event.userName || 
                    event.request.userAttributes.email;

    // Use the sub attribute as cognitoId - this is the unique identifier from Cognito
    const cognitoId = event.request.userAttributes.sub;

    // Validate required fields
    if (!username || !cognitoId) {
        console.error("Missing required fields:", { username, cognitoId });
        return event;
    }

    const postData = JSON.stringify({
        username: username,
        cognitoId: cognitoId,
        profilePictureUrl: "i1.jpg",
        teamId: 1
    });

    const options = {
        hostname: "puvzjk01yl.execute-api.us-east-2.amazonaws.com",
        port: 443,
        path: "/prod/users",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData)
        }
    };

    try {
        console.log("Attempting to create user with data:", postData);

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

            req.write(postData);
            req.end();
        });

        console.log("User creation successful:", responseBody);
        return event;

    } catch (error) {
        console.error("Error creating user:", {
            error: error.message,
            stack: error.stack,
            postData
        });
        
        // Still return event to not block Cognito flow
        // but ensure error is properly logged
        return event;
    }
};
