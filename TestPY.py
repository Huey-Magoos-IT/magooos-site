import sys
import os
import zipfile
import boto3
import traceback
import json
import requests
import jwt
import csv
from datetime import datetime, timedelta
import re
import threading
import time
import concurrent.futures
from concurrent.futures import ThreadPoolExecutor
from collections import Counter
from botocore.exceptions import ClientError

# Initialize S3 client
s3 = boto3.client('s3')

# Constants for S3 structure
MAIN_BUCKET = "data-lake-magooos-site"
RAW_LOYALTY_PREFIX = "raw-loyalty-pool/"
LOYALTY_DATA_PREFIX = "loyalty-data-pool/"
REPORTING_DATA_PREFIX = "reporting-data-pool/"

# Hardcoded values for daily runs
DEFAULT_DISCOUNT_IDS = [77406, 135733, 135736, 135737, 135738, 135739, 135910]

def get_yesterday_date():
    """Returns yesterday's date in MMDDYYYY format for daily runs"""
    yesterday = datetime.now() - timedelta(days=1)
    return yesterday.strftime("%m%d%Y")

def format_date_for_filename(date_str):
    """Format dates consistently for filenames in MM-DD-YYYY format"""
    if '_to_' in date_str:  # Handle range format
        start_date, end_date = date_str.split('_to_')
        start_obj = datetime.strptime(start_date, '%m%d%Y')
        end_obj = datetime.strptime(end_date, '%m%d%Y')
        start_str = start_obj.strftime('%m-%d-%Y')
        end_str = end_obj.strftime('%m-%d-%Y')
        return f"{start_str}_{end_str}"
    else:  # Handle single date format
        date_obj = datetime.strptime(date_str, '%m%d%Y')
        return date_obj.strftime('%m-%d-%Y')

def get_s3_object(bucket, key):
    try:
        response = s3.get_object(Bucket=bucket, Key=key)
        return response['Body'].read().decode('utf-8')
    except ClientError as e:
        print(f"Error getting object {key} from bucket {bucket}. Make sure they exist and your bucket is in the same region as this function.")
        print(e)
        raise

# Fetch the configuration from S3
try:
    config = json.loads(get_s3_object('qu-configuration', 'qu-configuration.json'))
except Exception as e:
    print(f"Error loading configuration: {str(e)}")
    raise

# Extracting configurations
credentials = config['credentials']
buckets = config['buckets']
default_config = config['default_config']

bucket_name = buckets['location_ids_bucket']
file_name = buckets['location_ids_file']
error_log_bucket = buckets['error_log_bucket']
error_log_path = buckets['error_log_path']

company_id = default_config['company_id']
MAX_WORKERS = default_config['thread_pool_max_workers']

client_id = credentials['client_id']
client_secret = credentials['client_secret']
auth_url = credentials['auth_url']
base_url = credentials['base_url']

def load_location_data():
    try:
        location_data = json.loads(get_s3_object('qu-location-ids', 'locations.json'))
        return {id: re.sub(r'^(Huey Magoo\'s|Huey Magoos)\s*', '', data['name']).strip() for id, data in location_data.items()}
    except Exception as e:
        print(f"Error loading location data: {str(e)}")
        raise

location_data = load_location_data()

def get_location_name(location_id):
    name = location_data.get(str(location_id), f"Unknown (ID: {location_id})")
    # Remove any leading '=' or '-' characters and strip whitespace
    return re.sub(r'^[=\-\s]+', '', name).strip()

def get_employee_data(bucket_name, file_name):
    try:
        data = get_s3_object(bucket_name, file_name).splitlines()
        employee_data = {}
        print(f"Total lines in employee data: {len(data)}")
        
        # Print header
        print(f"Header: {data[0]}")
        
        for line in data[1:]:  # Skip header
            parts = line.split(',')
            if len(parts) >= 3:
                loyalty_id = parts[0].strip().strip('"')
                first_name = parts[1].strip().strip('"')
                last_name = parts[2].strip().strip('"')
                if loyalty_id:
                    employee_data[loyalty_id] = f"{first_name} {last_name}".strip()
        
        print(f"Loaded {len(employee_data)} employee records")
        
        return employee_data
    except Exception as e:
        print(f"Error getting employee data: {str(e)}")
        raise

EMPLOYEE_LIST_FILENAME = "employee_list.csv"
employee_data = get_employee_data(bucket_name, EMPLOYEE_LIST_FILENAME)

def get_employee_name(loyalty_id):
    return employee_data.get(loyalty_id, f"Unknown (ID: {loyalty_id})")

# Helper functions for date handling
def daterange(start_date, end_date):
    for n in range(int((end_date - start_date).days) + 1):
        yield start_date + timedelta(n)

def is_valid_date(date):
    if re.match(r'\d{8}', date):
        month, day, year = int(date[:2]), int(date[2:4]), int(date[4:])
        return 1 <= month <= 12 and 1 <= day <= 31 and year >= 1000
    return False

def get_all_locations_from_sync():
    """
    Retrieve all location IDs from the synchronized locations.json file
    """
    try:
        location_data = json.loads(get_s3_object('qu-location-ids', 'locations.json'))
        # Extract just the location IDs, converting them to integers
        location_ids = [int(id) for id in location_data.keys()]
        print(f"Retrieved {len(location_ids)} locations from synchronized locations.json")
        
        # Print first few locations for verification
        if location_ids:
            print(f"Sample location IDs: {location_ids[:5]}...")
            
        return location_ids
    except Exception as e:
        print(f"Error retrieving synchronized locations: {str(e)}")
        raise

def get_location_ids(bucket_name, file_name):
    try:
        data = get_s3_object(bucket_name, file_name)
        location_ids = [int(id.strip()) for id in re.split(r'[\r\n]+', data) if id.strip()]
        return location_ids
    except Exception as e:
        print(f"Error getting location IDs: {str(e)}")
        raise

def fetch_location_data(location_id, params, get_headers):
    get_url = f'{base_url}/{company_id}/{location_id}'
    
    for attempt in range(3):
        try:
            print(f"Requesting data from location ID {location_id} for date {params.get('start_date')}")
            get_response = requests.get(get_url, headers=get_headers, params=params)
            
            if get_response.status_code == 200:
                response_data = get_response.json()
                check_count = len(response_data.get('data', {}).get('check', []))
                print(f"Retrieved {check_count} checks for location {location_id}")
                return response_data
            else:
                print(f"Error response from API for location {location_id}: Status {get_response.status_code}")
                print(f"Error details: {get_response.text[:200]}")
        except requests.exceptions.RequestException as e:
            print(f"Request exception for location {location_id}: {str(e)}")
            if attempt < 2:
                time.sleep(5)
            else:
                raise
    
    print(f"Failed to get data after 3 attempts for location ID {location_id}")
    return None

# Discount name mappings
DISCOUNT_NAMES = {
    77406: "Non-Rewards Online Discounts",
    135733: "250 Points Free Cookie",
    135736: "500 Points Free Reg Drink",
    135737: "Birthday Dessert",
    135738: "1000 Points Free 3 Pc",
    135739: "2000 Points Free Meal",
    135910: "Magoos Rewards"
}

def write_raw_data(data, bucket, prefix, filename):
    """Store raw data in the original format (maintaining location structure)"""
    s3.put_object(Body=json.dumps(data, indent=2), Bucket=bucket, Key=f"{prefix}{filename}")
    print(f"Raw data has been written to {bucket}/{prefix}{filename}")
    return f"{prefix}{filename}"

def filter_transactions_with_specific_discounts(data, discount_ids):
    """Filter transactions based on discount IDs, preserving structure like the original"""
    if not discount_ids:
        return data  # No filtering needed

    filtered_data = []
    for location_data in data:
        filtered_checks = []
        for check in location_data.get('data', {}).get('check', []):
            has_specific_discount = any(
                str(discount.get('discount_id')) in discount_ids
                for item in check.get('item', [])
                for discount in item.get('discount', [])
            ) or any(
                str(discount.get('discount_id')) in discount_ids
                for discount in check.get('discount', [])
            )
            if has_specific_discount:
                filtered_checks.append(check)
        
        if filtered_checks:
            filtered_location_data = location_data.copy()
            filtered_location_data['data'] = {'check': filtered_checks}
            filtered_data.append(filtered_location_data)
            
    return filtered_data

def extract_data_for_date(date_str, location_ids, get_headers, include_raw=False, discount_ids=None, store_raw_prefix=None):
    """
    Unified function to extract data once for both reporting and raw storage
    
    Args:
        date_str: Date in MMDDYYYY format
        location_ids: List of location IDs
        get_headers: API authentication headers
        include_raw: Whether to store raw data
        discount_ids: Optional discount IDs for filtering raw data
        store_raw_prefix: Prefix for raw data storage
        
    Returns:
        tuple: (raw_data_key, all_data)
    """
    params = {
        'data_type': 'checks',
        'include_abandoned': 'false',
        'start_date': date_str,
        'end_date': date_str
    }
    
    print(f"Extracting data for {date_str} from {len(location_ids)} locations")
    
    all_data = []
    
    # Sort location_ids in ascending order
    sorted_location_ids = sorted(location_ids)
    
    if len(sorted_location_ids) == 1:
        # If there's only one location, process it directly
        specific_location_id = sorted_location_ids[0]
        data = fetch_location_data(specific_location_id, params, get_headers)
        if data:
            all_data.append(data)
    else:
        with ThreadPoolExecutor(MAX_WORKERS) as executor:
            future_to_location = {executor.submit(fetch_location_data, location_id, params, get_headers): location_id 
                                  for location_id in sorted_location_ids}
            for future in concurrent.futures.as_completed(future_to_location):
                location_id = future_to_location[future]
                try:
                    data = future.result()
                    if data:
                        all_data.append(data)
                except Exception as exc:
                    print(f'Location ID {location_id} generated an exception: {exc}')
    
    # Store raw data if requested
    raw_data_key = None
    if include_raw and store_raw_prefix and all_data:
        # Use the original filtering logic if discount_ids provided
        if discount_ids:
            raw_data_to_store = filter_transactions_with_specific_discounts(all_data, discount_ids)
        else:
            raw_data_to_store = all_data
            
        # Format date and create filename
        formatted_date = format_date_for_filename(date_str)
        raw_filename = f"raw_data_{formatted_date}.json"
        
        # Write raw data
        raw_data_key = write_raw_data(raw_data_to_store, MAIN_BUCKET, store_raw_prefix, raw_filename)
        print(f"Raw data stored with key: {raw_data_key}")
    
    # Log a summary of checks found
    total_checks = sum(len(location_data.get('data', {}).get('check', [])) for location_data in all_data)
    print(f"Total data objects for {date_str}: {len(all_data)} locations with {total_checks} total checks")
    
    return raw_data_key, all_data

##### RED FLAG REPORTING FUNCTIONS #####

def count_loyalty_occurrences(data):
    # Track usage by loyalty ID and date
    loyalty_usage_by_date = {}
    
    for location_data in data:
        for check in location_data.get('data', {}).get('check', []):
            loyalty_id = check.get('loyalty_id')
            if loyalty_id and loyalty_id != 'N/A':
                # Get business date
                business_date = check.get('business_date')
                if business_date:
                    date_str = datetime.fromisoformat(business_date).strftime('%Y-%m-%d')
                    
                    # Initialize structure if needed
                    if loyalty_id not in loyalty_usage_by_date:
                        loyalty_usage_by_date[loyalty_id] = {}
                    
                    # Track usage count by date
                    if date_str not in loyalty_usage_by_date[loyalty_id]:
                        loyalty_usage_by_date[loyalty_id][date_str] = 1
                    else:
                        loyalty_usage_by_date[loyalty_id][date_str] += 1
    
    print(f"Found {len(loyalty_usage_by_date)} unique loyalty IDs across all data")
    return loyalty_usage_by_date

def identify_flagged_loyalty_ids(loyalty_usage_by_date, min_usage_threshold=1):
    """
    Identify loyalty IDs with suspicious usage patterns based on configurable threshold.
    
    Args:
        loyalty_usage_by_date: Dictionary of loyalty usage data
        min_usage_threshold: Minimum number of uses per day to flag (default: 1)
                            - 0: Flags ALL loyalty IDs (no filtering)
                            - 1: Flags all IDs with any usage
                            - 2: Original behavior (2+ uses in a day)
                            - N: Flag IDs used N or more times in a day
    """
    # Special case: if threshold is 0, include ALL loyalty IDs (no filtering)
    if min_usage_threshold == 0:
        print(f"Min usage threshold is 0, including all {len(loyalty_usage_by_date)} loyalty IDs")
        return loyalty_usage_by_date
        
    # For other threshold values, filter as usual
    flagged_loyalty_ids = {}
    for loyalty_id, date_counts in loyalty_usage_by_date.items():
        # Find at least one day with usage at or above threshold
        if any(count >= min_usage_threshold for count in date_counts.values()):
            flagged_loyalty_ids[loyalty_id] = date_counts
    
    print(f"Filtered to {len(flagged_loyalty_ids)} loyalty IDs with usage >= {min_usage_threshold}")
    return flagged_loyalty_ids

def calculate_chk_total(check):
    payment = check.get('payment', [{}])[0]
    payment_total = payment.get('total', 0)
    total_tax = check.get('add_on_tax', 0)
    charged_tip = payment.get('charged_tip', 0)
    
    check_total = payment_total - total_tax - charged_tip
    
    return round(check_total, 2)

def create_red_flag_report(data, flagged_loyalty_ids, loyalty_usage_by_date):
    report = []
    summary = []
    all_transactions = []
    
    for loyalty_id, date_counts in flagged_loyalty_ids.items():
        loyalty_data = {
            'Loyalty ID': loyalty_id,
            'Transactions': [],
            'Total Amount': 0,
            'Total Discount': 0
        }
        
        for location_data in data:
            location_id = location_data['req_location_id']
            location_name = get_location_name(location_id)
            
            for check in location_data.get('data', {}).get('check', []):
                if check.get('loyalty_id') == loyalty_id:
                    total = calculate_chk_total(check)
                    discount = check['discount_total']
                    cashier_id = check.get('employee_id', 'N/A')
                    guest_name = get_employee_name(loyalty_id)
                    
                    # Get the date for this transaction
                    business_date = check['business_date']
                    trans_date = datetime.fromisoformat(business_date).strftime('%m/%d/%Y')
                    date_key = datetime.fromisoformat(business_date).strftime('%Y-%m-%d')
                    
                    # Get the daily usage count for this specific date
                    daily_usage_count = date_counts.get(date_key, 0)
                    
                    transaction = {
                        'Loyalty ID': loyalty_id,
                        'Daily Usage Count': daily_usage_count,
                        'Date': trans_date,
                        'Store': location_name,
                        'Check Number': check['check_number'],
                        'Total': total,
                        'Discount Total': discount,
                        'Discount Percentage': (discount / total * 100) if total > 0 else 0,
                        'Order Type': check['order_type_id'],
                        'Cashier ID': cashier_id,
                        'Guest Name': guest_name
                    }
                    
                    loyalty_data['Transactions'].append(transaction)
                    all_transactions.append(transaction)
                    loyalty_data['Total Amount'] += total
                    loyalty_data['Total Discount'] += discount
        
        report.append(loyalty_data)
        
        # For summary, count the number of days with multiple uses
        multi_use_days = sum(1 for count in date_counts.values() if count > 1)
        
        summary.append({
            'Loyalty ID': loyalty_id,
            'Multi-Use Days Count': multi_use_days,
            'Total Amount': loyalty_data['Total Amount'],
            'Total Discount': loyalty_data['Total Discount'],
            'Average Discount Percentage': (loyalty_data['Total Discount'] / loyalty_data['Total Amount'] * 100) if loyalty_data['Total Amount'] > 0 else 0
        })
    
    # Sort all transactions by Store (location name)
    sorted_transactions = sorted(all_transactions, key=lambda x: x['Store'])
    
    print(f"Created red flag report with {len(summary)} loyalty IDs and {len(sorted_transactions)} transactions")
    return summary, report, sorted_transactions

def create_summary_from_transactions(transactions, flagged_loyalty_ids):
    """Create summary data from transaction list for combined reports"""
    # Group transactions by loyalty ID
    transactions_by_loyalty = {}
    for transaction in transactions:
        loyalty_id = transaction['Loyalty ID']
        if loyalty_id not in transactions_by_loyalty:
            transactions_by_loyalty[loyalty_id] = []
        transactions_by_loyalty[loyalty_id].append(transaction)
    
    # Create summary entries
    summary = []
    for loyalty_id, loyalty_transactions in transactions_by_loyalty.items():
        # Only include flagged loyalty IDs
        if loyalty_id in flagged_loyalty_ids:
            # Calculate totals
            total_amount = sum(t['Total'] for t in loyalty_transactions)
            total_discount = sum(t['Discount Total'] for t in loyalty_transactions)
            
            # Count multi-use days
            date_counts = {}
            for transaction in loyalty_transactions:
                date = transaction['Date']
                if date not in date_counts:
                    date_counts[date] = 0
                date_counts[date] += 1
            
            multi_use_days = sum(1 for count in date_counts.values() if count > 1)
            
            # Create summary entry
            summary.append({
                'Loyalty ID': loyalty_id,
                'Multi-Use Days Count': multi_use_days,
                'Total Amount': total_amount,
                'Total Discount': total_discount,
                'Average Discount Percentage': (total_discount / total_amount * 100) if total_amount > 0 else 0
            })
    
    return summary

def create_cashier_url(cashier_id):
    if cashier_id != 'N/A':
        url = f"https://admin.qubeyond.com/configuration/employees/{cashier_id}"
        return f'=HYPERLINK("{url}","{cashier_id}")'
    return 'N/A'

def create_summary_csv(summary, output_file):
    with open(output_file, 'w', newline='') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Loyalty ID', 'Multi-Use Days Count', 'Total Amount', 'Total Discount', 'Average Discount Percentage'])
        for loyalty_summary in summary:
            writer.writerow([
                loyalty_summary['Loyalty ID'],
                loyalty_summary['Multi-Use Days Count'],
                loyalty_summary['Total Amount'],
                loyalty_summary['Total Discount'],
                f"{loyalty_summary['Average Discount Percentage']:.2f}%"
            ])

def create_detailed_csv(sorted_transactions, output_file):
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.writer(csvfile)
        writer.writerow(['Loyalty ID', 'Daily Usage Count', 'Date', 'Store', 'Check Number', 'Total', 'Discount Total', 'Discount Percentage', 'Order Type', 'Cashier ID', 'Guest Name'])
        for transaction in sorted_transactions:
            cashier_id = transaction['Cashier ID']
            cashier_link = create_cashier_url(cashier_id)
            writer.writerow([
                transaction['Loyalty ID'],
                transaction['Daily Usage Count'],
                transaction['Date'],
                transaction['Store'],
                transaction['Check Number'],
                transaction['Total'],
                transaction['Discount Total'],
                f"{transaction['Discount Percentage']:.2f}%",
                transaction['Order Type'],
                cashier_link,
                transaction['Guest Name']
            ])

def check_for_discounts(check, discount_ids):
    discount_ids_found = set()
    for discount in check.get('discount', []):
        discount_id = str(discount.get('discount_id'))
        if discount_id in discount_ids:
            discount_ids_found.add(discount_id)
    for item in check.get('item', []):
        for discount in item.get('discount', []):
            discount_id = str(discount.get('discount_id'))
            if discount_id in discount_ids:
                discount_ids_found.add(discount_id)
    return list(discount_ids_found)

def create_no_loyalty_discount_report(data, discount_ids, max_check_number=99999):
    report = []
    for location_data in data:
        location_id = location_data['req_location_id']
        location_name = get_location_name(location_id)
        for check in location_data.get('data', {}).get('check', []):
            if not check.get('loyalty_id') or check.get('loyalty_id') == 'N/A':
                discount_ids_found = check_for_discounts(check, discount_ids)
                if discount_ids_found:
                    check_number = int(check['check_number'])
                    if check_number <= max_check_number:  # Use configurable parameter
                        cashier_id = check.get('employee_id', 'N/A')
                        report.append({
                            'Date': datetime.fromisoformat(check['business_date']).strftime('%m/%d/%Y'),
                            'Store': location_name,
                            'Check Number': check_number,
                            'Total': check['total'],
                            'Discount Total': check['discount_total'],
                            'Discount IDs': ', '.join(discount_ids_found),
                            'Discount Names': ', '.join([DISCOUNT_NAMES.get(int(id), str(id)) for id in discount_ids_found]),
                            'Order Type': check['order_type_id'],
                            'Cashier ID': cashier_id
                        })
    
    # Sort the report by Store (location name)
    sorted_report = sorted(report, key=lambda x: x['Store'])
    
    print(f"Created no-loyalty discount report with {len(sorted_report)} entries")
    return sorted_report

def create_no_loyalty_discount_csv(report, output_file):
    with open(output_file, 'w', newline='', encoding='utf-8-sig') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=['Date', 'Store', 'Check Number', 'Total', 'Discount Total', 'Discount IDs', 'Discount Names', 'Order Type', 'Cashier ID'])
        writer.writeheader()
        for row in report:
            row_copy = row.copy()
            row_copy['Cashier ID'] = create_cashier_url(row['Cashier ID'])
            writer.writerow(row_copy)

def generate_red_flag_report_files(summary, transactions, no_loyalty_report, date_str, prefix, output_bucket=None):
    """Generate and store all red flag report files"""
    # Create filenames
    summary_filename = f"/tmp/redflag-summary-{date_str}.csv"
    detailed_filename = f"/tmp/redflag-report-{date_str}.csv"
    no_loyalty_discount_filename = f"/tmp/no-loyalty-discount-{date_str}.csv"
    
    # Create the CSV files
    create_summary_csv(summary, summary_filename)
    create_detailed_csv(transactions, detailed_filename)
    create_no_loyalty_discount_csv(no_loyalty_report, no_loyalty_discount_filename)
    
    # Use the specified bucket or default to MAIN_BUCKET
    bucket = output_bucket or MAIN_BUCKET
    
    # Upload to S3
    try:
        s3.upload_file(
            summary_filename, 
            bucket, 
            f"{prefix}redflag-summary-{date_str}.csv"
        )
        print(f"Exported red flag summary report to {bucket}/{prefix}redflag-summary-{date_str}.csv")
        
        s3.upload_file(
            detailed_filename, 
            bucket, 
            f"{prefix}redflag-report-{date_str}.csv"
        )
        print(f"Exported red flag detailed report to {bucket}/{prefix}redflag-report-{date_str}.csv")
        
        s3.upload_file(
            no_loyalty_discount_filename, 
            bucket, 
            f"{prefix}no-loyalty-discount-{date_str}.csv"
        )
        print(f"Exported no loyalty discount report to {bucket}/{prefix}no-loyalty-discount-{date_str}.csv")
    except ClientError as e:
        print(f"Error uploading files to S3: {str(e)}")
        raise

##### LOYALTY DATA FUNCTIONS #####

def get_loyalty_item_info(check):
    items = check.get('item', [])
    for item in items:
        discounts = item.get('discount', [])
        for discount in discounts:
            if discount.get('is_loyalty_discount'):
                return (
                    str(item.get('item_id', '')),
                    item.get('price', 0)
                )
    return ('', 0)

def get_discount_info(check, discount_ids):
    total_discount = check.get('discount_total', 0)
    discount_ids_found = set()
    discount_names = set()
    
    for discount in check.get('discount', []):
        discount_id = str(discount.get('discount_id'))
        if not discount_ids or discount_id in discount_ids:
            discount_ids_found.add(discount_id)
            discount_names.add(DISCOUNT_NAMES.get(int(discount_id), str(discount_id)))
    
    for item in check.get('item', []):
        for discount in item.get('discount', []):
            discount_id = str(discount.get('discount_id'))
            if not discount_ids or discount_id in discount_ids:
                discount_ids_found.add(discount_id)
                discount_names.add(DISCOUNT_NAMES.get(int(discount_id), str(discount_id)))
    
    return total_discount, list(discount_ids_found), ', '.join(discount_names)

def create_csv_row(check, location_id, discount_ids):
    business_date = datetime.fromisoformat(check['business_date'])
    return {
        'Date': business_date.strftime('%m/%d'),
        'SortDate': business_date,
        'Store': location_id,
        'CHK': check['check_number'],
        'CHK Total': calculate_chk_total(check),
        'ITM': get_loyalty_item_info(check)[0],
        'ITM $': get_loyalty_item_info(check)[1],
        'DSCL': get_discount_info(check, discount_ids)[0],
        'DSCL ID': ', '.join(get_discount_info(check, discount_ids)[1]),
        'Discount Name': get_discount_info(check, discount_ids)[2],
        'Cashier Qu Backend ID': str(check.get('employee_id', '')),
        'Loyalty ID': check.get('loyalty_id', '')
    }

def extract_loyalty_csv_data(data, discount_ids):
    """Extract loyalty data for CSV from raw data"""
    csv_data = []
    for location_data in data:
        location_id = location_data['req_location_id']
        checks = location_data['data'].get('check', [])
        for check in checks:
            # For loyalty data, include all checks since we're already filtering in the transformation
            csv_row = create_csv_row(check, location_id, discount_ids)
            csv_data.append(csv_row)
    
    return csv_data

def generate_loyalty_csv_file(csv_data, date_str, prefix, output_bucket=None):
    """Generate and store loyalty CSV file"""
    if not csv_data:
        print("No loyalty data to export")
        return
        
    # Sort by date first, then store
    csv_data.sort(key=lambda x: (x['SortDate'], int(x['Store'])))
    
    # Generate CSV filename
    filename = f"/tmp/loyalty_data_{date_str}.csv"
    
    # Write CSV (exclude SortDate field)
    with open(filename, 'w', newline='') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=[
            'Date', 'Store', 'CHK', 'CHK Total', 'ITM', 
            'ITM $', 'DSCL', 'DSCL ID', 'Discount Name', 
            'Cashier Qu Backend ID', 'Loyalty ID'
        ])
        writer.writeheader()
        for row in csv_data:
            row_copy = row.copy()
            del row_copy['SortDate']
            writer.writerow(row_copy)
    
    # Use the specified bucket or default to MAIN_BUCKET
    bucket = output_bucket or MAIN_BUCKET
    
    # Upload to S3
    s3.upload_file(
        filename, 
        bucket, 
        f"{prefix}loyalty_data_{date_str}.csv"
    )
    print(f"Exported loyalty data CSV to {bucket}/{prefix}loyalty_data_{date_str}.csv")
    print(f"Loyalty data report contains {len(csv_data)} transactions")

def process_date_range(start_date, end_date, location_ids, get_headers, report_types, 
                       include_raw=False, discount_ids=None, min_usage_threshold=1, 
                       max_check_number=99999, daily_run=False, output_bucket=None):
    """
    Process a date range based on daily_run flag:
    - If daily_run=True: Generate individual reports for each date
    - If daily_run=False: Generate one combined report for the range
    """
    start_datetime = datetime.strptime(start_date, "%m%d%Y")
    end_datetime = datetime.strptime(end_date, "%m%d%Y") if end_date else start_datetime
    dates_to_process = list(daterange(start_datetime, end_datetime))
    
    # For single date vs. date range
    is_range = len(dates_to_process) > 1
    
    print(f"Processing {len(dates_to_process)} dates from {start_datetime.strftime('%Y-%m-%d')} to {end_datetime.strftime('%Y-%m-%d')}")
    print(f"Mode: {'Daily reports' if daily_run else 'Combined report'}")
    print(f"Output bucket: {output_bucket or MAIN_BUCKET} (default)")
    
    # Set up data collection variables
    all_loyalty_usage = {}
    all_flagged_transactions = []
    all_no_loyalty_transactions = []
    all_loyalty_csv_data = []
    
    # Process each date
    for single_date in dates_to_process:
        date_str = single_date.strftime("%m%d%Y")
        
        # Extract data for this date
        _, data = extract_data_for_date(date_str, location_ids, get_headers,
                                      include_raw, discount_ids, RAW_LOYALTY_PREFIX)
        
        if not data:
            continue
            
        # Process for red flag reporting
        if 'all' in report_types or 'redflag' in report_types:
            date_loyalty_usage = count_loyalty_occurrences(data)
            
            if daily_run:
                # Generate individual day reports
                flagged_loyalty_ids = identify_flagged_loyalty_ids(date_loyalty_usage, min_usage_threshold)
                if flagged_loyalty_ids:
                    summary, _, transactions = create_red_flag_report(data, flagged_loyalty_ids, date_loyalty_usage)
                    
                    # No loyalty discount report
                    discount_ids_set = set(str(id) for id in (discount_ids or DEFAULT_DISCOUNT_IDS))
                    no_loyalty_report = create_no_loyalty_discount_report(data, discount_ids_set, max_check_number)
                    
                    # Generate and store individual day reports
                    formatted_date = format_date_for_filename(date_str)
                    generate_red_flag_report_files(summary, transactions, no_loyalty_report, 
                                                 formatted_date, REPORTING_DATA_PREFIX, output_bucket)
            else:
                # Collect data for combined report
                for loyalty_id, date_counts in date_loyalty_usage.items():
                    if loyalty_id not in all_loyalty_usage:
                        all_loyalty_usage[loyalty_id] = {}
                    all_loyalty_usage[loyalty_id].update(date_counts)
                
                flagged_loyalty_ids = identify_flagged_loyalty_ids(date_loyalty_usage, min_usage_threshold)
                if flagged_loyalty_ids:
                    _, _, transactions = create_red_flag_report(data, flagged_loyalty_ids, date_loyalty_usage)
                    all_flagged_transactions.extend(transactions)
                
                discount_ids_set = set(str(id) for id in (discount_ids or DEFAULT_DISCOUNT_IDS))
                no_loyalty_report = create_no_loyalty_discount_report(data, discount_ids_set, max_check_number)
                all_no_loyalty_transactions.extend(no_loyalty_report)
        
        # Process for loyalty data
        if 'all' in report_types or 'loyalty' in report_types:
            discount_ids_set = set(str(id) for id in (discount_ids or DEFAULT_DISCOUNT_IDS))
            csv_data = extract_loyalty_csv_data(data, discount_ids_set)
            
            if daily_run:
                # Generate individual day loyalty report
                formatted_date = format_date_for_filename(date_str)
                generate_loyalty_csv_file(csv_data, formatted_date, LOYALTY_DATA_PREFIX, output_bucket)
            else:
                # Collect for combined report
                all_loyalty_csv_data.extend(csv_data)
    
    # Generate combined report only when daily_run is False and we have multiple dates
    if not daily_run and is_range:
        print("Generating combined report for the entire date range")
        
        range_date_str = f"{start_date}_to_{end_date}"
        formatted_range = format_date_for_filename(range_date_str)
        
        # Combined red flag report
        if 'all' in report_types or 'redflag' in report_types:
            flagged_loyalty_ids = identify_flagged_loyalty_ids(all_loyalty_usage, min_usage_threshold)
            if flagged_loyalty_ids:
                summary = create_summary_from_transactions(all_flagged_transactions, flagged_loyalty_ids)
                generate_red_flag_report_files(summary, all_flagged_transactions,
                                            all_no_loyalty_transactions, formatted_range, 
                                            REPORTING_DATA_PREFIX, output_bucket)
        
        # Combined loyalty report
        if ('all' in report_types or 'loyalty' in report_types) and all_loyalty_csv_data:
            generate_loyalty_csv_file(all_loyalty_csv_data, formatted_range, LOYALTY_DATA_PREFIX, output_bucket)

def lambda_handler(event, context):
    # Standardize parameter handling
    daily_run = event.get('daily_run', False)
    report_types = event.get('report_types', ['all'])  # Controls which reports to generate
    include_raw = event.get('include_raw', True)  # Controls raw data storage
    min_usage_threshold = event.get('min_usage_threshold', 1)
    max_check_number = event.get('max_check_number', 99999)
    output_bucket = event.get('output_bucket')  # New parameter for custom bucket
    
    # Enhanced logging based on run mode
    print(f"Lambda triggered at {datetime.now()}")
    print(f"Mode: {'Daily run' if daily_run else 'Custom run'}")
    print(f"Report types: {report_types}")
    print(f"Include raw data: {include_raw}")
    print(f"Min usage threshold: {min_usage_threshold}")
    print(f"Max check number: {max_check_number}")
    print(f"Output bucket: {output_bucket or MAIN_BUCKET + ' (default)'}")
    
    # Set up authentication
    try:
        # Authentication
        auth_data = {
            'userName': client_id,
            'password': client_secret,
        }

        headers = {
            'Content-Type': 'application/json'
        }

        auth_response = requests.post(auth_url, json=auth_data, headers=headers)

        token = auth_response.json()['token']
        decoded_token = jwt.decode(token, options={"verify_signature": False})
        user_id = decoded_token['qu.uid']

        get_headers = {
            'Authorization': f'Bearer {token}',
            'x-Integration': user_id,
        }
        
        print("Successfully authenticated with the API")
    except Exception as e:
        error_message = f"Authentication failed: {str(e)}"
        print(error_message)
        raise Exception(error_message)
    
    stop_event = threading.Event()
    
    try:
        if daily_run and not (event.get('start_date') and event.get('end_date')):
            # Standard daily run for yesterday only
            date_str = get_yesterday_date()
            print(f"Running daily job for date: {date_str}")
            
            # Use all locations from synchronized file
            location_ids = get_all_locations_from_sync()
            print(f"Using {len(location_ids)} locations from synchronized locations.json")
            
            # Set up standardized discount IDs
            discount_ids = set(str(id) for id in event.get('discount_ids', DEFAULT_DISCOUNT_IDS))
            
            # Process the single date (using daily_run=True to force individual reports)
            process_date_range(
                date_str, date_str, 
                location_ids, 
                get_headers, 
                report_types,
                include_raw=include_raw,
                discount_ids=discount_ids,
                min_usage_threshold=min_usage_threshold,
                max_check_number=max_check_number,
                daily_run=True,  # Force individual reports
                output_bucket=output_bucket
            )
                
        else:
            # Handle custom parameters for on-demand runs
            start_date = event.get('start_date', config['runtime_parameters']['start_date'])
            end_date = event.get('end_date', config['runtime_parameters'].get('end_date', None))
            
            if not (is_valid_date(start_date) and (end_date is None or is_valid_date(end_date))):
                raise ValueError("Please provide a valid date in MMDDYYYY format.")

            if end_date and datetime.strptime(start_date, "%m%d%Y") > datetime.strptime(end_date, "%m%d%Y"):
                raise ValueError("End date should be later than start date.")
            
            # Process custom location IDs
            location_ids = event.get('location_id')
            if isinstance(location_ids, str):
                location_ids = [int(id.strip()) for id in location_ids.split(',') if id.strip()]
            elif location_ids is None:
                location_ids = get_location_ids(bucket_name, file_name)
            
            # Set up standardized discount IDs
            discount_ids = set(str(id) for id in event.get('discount_ids', DEFAULT_DISCOUNT_IDS))
            
            print(f"Custom run for date range: {start_date} to {end_date or start_date}")
            print(f"Using {len(location_ids)} locations")
                
            # Process the date range (use daily_run flag to determine report generation mode)
            process_date_range(
                start_date, end_date, 
                location_ids, 
                get_headers, 
                report_types,
                include_raw=include_raw,
                discount_ids=discount_ids,
                min_usage_threshold=min_usage_threshold,
                max_check_number=max_check_number,
                daily_run=daily_run,  # Controls whether to generate daily or combined reports
                output_bucket=output_bucket
            )
            
        print("All processing completed successfully")

    except Exception as e:
        error_message = str(e)
        stack_trace = traceback.format_exc()
        error_report = f"ERROR MESSAGE: {error_message}\nSTACK TRACE: {stack_trace}"

        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        function_name = context.function_name
        filename = f"{error_log_path}/{function_name}_{timestamp}_log.txt"

        try:
            s3.put_object(Body=error_report, Bucket=error_log_bucket, Key=filename)
            print(f"Error log uploaded to {error_log_bucket}/{filename}")
        except ClientError as s3_error:
            print(f"Error uploading error log to S3: {str(s3_error)}")

        raise

    return {
        'statusCode': 200,
        'body': json.dumps('Data lake update and report generation completed successfully.')
    }
