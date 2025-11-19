import {
  getFieldValue,
  extractDateFromFilename,
  convertToCSV,
  filterFilesByDateAndType,
  getEmployeeName,
  FieldAccessor,
} from '../csvProcessing';

describe('csvProcessing', () => {
  describe('getFieldValue', () => {
    it('returns undefined when accessor is undefined', () => {
      const row = { name: 'test' };
      expect(getFieldValue(row, undefined)).toBeUndefined();
    });

    it('returns value for single source name', () => {
      const row = { 'Store': '123' };
      const accessor: FieldAccessor = { sourceNames: 'Store' };
      expect(getFieldValue(row, accessor)).toBe('123');
    });

    it('returns value for first matching source name in array', () => {
      const row = { 'Location ID': '456' };
      const accessor: FieldAccessor = { sourceNames: ['Store', 'Location ID', 'Store Name'] };
      expect(getFieldValue(row, accessor)).toBe('456');
    });

    it('returns default value when field not found', () => {
      const row = { name: 'test' };
      const accessor: FieldAccessor = { sourceNames: 'missing', defaultValue: 'default' };
      expect(getFieldValue(row, accessor)).toBe('default');
    });

    it('returns default value for empty string', () => {
      const row = { name: '' };
      const accessor: FieldAccessor = { sourceNames: 'name', defaultValue: 'default' };
      expect(getFieldValue(row, accessor)).toBe('default');
    });

    it('returns default value for null', () => {
      const row = { name: null };
      const accessor: FieldAccessor = { sourceNames: 'name', defaultValue: 'default' };
      expect(getFieldValue(row, accessor)).toBe('default');
    });

    describe('type coercion', () => {
      it('coerces to string', () => {
        const row = { value: 123 };
        const accessor: FieldAccessor = { sourceNames: 'value', dataType: 'string' };
        expect(getFieldValue(row, accessor)).toBe('123');
      });

      it('coerces to number', () => {
        const row = { value: '456' };
        const accessor: FieldAccessor = { sourceNames: 'value', dataType: 'number' };
        expect(getFieldValue(row, accessor)).toBe(456);
      });

      it('returns default for invalid number', () => {
        const row = { value: 'not-a-number' };
        const accessor: FieldAccessor = { sourceNames: 'value', dataType: 'number', defaultValue: 0 };
        expect(getFieldValue(row, accessor)).toBe(0);
      });

      it('coerces to boolean - true values', () => {
        const accessor: FieldAccessor = { sourceNames: 'value', dataType: 'boolean' };

        expect(getFieldValue({ value: 'true' }, accessor)).toBe(true);
        expect(getFieldValue({ value: 'yes' }, accessor)).toBe(true);
        expect(getFieldValue({ value: '1' }, accessor)).toBe(true);
        expect(getFieldValue({ value: 'TRUE' }, accessor)).toBe(true);
      });

      it('coerces to boolean - false values', () => {
        const accessor: FieldAccessor = { sourceNames: 'value', dataType: 'boolean' };

        expect(getFieldValue({ value: 'false' }, accessor)).toBe(false);
        expect(getFieldValue({ value: 'no' }, accessor)).toBe(false);
        expect(getFieldValue({ value: '0' }, accessor)).toBe(false);
      });

      it('coerces to date', () => {
        const row = { value: '2025-01-15' };
        const accessor: FieldAccessor = { sourceNames: 'value', dataType: 'date' };
        const result = getFieldValue(row, accessor);
        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toContain('2025-01-15');
      });

      it('returns default for invalid date', () => {
        const row = { value: 'invalid-date' };
        const accessor: FieldAccessor = { sourceNames: 'value', dataType: 'date', defaultValue: null };
        expect(getFieldValue(row, accessor)).toBeNull();
      });
    });
  });

  describe('extractDateFromFilename', () => {
    it('extracts date from loyalty_scan_detail format', () => {
      const date = extractDateFromFilename('loyalty_scan_detail_01-15-2025.csv');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(0); // January is 0
      expect(date!.getDate()).toBe(15);
    });

    it('extracts date from loyalty_scan_summary format', () => {
      const date = extractDateFromFilename('loyalty_scan_summary_12-25-2024.csv');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2024);
      expect(date!.getMonth()).toBe(11); // December is 11
      expect(date!.getDate()).toBe(25);
    });

    it('extracts date from loyalty_data format', () => {
      const date = extractDateFromFilename('loyalty_data_03-20-2025.csv');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(2); // March is 2
      expect(date!.getDate()).toBe(20);
    });

    it('extracts date from general prefix-MM-DD-YYYY format', () => {
      const date = extractDateFromFilename('report-06-15-2025.csv');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(5); // June is 5
      expect(date!.getDate()).toBe(15);
    });

    it('extracts date from legacy MMDDYYYY format', () => {
      const date = extractDateFromFilename('data01152025.csv');
      expect(date).not.toBeNull();
      expect(date!.getFullYear()).toBe(2025);
      expect(date!.getMonth()).toBe(0);
      expect(date!.getDate()).toBe(15);
    });

    it('returns null for filename without date', () => {
      expect(extractDateFromFilename('report.csv')).toBeNull();
      expect(extractDateFromFilename('data_file.csv')).toBeNull();
    });

    it('returns null for empty filename', () => {
      expect(extractDateFromFilename('')).toBeNull();
    });
  });

  describe('convertToCSV', () => {
    it('converts array of objects to CSV string', () => {
      const data = [
        { name: 'John', age: 30 },
        { name: 'Jane', age: 25 },
      ];
      const csv = convertToCSV(data);

      expect(csv).toContain('name');
      expect(csv).toContain('age');
      expect(csv).toContain('John');
      expect(csv).toContain('30');
      expect(csv).toContain('Jane');
      expect(csv).toContain('25');
    });

    it('handles empty array', () => {
      const csv = convertToCSV([]);
      expect(csv).toBe('');
    });

    it('uses keys from first object as headers', () => {
      // PapaParse uses keys from first object to determine columns
      const data = [
        { a: 1, b: 2 },
        { a: 3, c: 4 },
      ];
      const csv = convertToCSV(data);

      expect(csv).toContain('a');
      expect(csv).toContain('b');
      // 'c' is not included because it's not in the first object
      expect(csv).not.toContain('c');
    });

    it('handles special characters', () => {
      const data = [
        { name: 'O\'Brien', city: 'New York, NY' },
      ];
      const csv = convertToCSV(data);

      expect(csv).toContain('O\'Brien');
      expect(csv).toContain('New York');
    });
  });

  describe('filterFilesByDateAndType', () => {
    const files = [
      'loyalty_scan_detail_01-10-2025.csv',
      'loyalty_scan_detail_01-15-2025.csv',
      'loyalty_scan_detail_01-20-2025.csv',
      'loyalty_scan_summary_01-15-2025.csv',
      'loyalty_data_01-15-2025.csv',
      'other_file.csv',
    ];

    it('returns empty array when dates are null', () => {
      expect(filterFilesByDateAndType(files, null, null, 'loyalty_scan_detail')).toEqual([]);
      expect(filterFilesByDateAndType(files, new Date(), null, 'loyalty_scan_detail')).toEqual([]);
      expect(filterFilesByDateAndType(files, null, new Date(), 'loyalty_scan_detail')).toEqual([]);
    });

    it('filters by data type', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      const detailFiles = filterFilesByDateAndType(files, startDate, endDate, 'loyalty_scan_detail');
      expect(detailFiles).toHaveLength(3);
      expect(detailFiles.every(f => f.startsWith('loyalty_scan_detail'))).toBe(true);

      const summaryFiles = filterFilesByDateAndType(files, startDate, endDate, 'loyalty_scan_summary');
      expect(summaryFiles).toHaveLength(1);
      expect(summaryFiles[0]).toBe('loyalty_scan_summary_01-15-2025.csv');
    });

    it('filters by date range', () => {
      const startDate = new Date('2025-01-12');
      const endDate = new Date('2025-01-18');

      const filtered = filterFilesByDateAndType(files, startDate, endDate, 'loyalty_scan_detail');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toBe('loyalty_scan_detail_01-15-2025.csv');
    });

    it('includes files on boundary dates', () => {
      const startDate = new Date('2025-01-15');
      const endDate = new Date('2025-01-15');

      const filtered = filterFilesByDateAndType(files, startDate, endDate, 'loyalty_scan_detail');
      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toBe('loyalty_scan_detail_01-15-2025.csv');
    });

    it('excludes files without parseable dates', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      const filtered = filterFilesByDateAndType(files, startDate, endDate, 'other');
      expect(filtered).toHaveLength(0);
    });

    it('handles empty file list', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      expect(filterFilesByDateAndType([], startDate, endDate, 'loyalty_scan_detail')).toEqual([]);
    });
  });

  describe('getEmployeeName', () => {
    const employeeData: Record<string, string> = {
      '12345': 'John Doe',
      '67890': 'Jane Smith',
      '11111': 'Bob Johnson',
    };

    it('returns employee name for known loyalty ID', () => {
      expect(getEmployeeName('12345', employeeData)).toBe('John Doe');
      expect(getEmployeeName('67890', employeeData)).toBe('Jane Smith');
    });

    it('returns Unknown format for unknown loyalty ID', () => {
      const result = getEmployeeName('99999', employeeData);
      expect(result).toBe('Unknown (ID: 99999)');
    });

    it('returns Unknown format for empty loyalty ID', () => {
      const result = getEmployeeName('', employeeData);
      expect(result).toBe('Unknown (ID: )');
    });

    it('returns Unknown format when employee data is empty', () => {
      const result = getEmployeeName('12345', {});
      expect(result).toBe('Unknown (ID: 12345)');
    });

    it('handles numeric-like string IDs', () => {
      expect(getEmployeeName('11111', employeeData)).toBe('Bob Johnson');
    });
  });
});
