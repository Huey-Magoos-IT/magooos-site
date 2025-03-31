"use client";

import React from "react";
import { HelpCircle, User } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { useGetAuthUserQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import Image from "next/image";

const QUNavbar = () => {
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const { data: currentUser } = useGetAuthUserQuery({});
  
  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (!currentUser) return null;
  const currentUserDetails = currentUser?.userDetails;

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
            <Link href="/reports" className="flex items-center px-4 h-full border-b-2 border-red-600 font-medium text-gray-800 dark:text-white">
              <span>Reports</span>
            </Link>
            <Link href="/configuration" className="flex items-center px-4 h-full hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-gray-600 dark:text-gray-300">
              <span>Configuration</span>
            </Link>
            <Link href="/operations" className="flex items-center px-4 h-full hover:bg-gray-100 dark:hover:bg-gray-800 font-medium text-gray-600 dark:text-gray-300">
              <span>Operations</span>
            </Link>
          </div>
        </div>
        
        {/* Right side - User and Help */}
        <div className="flex items-center mr-4">
          <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
            <HelpCircle className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="flex items-center ml-4">
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
          </div>
        </div>
      </div>
      
      {/* Secondary Navigation - Breadcrumbs */}
      <div className="flex items-center h-[40px] bg-gray-50 border-b border-gray-200 px-4 dark:bg-gray-800 dark:border-gray-700">
        <Link href="/reports" className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white">
          Reports
        </Link>
        <span className="mx-2 text-gray-400">&gt;</span>
        <Link href="/reports/overview" className="text-sm text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white">
          Overview
        </Link>
        <span className="mx-2 text-gray-400">&gt;</span>
        <span className="text-sm font-medium text-gray-800 dark:text-white">
          Real Time Summary
        </span>
      </div>
    </div>
  );
};

export default QUNavbar;