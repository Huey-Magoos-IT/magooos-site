"use client";

import React, { useState } from "react";
import { ChevronDown, ChevronUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarItemProps {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isActive?: boolean;
  hasChildren?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  level?: number;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label,
  href,
  icon,
  isActive = false,
  hasChildren = false,
  isOpen = false,
  onToggle,
  level = 0
}) => {
  const paddingLeft = level * 12 + 16; // Increase padding for nested items
  
  const content = (
    <div 
      className={`
        flex items-center justify-between py-2 px-4 text-sm
        ${isActive ? 'bg-blue-50 text-blue-700 font-medium dark:bg-blue-900/20 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}
        ${hasChildren ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
      `}
      style={{ paddingLeft }}
      onClick={hasChildren ? onToggle : undefined}
    >
      <div className="flex items-center">
        {icon && <span className="mr-2">{icon}</span>}
        <span>{label}</span>
      </div>
      {hasChildren && (
        <span>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          )}
        </span>
      )}
    </div>
  );

  return href && !hasChildren ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    <div>{content}</div>
  );
};

interface SidebarSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const SidebarSection: React.FC<SidebarSectionProps> = ({
  title,
  children,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-gray-200 dark:border-gray-700">
      <SidebarItem
        label={title}
        hasChildren={true}
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />
      {isOpen && <div className="py-1">{children}</div>}
    </div>
  );
};

const QUSidebar = () => {
  const pathname = usePathname();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    overview: true,
    sales: false,
    labor: false,
    product: false,
    payments: false,
    kitchen: false
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <div className="w-64 h-full bg-white border-r border-gray-200 overflow-y-auto dark:bg-gray-900 dark:border-gray-700">
      {/* Search Bar */}
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <input
            type="text"
            placeholder="Filter Report Categories"
            className="w-full px-3 py-2 pl-8 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          />
          <svg
            className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400 dark:text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Overview Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SidebarItem
          label="Overview"
          hasChildren={true}
          isOpen={openSections.overview}
          onToggle={() => toggleSection('overview')}
        />
        {openSections.overview && (
          <div>
            <SidebarItem
              label="Real Time Summary"
              href="/reports/overview/real-time-summary"
              isActive={pathname === "/reports/overview/real-time-summary"}
              level={1}
            />
            <SidebarItem
              label="Store Comparison"
              href="/reports/overview/store-comparison"
              isActive={pathname === "/reports/overview/store-comparison"}
              level={1}
            />
            <SidebarItem
              label="Summary"
              href="/reports/overview/summary"
              isActive={pathname === "/reports/overview/summary"}
              level={1}
            />
            <SidebarItem
              label="Summary By Date"
              href="/reports/overview/summary-by-date"
              isActive={pathname === "/reports/overview/summary-by-date"}
              level={1}
            />
          </div>
        )}
      </div>

      {/* Sales Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SidebarItem
          label="Sales"
          hasChildren={true}
          isOpen={openSections.sales}
          onToggle={() => toggleSection('sales')}
        />
        {openSections.sales && (
          <div>
            <SidebarItem
              label="Check Detail"
              href="/reports/sales/check-detail"
              isActive={pathname === "/reports/sales/check-detail"}
              level={1}
            />
            <SidebarItem
              label="Customers"
              href="/reports/sales/customers"
              isActive={pathname === "/reports/sales/customers"}
              level={1}
            />
            <SidebarItem
              label="Digital Orders"
              href="/reports/sales/digital-orders"
              isActive={pathname === "/reports/sales/digital-orders"}
              level={1}
            />
            <SidebarItem
              label="Discounts"
              href="/reports/sales/discounts"
              isActive={pathname === "/reports/sales/discounts"}
              level={1}
            />
            <SidebarItem
              label="Gift Card Discounts"
              href="/reports/sales/gift-card-discounts"
              isActive={pathname === "/reports/sales/gift-card-discounts"}
              level={1}
            />
            <SidebarItem
              label="Hourly Sales"
              href="/reports/sales/hourly-sales"
              isActive={pathname === "/reports/sales/hourly-sales"}
              level={1}
            />
            <SidebarItem
              label="Service Charges"
              href="/reports/sales/service-charges"
              isActive={pathname === "/reports/sales/service-charges"}
              level={1}
            />
            <SidebarItem
              label="Taxes"
              href="/reports/sales/taxes"
              isActive={pathname === "/reports/sales/taxes"}
              level={1}
            />
          </div>
        )}
      </div>

      {/* Labor Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SidebarItem
          label="Labor"
          hasChildren={true}
          isOpen={openSections.labor}
          onToggle={() => toggleSection('labor')}
        />
        {openSections.labor && (
          <div>
            <SidebarItem
              label="Employee Meals"
              href="/reports/labor/employee-meals"
              isActive={pathname === "/reports/labor/employee-meals"}
              level={1}
            />
            <SidebarItem
              label="Employee Tips"
              href="/reports/labor/employee-tips"
              isActive={pathname === "/reports/labor/employee-tips"}
              level={1}
            />
            <SidebarItem
              label="Labor Red Flag"
              href="/reports/labor/labor-red-flag"
              isActive={pathname === "/reports/labor/labor-red-flag"}
              level={1}
            />
            <SidebarItem
              label="Labor Summary"
              href="/reports/labor/labor-summary"
              isActive={pathname === "/reports/labor/labor-summary"}
              level={1}
            />
            <SidebarItem
              label="Payroll Summary"
              href="/reports/labor/payroll-summary"
              isActive={pathname === "/reports/labor/payroll-summary"}
              level={1}
            />
            <SidebarItem
              label="Tip Pools"
              href="/reports/labor/tip-pools"
              isActive={pathname === "/reports/labor/tip-pools"}
              level={1}
            />
          </div>
        )}
      </div>

      {/* Product Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SidebarItem
          label="Product"
          hasChildren={true}
          isOpen={openSections.product}
          onToggle={() => toggleSection('product')}
        />
        {openSections.product && (
          <div>
            <SidebarItem
              label="Modifiers"
              href="/reports/product/modifiers"
              isActive={pathname === "/reports/product/modifiers"}
              level={1}
            />
            <SidebarItem
              label="Out of Stock Items"
              href="/reports/product/out-of-stock"
              isActive={pathname === "/reports/product/out-of-stock"}
              level={1}
            />
            <SidebarItem
              label="Product By Location"
              href="/reports/product/by-location"
              isActive={pathname === "/reports/product/by-location"}
              level={1}
            />
            <SidebarItem
              label="Product Mix"
              href="/reports/product/mix"
              isActive={pathname === "/reports/product/mix"}
              level={1}
            />
            <SidebarItem
              label="Returned Items"
              href="/reports/product/returned-items"
              isActive={pathname === "/reports/product/returned-items"}
              level={1}
            />
            <SidebarItem
              label="Voided Items"
              href="/reports/product/voided-items"
              isActive={pathname === "/reports/product/voided-items"}
              level={1}
            />
          </div>
        )}
      </div>

      {/* Payments Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SidebarItem
          label="Payments"
          hasChildren={true}
          isOpen={openSections.payments}
          onToggle={() => toggleSection('payments')}
        />
        {openSections.payments && (
          <div>
            <SidebarItem
              label="Cash Deposits"
              href="/reports/payments/cash-deposits"
              isActive={pathname === "/reports/payments/cash-deposits"}
              level={1}
            />
            <SidebarItem
              label="Paid In/Out"
              href="/reports/payments/paid-in-out"
              isActive={pathname === "/reports/payments/paid-in-out"}
              level={1}
            />
            <SidebarItem
              label="Payment Details"
              href="/reports/payments/payment-details"
              isActive={pathname === "/reports/payments/payment-details"}
              level={1}
            />
            <SidebarItem
              label="Refunds"
              href="/reports/payments/refunds"
              isActive={pathname === "/reports/payments/refunds"}
              level={1}
            />
            <SidebarItem
              label="Tips"
              href="/reports/payments/tips"
              isActive={pathname === "/reports/payments/tips"}
              level={1}
            />
          </div>
        )}
      </div>

      {/* Kitchen Section */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <SidebarItem
          label="Kitchen"
          hasChildren={true}
          isOpen={openSections.kitchen}
          onToggle={() => toggleSection('kitchen')}
        />
        {openSections.kitchen && (
          <div>
            <SidebarItem
              label="Kitchen Performance"
              href="/reports/kitchen/performance"
              isActive={pathname === "/reports/kitchen/performance"}
              level={1}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default QUSidebar;