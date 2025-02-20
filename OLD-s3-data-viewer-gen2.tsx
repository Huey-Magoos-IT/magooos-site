/**
 * Complete S3 Data Viewer Package
 * Original implementation from Huey-Site project
 * Contains all components and styles needed for the S3 data viewing functionality
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { downloadData } from 'aws-amplify/storage';
import { fetchUserAttributes, getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import Link from 'next/link';
import { Autocomplete, Flex, Text, View, SelectField } from '@aws-amplify/ui-react';
import type { Schema } from '../../amplify/data/resource';

// Initialize Amplify client
const client = generateClient<Schema>();

// API endpoint for hourly reports
const API_URL = "https://gugxj3tjj7.execute-api.us-east-2.amazonaws.com/Production/InitiationLambda";

// ======================
// Type Definitions
// ======================

interface CSVData {
  headers: string[];
  rows: string[][];
}

interface Location {
  id: string;
  name: string;
}

interface S3DataViewerProps {
  date?: string;
  endDate?: string;
  locationIds?: string[];
}

enum ReportType {
  HOURLY_DETAIL = 'hourly_detail',
  DAILY_SUMMARY = 'daily_summary'
}

interface FormComponentProps {
  onSubmit: (formData: any) => void;
  validLocationIDs: string[];
  locations?: Location[];
  onLocationSelect: (locations: Location[]) => void;
  selectedLocations: Location[];
}

interface LocationTableProps {
  selectedLocationIds?: string[];
  onLocationClick?: (location: { id: string; name: string }) => void;
}

interface MessageComponentProps {
  message: {
    text: string;
    type: string;
  };
}

type SortConfig = {
  column: 'name' | 'id';
  direction: 'asc' | 'desc';
};

// ======================
// Utility Functions
// ======================

const isDateValid = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startOf2021 = new Date(2021, 0, 1);

  if (!date) return "Please enter a date.";
  if (date > today) return "Date cannot be in the future.";
  if (date.getTime() === today.getTime()) return "Date cannot be today.";
  if (date < startOf2021) return "Date cannot be before 2021.";
  return "";
};

// ======================
// Message Component
// ======================

function MessageComponent({ message }: MessageComponentProps) {
  if (!message.text) return null;

  return (
    <div className={`message ${message.type}`}>
      {message.text}
    </div>
  );
}

// ======================
// S3 Data Viewer Component
// ======================

function S3DataViewer({ date, endDate, locationIds }: S3DataViewerProps) {
  const [displayData, setDisplayData] = useState<CSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userGroup, setUserGroup] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserGroup = async () => {
      try {
        const user = await getCurrentUser();
        const attributes = await fetchUserAttributes();
        const group = attributes['custom:group'] || 'Users';
        setUserGroup(group);
      } catch (error) {
        console.error('Error fetching user group:', error);
        setUserGroup('Users');
      }
    };

    fetchUserGroup();
  }, []);

  const getStoragePath = (fileName: string) => {
    if (userGroup === 'Admins') {
      return `protected/admins/${fileName}`;
    } else {
      return `protected/users/${fileName}`;
    }
  };

  const getFileName = (startDate: string, endDate?: string) => {
    return `${startDate}_to_${endDate || startDate}_CSV_Data.csv`;
  };

  const processFile = async (startDate: string, endDate?: string): Promise<CSVData | null> => {
    const fileName = getFileName(startDate, endDate);
    const path = getStoragePath(fileName);
    console.log('Attempting to process file:', path);

    try {
      const downloadResult = await downloadData({ path }).result;
      const text = await downloadResult.body.text();

      if (!text.trim()) {
        console.log(`File ${path} is empty`);
        return null;
      }

      const lines = text.split('\n').filter(line => line.trim());
      console.log('Number of lines:', lines.length);

      if (lines.length < 2) {
        console.log(`File ${path} has insufficient data`);
        return null;
      }

      const headers = lines[0].split(',').map(h => h.trim());
      console.log('Headers:', headers);

      const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
      console.log('First row:', rows[0]);

      const locationIdIndex = headers.findIndex(h => h.toLowerCase().includes('location'));
      console.log('Location ID index:', locationIdIndex);

      const filteredRows = locationIds && locationIds.length > 0 && locationIdIndex !== -1
        ? rows.filter(row => locationIds.includes(row[locationIdIndex]))
        : rows;

      console.log(`Processed file ${path}. Headers: ${headers.join(', ')}, Row count: ${filteredRows.length}`);
      return { headers, rows: filteredRows };
    } catch (err) {
      console.error(`Error processing file ${path}:`, err);
      throw new Error(`Error processing file: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  useEffect(() => {
    if (!date || !userGroup) return;

    const loadData = async () => {
      setLoading(true);
      setError(null);
      
      console.log(`Loading data for date: ${date}, endDate: ${endDate}, userGroup: ${userGroup}`);
      console.log(`Location IDs:`, locationIds);

      try {
        const data = await processFile(date, endDate);
        if (data && data.rows.length > 0) {
          setDisplayData(data);
          console.log(`Data loaded successfully. Row count: ${data.rows.length}`);
        } else {
          setError('No data available for the selected date(s)');
          console.log('No data available for the selected date(s)');
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [date, endDate, locationIds, userGroup]);

  return (
    <div className="s3DataViewer">
      <h1>CSV Data for {date}{endDate ? ` to ${endDate}` : ''}</h1>
      <p>User Group: {userGroup || 'Not authenticated'}</p>
      {loading && <div className="loading">Loading data...</div>}
      {error && <div className="error">{error}</div>}
      {displayData && (
        <div className="csvDisplay">
          <table className="csvTable">
            <thead>
              <tr>
                {displayData.headers.map((header, i) => (
                  <th key={i}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ======================
// Location Table Component
// ======================

function LocationTable({ selectedLocationIds = [], onLocationClick }: LocationTableProps) {
  const [locations, setLocations] = useState<Schema["Location"]["type"][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'name', direction: 'asc' });

  const toggleSort = (column: 'name' | 'id') => {
    setSortConfig(prevConfig => {
      if (prevConfig.column === column) {
        return { column, direction: prevConfig.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { column, direction: 'asc' };
    });
  };

  const sortLocations = (items: Schema["Location"]["type"][]) => {
    return [...items].sort((a, b) => {
      if (sortConfig.column === 'name') {
        const comparison = a.name.localeCompare(b.name);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      } else {
        const aId = parseInt(a.id);
        const bId = parseInt(b.id);
        return sortConfig.direction === 'asc' ? aId - bId : bId - aId;
      }
    });
  };

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await client.models.Location.list();
        const sortedData = sortLocations(data);
        setLocations(sortedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching locations:", err);
        setError("Failed to fetch locations. Please try again later.");
      }
    };

    fetchLocations();

    const subscription = client.models.Location.observeQuery().subscribe({
      next: ({ items }) => {
        const sortedItems = sortLocations(items);
        setLocations(sortedItems);
      },
      error: (err) => {
        console.error("Subscription error:", err);
        setError("Error in real-time updates. Please refresh the page.");
      },
    });

    return () => subscription.unsubscribe();
  }, [sortConfig]);

  if (error) {
    return <div className="error">{error}</div>;
  }

  const filteredLocations = locations.filter(
    location => !selectedLocationIds.includes(location.id)
  );

  const handleLocationClick = (location: Schema["Location"]["type"]) => {
    if (onLocationClick) {
      onLocationClick({ id: location.id, name: location.name || location.id });
    }
  };

  const getSortArrow = (column: 'name' | 'id') => {
    if (sortConfig.column === column) {
      return <span className="sortArrow">
        {sortConfig.direction === 'asc' ? '↓' : '↑'}
      </span>;
    }
    return null;
  };

  return (
    <div className="locationTableWrapper">
      <div className="locationTable">
        <table>
          <thead>
            <tr>
              <th 
                className="sortHeader"
                onClick={() => toggleSort('name')}
              >
                <span>
                  Location Name
                  {getSortArrow('name')}
                </span>
              </th>
              <th 
                className="sortHeader"
                onClick={() => toggleSort('id')}
              >
                <span>
                  ID
                  {getSortArrow('id')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={2}>Loading locations...</td>
              </tr>
            ) : (
              filteredLocations.map((location) => (
                <tr 
                  key={location.id}
                  onClick={() => handleLocationClick(location)}
                  className="clickableRow"
                >
                  <td>{location.name}</td>
                  <td>{location.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="tableInfo">
        Total Locations: {filteredLocations.length}
      </div>
    </div>
  );
}

// ======================
// Form Component
// ======================

function FormComponent({ 
  onSubmit, 
  validLocationIDs, 
  locations = [], 
  onLocationSelect,
  selectedLocations: externalSelectedLocations 
}: FormComponentProps) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [reportType, setReportType] = useState<ReportType>(ReportType.DAILY_SUMMARY);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [email, setEmail] = useState("");
  const [outputFormat, setOutputFormat] = useState("csv");

  const isHourlyDetail = reportType === ReportType.HOURLY_DETAIL;

  useEffect(() => {
    setSelectedLocations(externalSelectedLocations);
  }, [externalSelectedLocations]);

  const locationOptions = useMemo(() => {
    const selectedIds = new Set(selectedLocations.map(loc => loc.id));
    return locations
      .filter(loc => !selectedIds.has(loc.id))
      .map(loc => ({
        id: loc.id,
        label: `${loc.name} (${loc.id})`
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [locations, selectedLocations]);

  const handleLocationSelect = (option: any) => {
    const location = locations.find(loc => loc.id === option.id);
    if (location && !selectedLocations.find(loc => loc.id === option.id)) {
      const newSelectedLocations = [...selectedLocations, location];
      setSelectedLocations(newSelectedLocations);
      onLocationSelect(newSelectedLocations);
      setSearchValue("");
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && searchValue) {
      event.preventDefault();
      const filteredOptions = getFilteredOptions(searchValue);
      if (filteredOptions.length > 0) {
        handleLocationSelect(filteredOptions[0]);
      }
    }
  };

  const getFilteredOptions = (searchTerm: string) => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    return locationOptions.filter(opt => {
      const location = locations.find(loc => loc.id === opt.id);
      if (!location) return false;
      
      return location.name.toLowerCase().includes(lowerSearchTerm) || 
             location.id.toLowerCase().includes(lowerSearchTerm);
    });
  };

  const handleRemoveLocation = (locationId: string) => {
    const newSelectedLocations = selectedLocations.filter(loc => loc.id !== locationId);
    setSelectedLocations(newSelectedLocations);
    onLocationSelect(newSelectedLocations);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    const startDateObj = new Date(startDate);
    const endDateObj = isMultiDay ? new Date(endDate) : null;
    
    const dateError = isDateValid(startDateObj) || (endDateObj && isDateValid(endDateObj));

    if (isHourlyDetail) {
      if (!email || !email.match(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/)) {
        setErrorMessage("Please enter a valid email address.");
        return;
      }
    }

    if (dateError) {
      setErrorMessage(dateError);
      return;
    }

    const selectedIds = selectedLocations.length > 0 
      ? selectedLocations.map(loc => loc.id)
      : validLocationIDs;

    const formData: any = {
      locations: selectedIds.join(','),
      summary: reportType === ReportType.DAILY_SUMMARY ? "true" : "false",
      start_date: startDate,
      end_date: isMultiDay ? endDate : startDate
    };

    if (isHourlyDetail) {
      formData.email = email;
      formData.output_format = outputFormat.toUpperCase();
      
      if (isMultiDay) {
        const dayDiff = (endDateObj!.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24);
        if (dayDiff > 62) {
          setErrorMessage("The date range cannot exceed 62 days.");
          return;
        }
      }
    }

    onSubmit(formData);
  };

  const today = new Date().toISOString().split('T')[0];
  const startOf2021 = "2021-01-01";

  return (
    <form onSubmit={handleSubmit} className="form">
      {errorMessage && <div className="errorMessage">{errorMessage}</div>}
      
      <div className="formGroup">
        <SelectField
          label="Report Type"
          value={reportType}
          onChange={(e) => setReportType(e.target.value as ReportType)}
          required
        >
          <option value={ReportType.DAILY_SUMMARY}>Daily Summary Report</option>
          <option value={ReportType.HOURLY_DETAIL}>Hourly Detail Report</option>
        </SelectField>
      </div>

      <div className="formGroup">
        <label htmlFor="startDate">Date *</label>
        <input
          type="date"
          id="startDate"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          min={startOf2021}
          max={today}
          required
        />
      </div>

      <div className="checkboxGroup">
        <input
          type="checkbox"
          id="multiDayCheckbox"
          checked={isMultiDay}
          onChange={(e) => setIsMultiDay(e.checked)}
        />
        <label htmlFor="multiDayCheckbox">End Date (optional)</label>
      </div>

      {isMultiDay && (
        <div className="formGroup">
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || startOf2021}
            max={today}
          />
        </div>
      )}

      <div className="formGroup">
        <Flex direction="column" gap="xxs">
          <Text>Select Locations</Text>
          <Autocomplete
            label="Select Locations"
            labelHidden={true}
            options={locationOptions}
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onSelect={handleLocationSelect}
            onClear={() => setSearchValue("")}
            onKeyDown={handleKeyDown}
          />
          
          <View className="selectedLocationsContainer">
            {selectedLocations.length > 0 ? (
              selectedLocations.map((location) => (
                <Flex 
                  key={location.id}
                  justifyContent="space-between"
                  alignItems="center"
                  className="selectedLocation"
                >
                  <Text>{location.name} ({location.id})</Text>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(location.id)}
                    className="removeLocation"
                  >
                    ×
                  </button>
                </Flex>
              ))
            ) : (
              <Text className="helpText">Leave blank for all locations</Text>
            )}
          </View>
        </Flex>
      </div>

      {isHourlyDetail && (
        <>
          <div className="formGroup">
            <label htmlFor="outputFormat">Output Format *</label>
            <select
              id="outputFormat"
              value={outputFormat}
              onChange={(e) => setOutputFormat(e.target.value)}
              required
            >
              <option value="csv">CSV</option>
              <option value="tsv">TSV</option>
              <option value="pdf">PDF</option>
            </select>
          </div>

          <div className="formGroup">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
        </>
      )}

      <button type="submit" className="submitButton">Submit Request</button>
    </form>
  );
}

// ======================
// Main Page Component
// ======================

export default function DataRequestPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [validLocationIDs, setValidLocationIDs] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<Location[]>([]);
  const [formMessage, setFormMessage] = useState({ text: "", type: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [viewerState, setViewerState] = useState<{
    show: boolean;
    date?: string;
    endDate?: string;
    locationIds?: string[];
  }>({ show: false });

  React.useEffect(() => {
    const fetchLocations = async () => {
      try {
        const { data } = await client.models.Location.list();
        const locationData = data.map(loc => ({
          id: loc.id,
          name: loc.name || loc.id
        }));
        setLocations(locationData);
        setValidLocationIDs(locationData.map(loc => loc.id));
      } catch (err) {
        console.error("Error fetching locations:", err);
        setFormMessage({ text: "Error loading locations. Please try again later.", type: "error" });
      }
    };

    fetchLocations();
  }, []);

  const handleLocationSelect = (locations: Location[]) => {
    setSelectedLocations(locations);
  };

  const handleLocationClick = (location: Location) => {
    if (!selectedLocations.find(loc => loc.id === location.id)) {
      const newLocations = [...selectedLocations, location];
      setSelectedLocations(newLocations);
    }
  };

  const resetViewer = () => {
    setViewerState({ show: false });
  };

  const handleSubmit = async (formData: any) => {
    setIsLoading(true);
    setFormMessage({ text: "", type: "" });
    resetViewer();

    const isDailySummary = formData.summary === "true";

    if (isDailySummary) {
      const startDate = new Date(formData.start_date);
      const endDate = formData.end_date ? new Date(formData.end_date) : startDate;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate > today || endDate > today) {
        setFormMessage({ text: "Date cannot be in the future.", type: "error" });
        setIsLoading(false);
        return;
      }

      const locationIds = formData.locations.split(',');
      console.log('Daily Summary Request:', {
        date: formData.start_date,
        endDate: formData.end_date || formData.start_date,
        locationIds
      });

      setViewerState({
        show: true,
        date: formData.start_date,
        endDate: formData.end_date || formData.start_date,
        locationIds: locationIds.length > 0 ? locationIds : undefined
      });
    } else {
      try {
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData)
        });

        if (response.ok) {
          const result = await response.json();
          setFormMessage({ 
            text: result.message || "Request received, check your email in a minute.", 
            type: "success" 
          });
        } else if (response.status === 429) {
          setFormMessage({ 
            text: "Too many requests. Please contact Qu for assistance.", 
            type: "error" 
          });
        } else {
          const errorResult = await response.json().catch(() => ({}));
          setFormMessage({ 
            text: errorResult.message || "Error processing your request. Please try again.", 
            type: "error" 
          });
        }
      } catch (error) {
        console.error("Network error or server issue:", error);
        setFormMessage({ 
          text: "Network error or server issue. Please check your connection and try again.", 
          type: "error" 
        });
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="pageWrapper">
      <div className="spacer" />
      <div className="container">
        <Link href="/" className="backLink">←</Link>
        <div className="content">
          <section className="formSection">
            <h1>Data Request</h1>
            {formMessage.text && <MessageComponent message={formMessage} />}
            <FormComponent 
              onSubmit={handleSubmit} 
              validLocationIDs={validLocationIDs}
              locations={locations}
              onLocationSelect={handleLocationSelect}
              selectedLocations={selectedLocations}
            />
          </section>
          <section className="tableSection">
            <h1>Available Locations</h1>
            <LocationTable 
              selectedLocationIds={selectedLocations.map(loc => loc.id)}
              onLocationClick={handleLocationClick}
            />
          </section>
          {viewerState.show && (
            <S3DataViewer 
              date={viewerState.date}
              endDate={viewerState.endDate}
              locationIds={viewerState.locationIds}
            />
          )}
        </div>
      </div>
      <div className="spacer" />
      {isLoading && <div className="loader">Loading...</div>}
    </div>
  );
}

// ======================
// CSS Styles
// ======================

const styles = `
/* Page wrapper */
.pageWrapper {
  width: 100%;
  background-color: #f5f5f5;
  min-height: 100vh;
  display: block;
  overflow-y: auto;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

/* Spacer elements */
.spacer {
  height: 100px;
  width: 100%;
  min-height: 150px;
}

/* Back arrow link */
.backLink {
  display: inline-block;
  font-size: 1.5rem;
  color: #e31836;
  text-decoration: none;
  margin-bottom: 0.3rem;
  transition: transform 0.2s ease;
}

.backLink:hover {
  transform: translateX(-3px);
}

/* General container styling */
.container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Flexbox for main content */
.content {
  display: flex;
  gap: 2rem;
  align-items: stretch;
  flex-wrap: wrap;
}

/* Section styling */
.formSection,
.tableSection {
  flex: 1;
  min-width: 450px;
  display: flex;
  flex-direction: column;
}

/* S3 Data Viewer styles */
.s3DataViewer {
  flex-basis: 100%;
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
  margin: 2rem 0;
  height: 1800px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.csvDisplay {
  margin-top: 1rem;
  overflow: auto;
  flex-grow: 1;
  border: 1px solid #ddd;
  border-radius: 8px;
  background-color: #fff;
  max-height: calc(100% - 70px);
}

.csvTable {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.csvTable th,
.csvTable td {
  padding: 0.75rem 1rem;
  text-align: left;
  border: 1px solid #ddd;
}

.csvTable th {
  background-color: #e31836;
  color: white;
  font-weight: 600;
  position: sticky;
  top: 0;
  z-index: 1;
}

/* Location Table styles */
.locationTableWrapper {
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  height: 600px;
}

.locationTable {
  flex: 1;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  position: relative;
}

/* Form styles */
.form {
  background-color: #ffffff;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border: 1px solid #ddd;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  height: 600px;
  overflow-y: auto;
}

.formGroup {
  margin-bottom: 1.5rem;
}

.formGroup label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: #e31836;
}

.formGroup input[type="text"],
.formGroup input[type="email"],
.formGroup input[type="date"],
.formGroup select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e6e6e6;
  border-radius: 8px;
  font-size: 1rem;
transition: all 0.3s ease;
  background-color: #f8f9fa;
}

.formGroup input[type="text"]:focus,
.formGroup input[type="email"]:focus,
.formGroup input[type="date"]:focus,
.formGroup select:focus {
  border-color: #e31836;
  background-color: #fff;
  outline: none;
  box-shadow: 0 0 0 3px rgba(227, 24, 54, 0.1);
}

/* Message styles */
.message {
  padding: 1rem;
  margin-bottom: 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error {
  background-color: #ffebee;
  color: #e31836;
  border: 1px solid #ef9a9a;
}

.success {
  background-color: #e8f5e9;
  color: #2e7d32;
  border: 1px solid #a5d6a7;
}

/* Loading state */
.loader {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.loader::after {
  content: '';
  width: 2rem;
  height: 2rem;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #e31836;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Location selection styles */
.selectedLocationsContainer {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e6e6e6;
  border-radius: 8px;
  padding: 0.5rem;
  margin-top: 0.75rem;
}

.selectedLocation {
  background-color: #f8f9fa;
  border: 1px solid #e6e6e6;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

.removeLocation {
  background: none;
  border: none;
  color: #e31836;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  line-height: 1;
}

.removeLocation:hover {
  color: #c91b32;
}

/* Submit button */
.submitButton {
  background-color: #e31836;
  color: white;
  padding: 0.75rem 2rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.3s ease;
  width: 100%;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 1rem;
}

.submitButton:hover {
  background-color: #c91b32;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(227, 24, 54, 0.2);
}

/* Responsive styles */
@media (max-width: 1200px) {
  .content {
    flex-direction: column;
    gap: 1rem;
  }

  .formSection,
  .tableSection {
    width: 100%;
    min-width: 0;
  }

  .form,
  .locationTableWrapper {
    height: 500px;
  }
}

@media (max-width: 768px) {
  .container {
    margin: 0 1rem;
  }

  .spacer {
    height: 100px;
  }

  .form,
  .locationTableWrapper {
    padding: 1rem;
    height: 400px;
  }

  .s3DataViewer {
    height: 1200px;
  }
}