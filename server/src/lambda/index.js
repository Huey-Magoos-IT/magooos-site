import https from "node:https";

export const handler = async (event) => {
    console.log("Lambda triggered with event:", JSON.stringify(event, null, 2));
    console.log("User Attributes from event.request.userAttributes:", JSON.stringify(event.request.userAttributes, null, 2));

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

    // Attempt to read admin-selected attributes. These might not exist for non-admin created users.
    // Assuming teamId is passed as a string, and locationIds as a JSON stringified array.
    const adminSelectedTeamId = event.request.userAttributes['custom:teamId'];
    const adminSelectedLocationIdsString = event.request.userAttributes['custom:locationIds'];

    let teamIdToUse = 1; // Default teamId
    if (adminSelectedTeamId) {
        const parsedTeamId = parseInt(adminSelectedTeamId, 10);
        if (!isNaN(parsedTeamId)) {
            teamIdToUse = parsedTeamId;
        } else {
            console.warn(`Could not parse custom:teamId: ${adminSelectedTeamId}. Using default.`);
        }
    }

    let locationIdsToUse = []; // Default to empty array
    if (adminSelectedLocationIdsString) {
        try {
            const parsedLocationIds = JSON.parse(adminSelectedLocationIdsString);
            if (Array.isArray(parsedLocationIds) && parsedLocationIds.every(id => typeof id === 'number')) {
                locationIdsToUse = parsedLocationIds;
            } else {
                console.warn(`custom:locationIds is not an array of numbers: ${adminSelectedLocationIdsString}. Using default.`);
            }
        } catch (parseError) {
            console.warn(`Error parsing custom:locationIds: ${adminSelectedLocationIdsString}`, parseError);
        }
    }

    console.log("Lambda: Parsed teamIdToUse:", teamIdToUse);
    console.log("Lambda: Parsed locationIdsToUse:", JSON.stringify(locationIdsToUse, null, 2));

    const postData = JSON.stringify({
        username: username,
        cognitoId: cognitoId,
        profilePictureUrl: "i1.jpg", // Default profile picture
        teamId: teamIdToUse,
        locationIds: locationIdsToUse // Add locationIds
    });

    console.log("Lambda: Sending postData:", postData);

    const options = {
        hostname: "puvzjk01yl.execute-api.us-east-2.amazonaws.com", // Ensure this is correct
        port: 443,
        path: "/prod/users", // Ensure this endpoint can handle the new attributes
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
