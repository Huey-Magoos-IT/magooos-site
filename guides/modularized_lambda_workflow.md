# Modularized Data Extraction and Reporting Workflow

This document outlines the updated architecture and workflow for the data extraction and reporting system, transitioning from a monolithic Lambda function to a modular, event-driven design orchestrated by AWS Step Functions.

## Core Components

### 1. Lambda Functions (Python 3.12)

Each function is now a focused, independent unit responsible for a specific task.

*   **`Raw_Data_Extraction` (Core Extractor)**
    *   **Responsibility:** Authenticates with the external API, fetches raw data for a given date/location(s), and stores it in the `RAW_LOYALTY_PREFIX` S3 bucket. This function is the single source for raw data.
    *   **Input:** `event` payload containing `start_date`, `end_date`, and `location_ids`.
    *   **Output:** Stores raw JSON data in S3 and returns the S3 key(s) of the stored raw data in its response.
    *   **Triggers:** Can be invoked manually (e.g., via AWS Console, CLI, SDK) for custom runs, or orchestrated by AWS Step Functions for daily runs.

*   **`Red_Flag_Report`**
    *   **Responsibility:** Reads raw data from the `RAW_LOYALTY_PREFIX` S3 bucket, processes it to identify red flags, and generates the red flag summary, detailed, and no-loyalty discount CSV reports.
    *   **Input:** `event` payload containing the S3 key(s) of the raw data to process, `min_usage_threshold`, `max_check_number`, and `output_bucket`.
    *   **Output:** Stores CSV reports in the `REPORTING_DATA_PREFIX` S3 bucket.
    *   **Triggers:** Can be invoked manually, or orchestrated by AWS Step Functions.

*   **`Loyalty_Data_Report`**
    *   **Responsibility:** Reads raw data from the `RAW_LOYALTY_PREFIX` S3 bucket, extracts loyalty-specific CSV data, and generates the loyalty data CSV report.
    *   **Input:** `event` payload containing the S3 key(s) of the raw data to process, `discount_ids_for_loyalty_csv`, and `output_bucket`.
    *   **Output:** Stores the loyalty data CSV report in the `LOYALTY_DATA_PREFIX` S3 bucket.
    *   **Triggers:** Can be invoked manually, or orchestrated by AWS Step Functions.

*   **`Loyalty_Scan_Report`**
    *   **Responsibility:** Reads raw data from the `RAW_LOYALTY_PREFIX` S3 bucket, calculates loyalty scan statistics, and generates the loyalty scan summary and detail CSV reports.
    *   **Input:** `event` payload containing the S3 key(s) of the raw data to process and `output_bucket`.
    *   **Output:** Stores the loyalty scan CSV reports in the `LOYALTY_SCAN_DATA_PREFIX` S3 bucket.
    *   **Triggers:** Can be invoked manually, or orchestrated by AWS Step Functions.

### 2. Shared Components (Lambda Layer: `common_utils_layer`)

To avoid code duplication and simplify dependency management, common functionalities are extracted into a Python Lambda Layer. This layer is attached to all relevant Lambda functions.

*   **Contents:**
    *   Configuration Loading (`load_configuration`, `get_s3_object`)
    *   API Authentication (`get_api_headers`)
    *   S3 Utilities (`s3` client initialization, `write_raw_data`)
    *   Helper Functions (e.g., date handling, location/employee data loading, calculation utilities, discount information retrieval)
    *   External Libraries (`requests`, `PyJWT`)

## Workflow

The system supports both independent, on-demand execution of individual Lambda functions and a coordinated daily run.

### 1. Independent Execution (On-Demand / Manual Triggers)

Any of the four Lambda functions can be invoked directly via the AWS Lambda Console, AWS CLI, or SDK. This allows for flexible testing, debugging, or re-running specific parts of the process without affecting others.

*   **`Raw_Data_Extraction`:** Invoked with specific `start_date`, `end_date`, and `location_ids`.
*   **Report Lambdas:** Invoked with the S3 key(s) of the raw data they need to process.

### 2. Coordinated Daily Run (AWS Step Functions Orchestration: `DailyDataExtractionWorkflow`)

AWS Step Functions defines and manages the multi-step daily workflow, ensuring proper sequencing, error handling, and parallel execution.

*   **Trigger:** An EventBridge Schedule (`DailyDataExtractionSchedule`) triggers the `DailyDataExtractionWorkflow` Step Functions state machine daily at 2 AM UTC.
*   **Step 1: `InvokeDataExtraction`**
    *   The `DailyDataExtractionWorkflow` invokes the `Raw_Data_Extraction` Lambda, passing parameters for yesterday's date and all synchronized locations.
    *   The output of this step (the S3 key(s) of the newly generated raw data) is captured and passed to subsequent steps.
*   **Step 2: `ParallelReportGeneration`**
    *   A "Parallel" state in Step Functions is used to concurrently invoke the three report-generating Lambdas:
        *   `Red_Flag_Report`
        *   `Loyalty_Data_Report`
        *   `Loyalty_Scan_Report`
    *   Each report Lambda receives the S3 key(s) of the raw data generated in the previous step as its input.
    *   The `DailyDataExtractionWorkflow` handles retries and error handling for each branch, ensuring robustness.
*   **Completion:** The Step Function execution completes once all parallel report generation tasks are finished.

This modular approach significantly improves fault isolation, maintainability, scalability, and provides clear control over the entire data processing pipeline.