/**
 * Application-wide constants
 * Centralized location for hardcoded values used across the application
 */

// S3 bucket URLs
export const S3_IMAGE_BUCKET_URL = "https://huey-site-images.s3.us-east-2.amazonaws.com";

// S3 Data Lake URL (also available as env variable)
export const S3_DATA_LAKE_URL = process.env.NEXT_PUBLIC_DATA_LAKE_S3_URL || "https://data-lake-magooos-site.s3.us-east-2.amazonaws.com";

// LocalStorage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  IS_DARK_MODE: 'isDarkMode',
  USERS_VIEW_TYPE: 'usersViewType',
  SIDEBAR_COLLAPSED: 'isSidebarCollapsed',
} as const;

// Timing constants (in milliseconds)
export const TIMING = {
  TOAST_DURATION: 3000,
  STATUS_CLEAR_DELAY: 2000,
  ERROR_CLEAR_DELAY: 3000,
  DEBOUNCE_DELAY: 300,
  REFETCH_DELAY: 1000,
} as const;

// Default discount IDs for loyalty reports
// Re-exported from legacyLambdaProcessing for convenience
export { DEFAULT_DISCOUNT_IDS, DEFAULT_LOCATION_IDS } from './legacyLambdaProcessing';
