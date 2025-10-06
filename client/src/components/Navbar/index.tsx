import React from "react";
import { Menu, Moon, Settings, Sun, User } from "lucide-react";
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
    <div className="fixed top-0 left-0 right-0 z-50 px-4 pt-4 animate-slide-down">
      <div className="max-w-[95%] mx-auto glass rounded-2xl shadow-lift
                    border border-orange-200/30 dark:border-orange-500/20">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Section - Menu Button (only when sidebar collapsed) */}
          <div className="flex items-center gap-6">
            {!isSidebarCollapsed ? null : (
              <>
                <button
                  onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
                  className="rounded-xl p-2.5
                           bg-orange-50 dark:bg-orange-900/20
                           hover:bg-orange-100 dark:hover:bg-orange-900/30
                           transition-all duration-300 group
                           border border-orange-200/50 dark:border-orange-500/20"
                >
                  <Menu className="h-6 w-6 text-orange-600 dark:text-orange-400
                                group-hover:scale-110 transition-transform duration-300" />
                </button>
                
                <Link href="/home" className="flex items-center gap-3 group">
                  <div className="relative">
                    <Image
                      src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_black-01.png"
                      alt="Logo"
                      width={36}
                      height={36}
                      className="block dark:hidden transition-transform duration-300 group-hover:scale-110"
                    />
                    <Image
                      src="https://huey-site-images.s3.us-east-2.amazonaws.com/g_with_tm_white-01.png"
                      alt="Logo"
                      width={36}
                      height={36}
                      className="hidden dark:block transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                  <span className="text-xl font-bold gradient-text-orange hidden md:block">
                    Huey Magoo&apos;s
                  </span>
                </Link>
              </>
            )}
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center gap-3">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => dispatch(setIsDarkMode(!isDarkMode))}
              className="relative rounded-xl p-2.5
                       bg-orange-50 dark:bg-orange-900/20
                       hover:bg-orange-100 dark:hover:bg-orange-900/30
                       transition-all duration-300 group
                       border border-orange-200/50 dark:border-orange-500/20"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5 text-gold-500 dark:text-gold-400 
                            group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <Moon className="h-5 w-5 text-orange-600 
                             group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </button>

            {/* Settings Link */}
            <Link
              href="/settings"
              className="relative rounded-xl p-2.5
                       bg-orange-50 dark:bg-orange-900/20
                       hover:bg-orange-100 dark:hover:bg-orange-900/30
                       transition-all duration-300 group
                       border border-orange-200/50 dark:border-orange-500/20"
            >
              <Settings className="h-5 w-5 text-orange-600 dark:text-orange-400
                                group-hover:rotate-90 transition-all duration-300" />
            </Link>

            {/* Divider */}
            <div className="hidden h-10 w-[1px] 
                          bg-gradient-to-b from-transparent via-orange-300 to-transparent
                          dark:via-orange-600 md:inline-block mx-2" />

            {/* User Section */}
            <div className="hidden items-center gap-3 md:flex">
              {/* Profile Picture */}
              <div className="relative group/avatar cursor-pointer">
                <div className="h-10 w-10 rounded-full overflow-hidden
                              border-2 border-orange-400 dark:border-orange-500
                              shadow-md group-hover/avatar:shadow-glow-orange
                              transition-all duration-300
                              group-hover/avatar:scale-110">
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
                                  bg-gradient-to-br from-orange-400 to-red-500">
                      <User className="h-5 w-5 text-white" />
                    </div>
                  )}
                </div>
                {/* Online Status Indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 
                              h-3 w-3 rounded-full 
                              bg-green-500 dark:bg-green-400
                              border-2 border-cream-100 dark:border-dark-bg
                              shadow-sm
                              animate-pulse-subtle" />
              </div>

              {/* Username */}
              <span className="font-semibold text-charcoal-900 dark:text-cream-100
                             max-w-[150px] truncate">
                {currentUserDetails?.username}
              </span>

              {/* Sign Out Button */}
              <button
                className="relative rounded-xl px-5 py-2.5
                         bg-gradient-to-r from-orange-500 to-red-500
                         hover:from-orange-600 hover:to-red-600
                         text-white text-sm font-bold
                         shadow-md hover:shadow-glow-orange
                         transition-all duration-300
                         transform hover:scale-105 active:scale-95
                         overflow-hidden group btn-shimmer"
                onClick={handleSignOut}
              >
                <span className="relative z-10">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
