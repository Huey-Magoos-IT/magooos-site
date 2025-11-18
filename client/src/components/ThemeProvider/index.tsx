"use client";

import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/redux";
import { setTheme } from "@/state";
import { applyTheme, getSavedTheme } from "@/themes";

const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.global.theme);

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = getSavedTheme();
    dispatch(setTheme(savedTheme));
  }, [dispatch]);

  // Apply theme whenever it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;
