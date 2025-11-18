import React from "react";
import { Menu, Settings, User } from "lucide-react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsSidebarCollapsed } from "@/state";
import { useGetAuthUserQuery } from "@/state/api";
import { signOut } from "aws-amplify/auth";
import Image from "next/image";
import ThemeSelector from "@/components/ThemeSelector";
import { S3_IMAGE_BUCKET_URL } from "@/lib/constants";

const Navbar = () => {
  const dispatch = useAppDispatch();
  const isSidebarCollapsed = useAppSelector(
    (state) => state.global.isSidebarCollapsed,
  );

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
    <div className={`fixed top-0 right-0 z-50 px-4 pt-4 animate-slide-down transition-all duration-300 ${
      isSidebarCollapsed ? 'left-0' : 'left-64'
    }`}>
      <div className="glass rounded-2xl shadow-lift
                    border border-[var(--theme-border)]">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left Section - Logo & Menu */}
          <div className="flex items-center gap-6">
            {isSidebarCollapsed && (
              <button
                onClick={() => dispatch(setIsSidebarCollapsed(!isSidebarCollapsed))}
                className="rounded-xl p-2.5
                         bg-[var(--theme-surface-hover)]
                         hover:bg-[var(--theme-surface-active)]
                         transition-all duration-300 group
                         border border-[var(--theme-border)]"
              >
                <Menu className="h-6 w-6 text-[var(--theme-primary)]
                              group-hover:scale-110 transition-transform duration-300" />
              </button>
            )}

            <Link href="/home" className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src={`${S3_IMAGE_BUCKET_URL}/g_with_tm_black-01.png`}
                  alt="Logo"
                  width={36}
                  height={36}
                  className="block dark:hidden transition-transform duration-300 group-hover:scale-110"
                />
                <Image
                  src={`${S3_IMAGE_BUCKET_URL}/g_with_tm_white-01.png`}
                  alt="Logo"
                  width={36}
                  height={36}
                  className="hidden dark:block transition-transform duration-300 group-hover:scale-110"
                />
              </div>
              <span className="text-xl font-bold text-[var(--theme-primary)] hidden md:block">
                Huey Magoo&apos;s
              </span>
            </Link>
          </div>

          {/* Right Section - Actions & User */}
          <div className="flex items-center gap-3">
            {/* Theme Selector */}
            <ThemeSelector />

            {/* Settings Link */}
            <Link
              href="/settings"
              className="relative rounded-xl p-2.5
                       bg-[var(--theme-surface-hover)]
                       hover:bg-[var(--theme-surface-active)]
                       transition-all duration-300 group
                       border border-[var(--theme-border)]"
            >
              <Settings className="h-5 w-5 text-[var(--theme-primary)]
                                group-hover:rotate-90 transition-all duration-300" />
            </Link>

            {/* Divider */}
            <div className="hidden h-10 w-[1px]
                          bg-gradient-to-b from-transparent via-[var(--theme-border-dark)] to-transparent
                          md:inline-block mx-2" />

            {/* User Section */}
            <div className="hidden items-center gap-3 md:flex">
              {/* Profile Picture */}
              <div className="relative group/avatar cursor-pointer">
                <div className="h-10 w-10 rounded-full overflow-hidden
                              border-2 border-[var(--theme-primary)]
                              shadow-md
                              transition-all duration-300
                              group-hover/avatar:scale-110"
                     style={{ boxShadow: 'var(--theme-glow-color)' }}>
                  {!!currentUserDetails?.profilePictureUrl ? (
                    <Image
                      src={`${S3_IMAGE_BUCKET_URL}/${currentUserDetails?.profilePictureUrl}`}
                      alt={currentUserDetails?.username || "User Profile Picture"}
                      width={100}
                      height={50}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center"
                         style={{ background: `linear-gradient(to bottom right, var(--theme-primary), var(--theme-secondary))` }}>
                      <User className="h-5 w-5 text-[var(--theme-text-on-primary)]" />
                    </div>
                  )}
                </div>
                {/* Online Status Indicator */}
                <div className="absolute -bottom-0.5 -right-0.5
                              h-3 w-3 rounded-full
                              bg-[var(--theme-success)]
                              border-2 border-[var(--theme-background)]
                              shadow-sm
                              animate-pulse-subtle" />
              </div>

              {/* Username */}
              <span className="font-semibold text-[var(--theme-text)]
                             max-w-[150px] truncate">
                {currentUserDetails?.username}
              </span>

              {/* Sign Out Button */}
              <button
                className="relative rounded-xl px-5 py-2.5
                         text-[var(--theme-text-on-primary)] text-sm font-bold
                         shadow-md
                         transition-all duration-300
                         transform hover:scale-105 active:scale-95
                         overflow-hidden group btn-shimmer"
                style={{ background: `linear-gradient(to right, var(--theme-primary), var(--theme-secondary))` }}
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
