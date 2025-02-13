import requests
import boto3
import json
from datetime import datetime, timedelta
import logging
import re
import io

# Set up basic logging to capture all logs
log_stream = io.StringIO()
handler = logging.StreamHandler(log_stream)
handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(handler)

# Configuration
credentials = {
    "client_id": "internalhueymagoos395",
    "client_secret": "EU$2wLTT%WXgHBVzV4yp",
    "auth_url": "https://gateway-api-stg.qubeyond.com/api/v4/authentication/services/token",
    "base_url": "https://gateway-api-stg.qubeyond.com/api/v4"
}

S3_CONFIG = {
    "bucket": "qu-location-ids",
    "raw_locations_file": "raw_locations.json",        # Stores complete API response
    "processed_locations_file": "locations.json",      # Stores filtered production locations
    "log_file": "location_sync.log"                   # Stores complete execution logs
}

DYNAMODB_TABLE = "Location-u3tk7jwqujcqfedzbv7hksrt4a-NONE"

def is_test_location(name):
    """Check if the location is a test/lab/template location"""
    test_patterns = [
        r'^TEST$',                    # Exactly "TEST"
        r'^Template-',                # Starts with "Template-"
        r'^Test\s+\d+$',             # "Test" followed by numbers
        r'^Lab\s+Test\s+\d+$',       # "Lab Test" followed by numbers
        r'HQ\s+Lab$',                # Ends with "HQ Lab"
        r'New\s+Menu\s+Store$'       # Ends with "New Menu Store"
    ]
    
    return any(re.search(pattern, name, re.IGNORECASE) for pattern in test_patterns)

def get_dynamodb_locations():
    """Retrieve all locations from DynamoDB"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(DYNAMODB_TABLE)
    
    locations = {}
    try:
        response = table.scan()
        for item in response['Items']:
            locations[str(item['id'])] = item['name']
            logger.info(f"Found existing location in DynamoDB: {item['id']} - {item['name']}")
        
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            for item in response['Items']:
                locations[str(item['id'])] = item['name']
                logger.info(f"Found existing location in DynamoDB: {item['id']} - {item['name']}")
                
        return locations
    except Exception as e:
        logger.error(f"Error reading from DynamoDB: {str(e)}")
        raise

def add_location_to_dynamodb(location_id, name):
    """Add a new location to DynamoDB"""
    dynamodb = boto3.resource('dynamodb')
    table = dynamodb.Table(DYNAMODB_TABLE)
    
    try:
        current_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        
        item = {
            'id': str(location_id),
            'name': name,
            'createdAt': current_time,
            'updatedAt': current_time,
            '__typename': 'Location'
        }
        
        response = table.put_item(Item=item)
        logger.info(f"Successfully added location {location_id} - {name} to DynamoDB")
        return response
    except Exception as e:
        logger.error(f"Error adding location to DynamoDB: {str(e)}")
        raise

def upload_to_s3(data, file_key):
    """Upload data to S3"""
    s3 = boto3.client('s3')
    try:
        s3.put_object(
            Bucket=S3_CONFIG['bucket'],
            Key=file_key,
            Body=json.dumps(data, indent=2) if isinstance(data, (dict, list)) else data
        )
        logger.info(f"Successfully uploaded data to S3: {file_key}")
        return True
    except Exception as e:
        logger.error(f"Failed to upload {file_key} to S3: {str(e)}")
        raise

def lambda_handler(event, context):
    headers = {
        'Content-Type': 'application/json'
    }
    
    try:
        logger.info("Starting location processing")
        
        # Step 1: Get existing locations from DynamoDB
        existing_locations = get_dynamodb_locations()
        logger.info(f"Retrieved {len(existing_locations)} existing locations from DynamoDB")
        
        # Log all existing location IDs for debugging
        logger.info("Existing location IDs in DynamoDB: " + ", ".join(existing_locations.keys()))
        
        # Authenticate with QU Beyond API
        auth_response = requests.post(credentials["auth_url"], json={
            'authenticationId': credentials["client_id"],
            'authenticationKey': credentials["client_secret"],
            'authenticationScope': 'menu:*'
        }, headers=headers)

        if auth_response.status_code != 200:
            logger.error(f"Authentication failed with status {auth_response.status_code}: {auth_response.text}")
            return {
                'statusCode': auth_response.status_code,
                'body': f"Failed to authenticate: {auth_response.text}"
            }

        auth_data = auth_response.json()
        token = auth_data.get('value', {}).get('tk')
        if not token:
            logger.error("No token received in authentication response")
            return {
                'statusCode': 500,
                'body': "Authentication failed, no access token received."
            }

        user_id = auth_data.get('value', {}).get('uid')
        get_headers = {
            'Authorization': f'Bearer {token}',
            'x-Integration': user_id,
        }

        # Step 2: Fetch recent locations with pagination safeguards
        all_locations = []
        page_number = 1
        page_size = 200
        max_pages = 50  # Prevent infinite loops
        created_after = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')

        while page_number <= max_pages:
            logger.info(f"Fetching recent locations (last 30 days) page {page_number}")
            
            response = requests.get(
                f'{credentials["base_url"]}/data/locations',
                headers=get_headers,
                params={
                    'page_number': page_number,
                    'page_size': page_size,
                    'createdAfter': created_after,
                    'sort': 'createdAt:desc',
                    'fields': 'id,businessName,priceGroupId,createdAt'
                }
            )

            if response.status_code != 200:
                logger.error(f"Failed to get locations: {locations_response.status_code} - {locations_response.text}")
                return {
                    'statusCode': 500,
                    'body': f"Failed to get location data: {locations_response.status_code}"
                }

            locations_json = response.json()
            locations_data = locations_json.get('value', {}).get('items', [])
            total_records = locations_json.get('value', {}).get('totalRecords', 0)
            
            logger.info(f"Page {page_number}: Retrieved {len(locations_data)} locations")
            all_locations.extend(locations_data)
            
            logger.info(f"Total locations so far: {len(all_locations)} of {total_records}")
            
            if len(all_locations) >= total_records or not locations_data:
                break

            page_number += 1

        # Step 3: Prepare and upload raw data to S3
        raw_locations = {}
        for loc in all_locations:
            location_id = str(loc['id'])
            raw_locations[location_id] = {
                'name': loc['businessName'],
                'price_group_id': loc['priceGroupId']
            }
        
        # Upload raw data to S3
        upload_to_s3(raw_locations, S3_CONFIG['raw_locations_file'])
        logger.info(f"Raw locations uploaded to S3: {len(raw_locations)} locations")

        # Step 4: Filter locations and prepare processed data
        processed_locations = {}
        new_locations_added = []
        skipped_test_locations = []
        
        for location_id, location_data in raw_locations.items():
            name = location_data['name']
            logger.info(f"Processing location: {location_id} - {name}")
            
            if is_test_location(name):
                skipped_test_locations.append({
                    'id': location_id,
                    'name': name
                })
                logger.info(f"Skipped test location: {location_id} - {name}")
                continue
            
            processed_locations[location_id] = location_data
            
            # Log whether location exists in DynamoDB
            if location_id in existing_locations:
                logger.info(f"Location already exists in DynamoDB: {location_id} - {name}")
            else:
                logger.info(f"New location found: {location_id} - {name}")

        # Step 5: Upload processed data to S3
        upload_to_s3(processed_locations, S3_CONFIG['processed_locations_file'])
        logger.info(f"Processed locations uploaded to S3: {len(processed_locations)} locations")

        # Step 6: Update DynamoDB with processed locations
        for location_id, location_data in processed_locations.items():
            if location_id not in existing_locations:
                logger.info(f"Adding new location to DynamoDB: {location_id} - {location_data['name']}")
                add_location_to_dynamodb(location_id, location_data['name'])
                new_locations_added.append({
                    'id': location_id,
                    'name': location_data['name']
                })

        # Upload complete logs to S3
        upload_to_s3(log_stream.getvalue(), S3_CONFIG['log_file'])
        logger.info("Complete execution logs uploaded to S3")

        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': f"Process completed. Added {len(new_locations_added)} new locations to DynamoDB. Skipped {len(skipped_test_locations)} test locations.",
                'new_locations': new_locations_added,
                'skipped_test_locations': skipped_test_locations,
                'total_locations': len(raw_locations),
                'production_locations': len(processed_locations)
            })
        }

    except requests.exceptions.RequestException as e:
        logger.error(f"Request failed: {str(e)}")
        return {
            'statusCode': 500,
            'body': f"Request failed: {str(e)}"
        }
    except Exception as e:
        logger.error(f"General error: {str(e)}")
        return {
            'statusCode': 500,
            'body': f"General error: {str(e)}"
        }
    finally:
        # Always try to upload logs, even if there was an error
        try:
            upload_to_s3(log_stream.getvalue(), S3_CONFIG['log_file'])
        except:
            pass  # Ignore errors in log upload during error handling
