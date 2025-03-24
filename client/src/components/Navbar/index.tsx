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
    <div className="flex items-center justify-between bg-white px-4 py-3 shadow-sm border-b border-gray-100 dark:bg-black dark:border-stroke-dark">
      {/* Search Bar */}
      <div className="flex items-center gap-8">
        {!isSidebarCollapsed ? null : (
          <button
            onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
            className="rounded p-2 hover:bg-blue-50 transition-colors dark:hover:bg-blue-900/10"
          >
            <Menu className="h-8 w-8 text-gray-800 dark:text-white" />
          </button>
        )}
        <div className="relative flex h-min w-[200px]">
          <Search className="absolute left-[4px] top-1/2 mr-2 h-5 w-5 -translate-y-1/2 transform cursor-pointer text-blue-500 dark:text-blue-400" />
          <input
            className="w-full rounded-md border border-gray-200 bg-gray-50 p-2 pl-8 placeholder-gray-500 focus:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-100 dark:bg-gray-700 dark:border-stroke-dark dark:text-white dark:placeholder-gray-300 dark:focus:border-blue-700 dark:focus:ring-blue-900/20"
            type="search"
            placeholder="Search..."
          />
        </div>
      </div>

      {/* Icons */}
      <div className="flex items-center">
        <button
          onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
          className={
            isDarkMode
              ? `rounded p-2 transition-colors dark:hover:bg-blue-900/10`
              : `rounded p-2 transition-colors hover:bg-blue-50`
          }
        >
          {isDarkMode ? (
            <Sun className="h-6 w-6 cursor-pointer text-blue-500 dark:text-blue-400" />
          ) : (
            <Moon className="h-6 w-6 cursor-pointer text-blue-500" />
          )}
        </button>
        <Link
          href="/settings"
          className={
            isDarkMode
              ? `h-min w-min rounded p-2 transition-colors dark:hover:bg-blue-900/10`
              : `h-min w-min rounded p-2 transition-colors hover:bg-blue-50`
          }
        >
          <Settings className="h-6 w-6 cursor-pointer text-blue-500 dark:text-blue-400" />
        </Link>
        <div className="ml-2 mr-5 hidden min-h-[2em] w-[0.1rem] bg-gray-200 dark:bg-gray-700 md:inline-block"></div>
        <div className="hidden items-center justify-between md:flex">
          <div className="align-center flex h-9 w-9 justify-center">
            {!!currentUserDetails?.profilePictureUrl ? (
              <Image
                src={`https://huey-site-images.s3.us-east-2.amazonaws.com/${currentUserDetails?.profilePictureUrl}`}
                alt={currentUserDetails?.username || "User Profile Picture"}
                width={100}
                height={50}
                className="h-full rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
              />
            ) : (
              <User className="h-6 w-6 cursor-pointer self-center rounded-full text-blue-500 dark:text-blue-400" />
            )}
          </div>
          <span className="mx-3 font-medium text-gray-800 dark:text-white">
            {currentUserDetails?.username}
          </span>
          <button
            className="hidden rounded-md bg-blue-500 px-4 py-2 text-xs font-bold text-white hover:bg-blue-600 transition-colors shadow-sm hover:shadow md:block"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
