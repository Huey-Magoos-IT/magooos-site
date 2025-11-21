import {
  S3_IMAGE_BUCKET_URL,
  S3_DATA_LAKE_URL,
  STORAGE_KEYS,
  TIMING,
  DEFAULT_DISCOUNT_IDS,
  DEFAULT_LOCATION_IDS,
} from '../constants';

describe('constants', () => {
  describe('S3_IMAGE_BUCKET_URL', () => {
    it('is defined', () => {
      expect(S3_IMAGE_BUCKET_URL).toBeDefined();
    });

    it('is a valid S3 URL', () => {
      expect(S3_IMAGE_BUCKET_URL).toMatch(/^https:\/\/.*s3.*amazonaws\.com$/);
    });

    it('contains huey-site-images bucket', () => {
      expect(S3_IMAGE_BUCKET_URL).toContain('huey-site-images');
    });
  });

  describe('S3_DATA_LAKE_URL', () => {
    it('is defined', () => {
      expect(S3_DATA_LAKE_URL).toBeDefined();
    });

    it('is a valid S3 URL', () => {
      expect(S3_DATA_LAKE_URL).toMatch(/^https:\/\/.*s3.*amazonaws\.com$/);
    });
  });

  describe('STORAGE_KEYS', () => {
    it('has all required keys', () => {
      expect(STORAGE_KEYS).toHaveProperty('THEME');
      expect(STORAGE_KEYS).toHaveProperty('IS_DARK_MODE');
      expect(STORAGE_KEYS).toHaveProperty('USERS_VIEW_TYPE');
      expect(STORAGE_KEYS).toHaveProperty('SIDEBAR_COLLAPSED');
    });

    it('has string values for all keys', () => {
      expect(typeof STORAGE_KEYS.THEME).toBe('string');
      expect(typeof STORAGE_KEYS.IS_DARK_MODE).toBe('string');
      expect(typeof STORAGE_KEYS.USERS_VIEW_TYPE).toBe('string');
      expect(typeof STORAGE_KEYS.SIDEBAR_COLLAPSED).toBe('string');
    });

    it('has expected storage key values', () => {
      expect(STORAGE_KEYS.THEME).toBe('theme');
      expect(STORAGE_KEYS.IS_DARK_MODE).toBe('isDarkMode');
      expect(STORAGE_KEYS.USERS_VIEW_TYPE).toBe('usersViewType');
      expect(STORAGE_KEYS.SIDEBAR_COLLAPSED).toBe('isSidebarCollapsed');
    });
  });

  describe('TIMING', () => {
    it('has all required timing constants', () => {
      expect(TIMING).toHaveProperty('TOAST_DURATION');
      expect(TIMING).toHaveProperty('STATUS_CLEAR_DELAY');
      expect(TIMING).toHaveProperty('ERROR_CLEAR_DELAY');
      expect(TIMING).toHaveProperty('DEBOUNCE_DELAY');
      expect(TIMING).toHaveProperty('REFETCH_DELAY');
    });

    it('has number values for all timing constants', () => {
      expect(typeof TIMING.TOAST_DURATION).toBe('number');
      expect(typeof TIMING.STATUS_CLEAR_DELAY).toBe('number');
      expect(typeof TIMING.ERROR_CLEAR_DELAY).toBe('number');
      expect(typeof TIMING.DEBOUNCE_DELAY).toBe('number');
      expect(typeof TIMING.REFETCH_DELAY).toBe('number');
    });

    it('has positive values for all timings', () => {
      expect(TIMING.TOAST_DURATION).toBeGreaterThan(0);
      expect(TIMING.STATUS_CLEAR_DELAY).toBeGreaterThan(0);
      expect(TIMING.ERROR_CLEAR_DELAY).toBeGreaterThan(0);
      expect(TIMING.DEBOUNCE_DELAY).toBeGreaterThan(0);
      expect(TIMING.REFETCH_DELAY).toBeGreaterThan(0);
    });

    it('has expected timing values', () => {
      expect(TIMING.TOAST_DURATION).toBe(3000);
      expect(TIMING.STATUS_CLEAR_DELAY).toBe(2000);
      expect(TIMING.ERROR_CLEAR_DELAY).toBe(3000);
      expect(TIMING.DEBOUNCE_DELAY).toBe(300);
      expect(TIMING.REFETCH_DELAY).toBe(1000);
    });
  });

  describe('DEFAULT_DISCOUNT_IDS', () => {
    it('is defined and is an array', () => {
      expect(DEFAULT_DISCOUNT_IDS).toBeDefined();
      expect(Array.isArray(DEFAULT_DISCOUNT_IDS)).toBe(true);
    });

    it('contains expected number of discount IDs', () => {
      expect(DEFAULT_DISCOUNT_IDS).toHaveLength(9);
    });

    it('contains all number values', () => {
      DEFAULT_DISCOUNT_IDS.forEach(id => {
        expect(typeof id).toBe('number');
      });
    });

    it('contains expected discount IDs', () => {
      expect(DEFAULT_DISCOUNT_IDS).toContain(77406);
      expect(DEFAULT_DISCOUNT_IDS).toContain(135733);
      expect(DEFAULT_DISCOUNT_IDS).toContain(147060);
      expect(DEFAULT_DISCOUNT_IDS).toContain(147061);
    });
  });

  describe('DEFAULT_LOCATION_IDS', () => {
    it('is defined and is an array', () => {
      expect(DEFAULT_LOCATION_IDS).toBeDefined();
      expect(Array.isArray(DEFAULT_LOCATION_IDS)).toBe(true);
    });

    it('contains location IDs', () => {
      expect(DEFAULT_LOCATION_IDS.length).toBeGreaterThan(0);
    });

    it('contains all string values', () => {
      DEFAULT_LOCATION_IDS.forEach(id => {
        expect(typeof id).toBe('string');
      });
    });

    it('contains expected location IDs', () => {
      expect(DEFAULT_LOCATION_IDS).toContain('4145');
      expect(DEFAULT_LOCATION_IDS).toContain('4849');
    });
  });
});
