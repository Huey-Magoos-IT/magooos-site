"use client";

import React, { useState } from "react";
import QUReportLayout from "@/components/QUReportLayout";
import QUReportSection from "@/components/QUReportSection";
import QUMetricTable from "@/components/QUMetricTable";
import { Button, MenuItem, Select, FormControl, InputLabel } from "@mui/material";
import { Filter, ChevronLeft } from "lucide-react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

const RealTimeSummaryPage = () => {
  const [date, setDate] = useState<Date | null>(new Date());
  const [location, setLocation] = useState("Huey Magoo&apos;s HQ Lab");
  const [showFilters, setShowFilters] = useState(false);
  const [employeeRequired, setEmployeeRequired] = useState("Yes");

  // Sample metrics data
  const overviewMetrics = [
    { name: "Net Sales", value: 0.00 },
    { name: "Gross Sales", value: 0.00 },
    { name: "Gift Card Sales", value: 0.00 },
    { name: "Gift Card Discounts", value: 0.00, info: "Total discounts applied from gift cards" },
    { name: "Discounts", value: 0.00 },
    { name: "Taxes", value: 0.00 },
    { name: "Returned Amount", value: 0.00 },
    { name: "Average Check", value: 0.00 },
    { name: "Total Checks Count", value: 0 },
  ];

  const laborMetrics = [
    { name: "Hours Worked", value: 0.00 },
    { name: "Regular Hours", value: 0.00 },
    { name: "Overtime Hours", value: 0.00 },
    { name: "Labor Cost", value: 0.00 },
    { name: "Total Labor %", value: 0.00, info: "Labor cost as a percentage of sales" },
    { name: "Profit Shared Donations", value: 0.00 },
    { name: "Productivity", value: 0.00 },
  ];

  const paymentsMetrics = [
    { name: "Total", value: 0.00 },
  ];

  const tipsMetrics = [
    { name: "Total", value: 0.00 },
  ];

  return (
    <QUReportLayout>
      <div className="container mx-auto p-4">
        {/* Back Button */}
        <button className="flex items-center text-blue-600 hover:text-blue-800 mb-4 dark:text-blue-400 dark:hover:text-blue-300">
          <ChevronLeft className="h-4 w-4 mr-1" />
          <span className="text-sm">Back</span>
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Real Time Summary</h1>
          
          {/* Date and Location Info */}
          <div className="mt-2 flex flex-wrap items-center gap-4">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Date:</span>
              <span className="text-sm text-gray-800 dark:text-white">{date?.toLocaleDateString()}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Location:</span>
              <span className="text-sm text-gray-800 dark:text-white">{location}</span>
            </div>
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300 mr-2">Employee Required to Clock In?:</span>
              <span className="text-sm text-gray-800 dark:text-white">{employeeRequired}</span>
            </div>
          </div>
        </div>

        {/* Filters Button */}
        <div className="mb-4">
          <Button
            variant="outlined"
            startIcon={<Filter className="h-4 w-4" />}
            onClick={() => setShowFilters(!showFilters)}
            className="border-blue-500 text-blue-600 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400 dark:hover:bg-blue-900/10"
            size="small"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </Button>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-md shadow-sm border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <DatePicker
                label="Date"
                value={date}
                onChange={(newValue) => setDate(newValue)}
                className="bg-white dark:bg-gray-700"
                slotProps={{
                  textField: {
                    variant: "outlined",
                    fullWidth: true,
                    size: "small"
                  }
                }}
              />
              
              <FormControl fullWidth size="small">
                <InputLabel>Location</InputLabel>
                <Select
                  value={location}
                  onChange={(e) => setLocation(e.target.value as string)}
                  label="Location"
                >
                  <MenuItem value="Huey Magoo&apos;s HQ Lab">Huey Magoo&apos;s HQ Lab</MenuItem>
                  <MenuItem value="Winter Garden, FL">Winter Garden, FL</MenuItem>
                  <MenuItem value="Orlando, FL">Orlando, FL</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth size="small">
                <InputLabel>Employee Required to Clock In?</InputLabel>
                <Select
                  value={employeeRequired}
                  onChange={(e) => setEmployeeRequired(e.target.value as string)}
                  label="Employee Required to Clock In?"
                >
                  <MenuItem value="Yes">Yes</MenuItem>
                  <MenuItem value="No">No</MenuItem>
                </Select>
              </FormControl>
            </div>
            
            <div className="mt-4 flex justify-end">
              <Button
                variant="contained"
                className="bg-blue-500 hover:bg-blue-600 text-white"
                size="small"
              >
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* Report Sections */}
        <QUReportSection title="Overview">
          <QUMetricTable metrics={overviewMetrics} />
        </QUReportSection>

        <QUReportSection title="Labor">
          <QUMetricTable metrics={laborMetrics} />
        </QUReportSection>

        <QUReportSection title="Payments">
          <QUMetricTable metrics={paymentsMetrics} />
        </QUReportSection>

        <QUReportSection title="Tips">
          <QUMetricTable metrics={tipsMetrics} />
        </QUReportSection>
      </div>
    </QUReportLayout>
  );
};

export default RealTimeSummaryPage;