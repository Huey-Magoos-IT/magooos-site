import { PriceChange } from './priceChangeUtils';

export interface ReportChangeDetail {
  itemName: string;
  locationId: string;
  oldPrice: number;
  newPrice: number;
}

export interface PriceChangeReport {
  id: string;
  franchiseeId: string;
  franchiseeName: string;
  groupName: string;
  locationIds: string[];
  submittedDate: string;
  status: 'pending' | 'sent' | 'archived';
  changes: ReportChangeDetail[];
  totalChanges: number;
  userId?: string;
  username?: string;
}

// Function to parse price change CSV files from S3
export const parsePriceChangeCSV = async (csvData: string, fileName: string): Promise<PriceChangeReport | null> => {
  try {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return null;
    
    const headers = lines[0].split(',').map(h => h.trim());
    const changes: ReportChangeDetail[] = [];
    
    // Extract metadata from filename
    const fileNameWithoutExt = fileName.replace('.csv', '');
    let reportId = fileNameWithoutExt;
    let extractedUsername = 'Unknown User';
    let extractedUserId = 'unknown';
    
    if (fileNameWithoutExt.includes('_')) {
      const priceIndex = fileNameWithoutExt.indexOf('PRICE-');
      if (priceIndex !== -1) {
        reportId = fileNameWithoutExt.substring(priceIndex);
        const beforePrice = fileNameWithoutExt.substring(0, priceIndex - 1);
        const parts = beforePrice.split('_');
        
        if (parts.length >= 4) {
          extractedUserId = parts[parts.length - 1];
          extractedUsername = parts[parts.length - 2];
        }
      } else {
        const parts = fileNameWithoutExt.split('_');
        if (parts.length >= 5) {
          extractedUsername = parts[parts.length - 3];
          extractedUserId = parts[parts.length - 2];
          reportId = parts[parts.length - 1];
        }
      }
    } else if (fileNameWithoutExt.includes('-')) {
      const fileNameParts = fileNameWithoutExt.split('-');
      if (fileNameParts.length >= 3) {
        reportId = `${fileNameParts[0]}-${fileNameParts[1]}-${fileNameParts[2]}`;
      } else {
        reportId = fileNameWithoutExt;
      }
    }
    
    let groupName = 'Unknown Group';
    let submittedDate = new Date().toISOString();
    let franchiseeName = extractedUsername;
    let locationIds: string[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const row: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          row.push(current.trim().replace(/^"|"$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      row.push(current.trim().replace(/^"|"$/g, ''));
      
      if (row.length < headers.length) {
        continue;
      }
      
      const rowData: {[key: string]: string} = {};
      headers.forEach((header, index) => {
        rowData[header] = (row[index] || '').replace(/^\t+/, '');
      });
      
      if (i === 1) {
        groupName = rowData['Group Name'] || groupName;
        submittedDate = rowData['Submitted Date'] || submittedDate;
        franchiseeName = extractedUsername;
      }
      
      const itemName = rowData['Item Name'];
      const locationId = rowData['Location ID'];
      const oldPrice = parseFloat(rowData['Old Price'] || '0');
      const newPrice = parseFloat(rowData['New Price'] || '0');
      
      if (itemName && locationId && !isNaN(oldPrice) && !isNaN(newPrice)) {
        changes.push({
          itemName,
          locationId,
          oldPrice,
          newPrice
        });
        
        if (!locationIds.includes(locationId)) {
          locationIds.push(locationId);
        }
      }
    }
    
    if (changes.length === 0) return null;
    
    return {
      id: reportId,
      franchiseeId: extractedUserId,
      franchiseeName,
      groupName,
      locationIds,
      submittedDate,
      status: 'pending',
      changes,
      totalChanges: changes.length,
      userId: extractedUserId,
      username: extractedUsername
    };
  } catch (error) {
    console.error('Error parsing price change CSV:', error);
    return null;
  }
};