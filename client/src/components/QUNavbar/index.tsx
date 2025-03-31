"use client";

import React, { useState } from "react";
import { HelpCircle, User, Moon, Sun, Search } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { useGetAuthUserQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import { setIsDarkMode } from "@/state";
import Image from "next/image";
import { usePathname } from "next/navigation";

const QUNavbar = () => {
  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: currentUser } = useGetAuthUserQuery({});
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (!currentUser) return null;
  const currentUserDetails = currentUser?.userDetails;

  // Determine active section based on pathname
  const isReportsActive = pathname.includes('/reports') || pathname.includes('/departments/reporting');
  const isConfigActive = pathname.includes('/settings') || pathname.includes('/users') || pathname.includes('/teams');
  const isOperationsActive = pathname.includes('/operations');

  // Generate breadcrumbs based on pathname
  const generateBreadcrumbs = () => {
    const paths = pathname.split('/').filter(p => p);
    
    if (paths.length === 0) return null;
    
    // Map path segments to more readable names
    const pathMap: {[key: string]: string} = {
      'departments': 'Departments',
      'reporting': 'Reporting',
      'data': 'Data',
      'reports': 'Reports',
      'overview': 'Overview',
      'real-time-summary': 'Real Time Summary',
      'users': 'Users',
      'teams': 'Teams',
      'settings': 'Settings',
      'search': 'Search'
    };
    
    return (
      <div className="flex items-center h-[40px] bg-gray-50 border-b border-gray-200 px-4 dark:bg-gray-800 dark:border-gray-700">
        {paths.map((path, index) => {
          const displayName = pathMap[path] || path;
          const url = `/${paths.slice(0, index + 1).join('/')}`;
          
          return (
            <React.Fragment key={path}>
              {index > 0 && <span className="mx-2 text-gray-400">&gt;</span>}
              {index === paths.length - 1 ? (
                <span className="text-sm font-medium text-gray-800 dark:text-white">
                  {displayName}
                </span>
              ) : (
                <Link href={url} className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white">
                  {displayName}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full">
      {/* Main Navigation Bar */}
      <div className="flex items-center justify-between bg-white border-b border-gray-200 dark:bg-black dark:border-gray-700">
        {/* Left side - Logo and Main Navigation */}
        <div className="flex items-center">
          {/* Logo in red background */}
          <div className="bg-red-600 h-[50px] w-[50px] flex items-center justify-center">
            <Image
              src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_black-01.png"
              alt="Huey Magoo&apos;s Logo"
              width={30}
              height={30}
              className="invert" // Make logo white on red background
            />
          </div>
          
          {/* Main Navigation Tabs */}
          <div className="flex h-[50px]">
            <Link
              href="/departments/reporting"
              className={`flex items-center px-4 h-full font-medium ${
                isReportsActive
                  ? 'border-b-2 border-red-600 text-gray-800 dark:text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <span>Reports</span>
            </Link>
            <Link
              href="/settings"
              className={`flex items-center px-4 h-full font-medium ${
                isConfigActive
                  ? 'border-b-2 border-red-600 text-gray-800 dark:text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <span>Configuration</span>
            </Link>
            <Link
              href="/operations"
              className={`flex items-center px-4 h-full font-medium ${
                isOperationsActive
                  ? 'border-b-2 border-red-600 text-gray-800 dark:text-white'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300'
              }`}
            >
              <span>Operations</span>
            </Link>
          </div>
        </div>
        
        {/* Right side - Search, Dark Mode, User and Help */}
        <div className="flex items-center mr-4">
          {/* Search */}
          <div className="relative mr-4">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-[200px] h-8 pl-8 pr-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          
          {/* Dark Mode Toggle */}
          <button
            onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-2"
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}
          </button>
          
          {/* Help */}
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 mr-2">
            <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          
          {/* User Profile */}
          <div className="flex items-center ml-2">
            {!!currentUserDetails?.profilePictureUrl ? (
              <Image
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${currentUserDetails?.profilePictureUrl}`}
                alt={currentUserDetails?.username || "User Profile Picture"}
                width={32}
                height={32}
                className="rounded-full border border-gray-200 dark:border-gray-700"
              />
            ) : (
              <User className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            )}
            <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              {currentUserDetails?.username}
            </span>
            <button
              className="ml-3 px-3 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
      
      {/* Secondary Navigation - Breadcrumbs */}
      {generateBreadcrumbs()}
    </div>
  );
};

export default QUNavbar;