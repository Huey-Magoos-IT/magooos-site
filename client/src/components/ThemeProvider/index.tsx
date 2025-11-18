"use client";

import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/app/redux";
import { setTheme } from "@/state";
import { applyTheme, getSavedTheme, defaultTheme } from "@/themes";

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
    // Guard against undefined theme (can happen during redux-persist rehydration)
    if (theme) {
      applyTheme(theme);
    } else {
      applyTheme(defaultTheme);
    }
  }, [theme]);

  return <>{children}</>;
};

export default ThemeProvider;
