# Incentivio Email Automation - Proof of Concept Plan

## Overview
Automate processing of Incentivio order failure emails by capturing them via AWS SES and storing structured data in S3 for analysis.

## Business Requirements
- Capture order failure emails automatically
- Extract key data: location, failure type, customer info
- Store data for reporting and analysis
- Track failure patterns by location and type
- Eventually correlate with successful order data

## Simple POC Architecture

### Phase 1: Basic Email Capture (Week 1)
```
Incentivio Email → SES → Lambda → S3 (Raw Storage)
```

**Components:**
1. **SES Email Receiving**
   - Domain: `failures.hueymagoos.com` (or subdomain)
   - Email address: `orders@failures.hueymagoos.com`
   - Rule: Forward all emails to Lambda

2. **Lambda Function** (Python)
   - Triggered by SES
   - Extract email content
   - Save raw email to S3
   - Basic parsing for key fields

3. **S3 Bucket Structure**
   ```
   incentivio-order-failures/
   ├── raw-emails/
   │   └── 2025/07/17/
   │       └── email-20250717-134500-uuid.txt
   ├── processed-data/
   │   └── 2025/07/17/
   │       └── failure-20250717-134500.json
   └── reports/
       └── daily/
           └── 2025-07-17-summary.json
   ```

## Implementation Steps

### Step 1: AWS Setup (30 minutes)
1. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://incentivio-order-failures
   ```

2. **Configure SES Domain**
   - Add DNS records for email receiving
   - Create receiving rule

3. **Create IAM Role**
   - SES permissions
   - S3 read/write permissions
   - Lambda execution role

### Step 2: Lambda Function (2 hours)
```python
import json
import boto3
import re
from datetime import datetime

def lambda_handler(event, context):
    # Parse SES event
    ses_message = event['Records'][0]['ses']['mail']
    
    # Extract email content
    email_content = get_email_content(ses_message)
    
    # Parse Incentivio data
    parsed_data = parse_incentivio_email(email_content)
    
    # Save to S3
    save_raw_email(email_content, ses_message['messageId'])
    save_parsed_data(parsed_data, ses_message['messageId'])
    
    return {'statusCode': 200}

def parse_incentivio_email(content):
    """Extract key data from Incentivio failure email"""
    data = {
        'timestamp': datetime.utcnow().isoformat(),
        'client_id': extract_field(content, r'Client id:\s*([a-f0-9-]+)'),
        'location_id': extract_field(content, r'Location id:\s*([a-f0-9-]+)'),
        'location_name': extract_field(content, r'Location Name\s*([^\n]+)'),
        'order_id': extract_field(content, r'Order Id\s*([a-f0-9]+)'),
        'customer_email': extract_field(content, r'Customer Email\s*([^\n]+)'),
        'customer_name': extract_field(content, r'Customer Name\s*([^\n]+)'),
        'error_message': extract_field(content, r'Error Message\s*([^\n]+)'),
        'order_type': extract_field(content, r'Order Type\s*([^\n]+)'),
        'failure_type': determine_failure_type(content)
    }
    return data

def determine_failure_type(content):
    """Categorize the type of failure"""
    if 'AVS_VERFICATION_FAILED' in content:
        return 'AVS_FAILURE'
    elif 'PAYMENT_TIMEOUT' in content:
        return 'PAYMENT_TIMEOUT'
    elif 'INTERNAL_SERVER_ERROR' in content:
        return 'INTERNAL_ERROR'
    else:
        return 'UNKNOWN'
```

### Step 3: Testing (1 hour)
1. **Manual Test**
   - Send test email to SES address
   - Verify Lambda execution
   - Check S3 storage

2. **Validation**
   - Confirm data extraction accuracy
   - Test with actual Incentivio email format

### Step 4: Basic Reporting (2 hours)
```python
def generate_daily_summary():
    """Create daily failure summary"""
    # Read all failures for today
    # Group by location and failure type
    # Generate summary JSON
    summary = {
        'date': '2025-07-17',
        'total_failures': 15,
        'by_location': {
            'Covington': {'AVS_FAILURE': 8, 'TIMEOUT': 2},
            'Orlando': {'AVS_FAILURE': 3, 'INTERNAL_ERROR': 2}
        },
        'by_type': {
            'AVS_FAILURE': 11,
            'PAYMENT_TIMEOUT': 2,
            'INTERNAL_ERROR': 2
        }
    }
    return summary
```

## Expected Costs (Monthly)
- **SES**: $0.10 per 1,000 emails (~$1-5/month)
- **Lambda**: $0.20 per 1M requests (~$1-3/month)
- **S3**: $0.023 per GB (~$1-5/month)
- **Total**: ~$5-15/month

## Success Metrics
1. **100% email capture** - No missed failure notifications
2. **95% data extraction accuracy** - Key fields parsed correctly
3. **Real-time processing** - Emails processed within 1 minute
4. **Structured storage** - Data queryable for reports

## Next Phase Ideas
- **Dashboard**: Simple web interface for viewing failures
- **Alerts**: SNS notifications for high failure rates
- **Integration**: Connect with order success data
- **ML Analysis**: Predict failure patterns

## Timeline
- **Week 1**: Basic email capture and storage
- **Week 2**: Data parsing and validation
- **Week 3**: Basic reporting and testing
- **Week 4**: Documentation and handoff

## Getting Started
1. Confirm domain for email receiving
2. Set up AWS account access
3. Deploy POC infrastructure
4. Configure Incentivio to send to new address
5. Monitor and iterate

This POC provides immediate value while building foundation for advanced analytics.