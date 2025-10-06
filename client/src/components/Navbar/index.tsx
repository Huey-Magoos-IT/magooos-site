import React from "react";
import { Menu, Moon, Search, Settings, Sun, User } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import Image from "next/image";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );
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
    <div className="flex items-center justify-between 
                  bg-white/80 dark:bg-dark-bg/80 
                  backdrop-blur-xl backdrop-saturate-150
                  px-4 py-3 
                  border-b border-gray-200/50 dark:border-stroke-dark/50
                  shadow-sm hover:shadow-md transition-shadow duration-300
                  sticky top-0 z-30">
      {/* Left Section - Menu Button */}
      <div className="flex items-center gap-4">
        {!isSidebarCollapsed ? null : (
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
            className="rounded-lg p-2
                     hover:bg-blue-50 dark:hover:bg-blue-900/10
                     transition-colors duration-200"
          >
            <Menu className="h-8 w-8 text-gray-800 dark:text-white" />
          </button>
        )}
      </div>

      {/* Right Section - Icons & User */}
      <div className="flex items-center gap-2">
        {/* Dark Mode Toggle */}
        <button
          onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
          className="relative rounded-xl p-2.5
                   bg-gray-100 dark:bg-gray-800
                   hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100
                   dark:hover:from-blue-900/30 dark:hover:to-indigo-900/20
                   transition-all duration-300 group
                   shadow-sm hover:shadow-md overflow-hidden"
        >
          <div className="relative z-10">
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-amber-500 dark:text-amber-400 
                          group-hover:rotate-180 transition-transform duration-500" />
            ) : (
              <Moon className="h-5 w-5 text-indigo-600 
                           group-hover:-rotate-12 transition-transform duration-300" />
            )}
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 to-indigo-500/0 
                        group-hover:from-blue-500/10 group-hover:to-indigo-500/10
                        transition-all duration-300" />
        </button>

        {/* Settings Link */}
        <Link
          href="/settings"
          className="relative rounded-xl p-2.5
                   bg-gray-100 dark:bg-gray-800
                   hover:bg-gradient-to-r hover:from-blue-100 hover:to-indigo-100
                   dark:hover:from-blue-900/30 dark:hover:to-indigo-900/20
                   transition-all duration-300 group
                   shadow-sm hover:shadow-md"
        >
          <Settings className="h-5 w-5 text-gray-600 dark:text-gray-400
                            group-hover:text-blue-600 dark:group-hover:text-blue-400
                            group-hover:rotate-90 transition-all duration-300" />
        </Link>

        {/* Divider */}
        <div className="ml-2 mr-3 hidden h-8 w-[1px] 
                      bg-gradient-to-b from-transparent via-gray-300 to-transparent
                      dark:via-gray-600 md:inline-block" />

        {/* User Section */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Profile Picture */}
          <div className="relative group/avatar">
            <div className="h-10 w-10 rounded-full overflow-hidden
                          border-2 border-gray-200 dark:border-gray-700
                          shadow-md group-hover/avatar:shadow-lg
                          transition-all duration-300
                          group-hover/avatar:scale-110
                          group-hover/avatar:border-blue-400 dark:group-hover/avatar:border-blue-500">
              {!!currentUserDetails?.profilePictureUrl ? (
                <Image
                  src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${currentUserDetails?.profilePictureUrl}`}
                  alt={currentUserDetails?.username || "User Profile Picture"}
                  width={100}
                  height={50}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center
                              bg-gradient-to-br from-blue-500 to-indigo-600
                              dark:from-blue-600 dark:to-indigo-700">
                  <User className="h-5 w-5 text-white" />
                </div>
              )}
            </div>
            {/* Online Status Indicator */}
            <div className="absolute -bottom-0.5 -right-0.5 
                          h-3 w-3 rounded-full 
                          bg-emerald-500 dark:bg-emerald-400
                          border-2 border-white dark:border-dark-bg
                          shadow-sm
                          animate-pulse-subtle" />
          </div>

          {/* Username */}
          <span className="font-medium text-gray-800 dark:text-white
                         max-w-[150px] truncate">
            {currentUserDetails?.username}
          </span>

          {/* Sign Out Button */}
          <button
            className="relative rounded-xl px-4 py-2
                     bg-gradient-to-r from-blue-500 to-indigo-600
                     hover:from-blue-600 hover:to-indigo-700
                     text-white text-sm font-semibold
                     shadow-md hover:shadow-xl
                     transition-all duration-300
                     transform hover:scale-105 active:scale-95
                     overflow-hidden group"
            onClick={handleSignOut}
          >
            <span className="relative z-10">Sign out</span>
            <div className="absolute inset-0 
                          bg-gradient-to-r from-white/0 to-white/20
                          opacity-0 group-hover:opacity-100
                          transition-opacity duration-300" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
