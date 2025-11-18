import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ThemeId } from "@/themes/types";

export interface initialStateTypes {
  isSidebarCollapsed: boolean;
  isDarkMode: boolean; // Kept for backward compatibility
  theme: ThemeId;
}

const initialState: initialStateTypes = {
  isSidebarCollapsed: false,
  isDarkMode: false,
  theme: 'huey-orange-light',
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
      // Also update theme based on dark mode toggle (for backward compatibility)
      if (action.payload) {
        // If current theme is light, switch to its dark variant
        const currentTheme = state.theme;
        if (currentTheme.endsWith('-light')) {
          state.theme = currentTheme.replace('-light', '-dark') as ThemeId;
        }
      } else {
        // If current theme is dark, switch to its light variant
        const currentTheme = state.theme;
        if (currentTheme.endsWith('-dark')) {
          state.theme = currentTheme.replace('-dark', '-light') as ThemeId;
        }
      }
    },
    setTheme: (state, action: PayloadAction<ThemeId>) => {
      state.theme = action.payload;
      // Keep isDarkMode in sync for backward compatibility
      state.isDarkMode = action.payload.endsWith('-dark');
    },
  },
});

export const { setIsSidebarCollapsed, setIsDarkMode, setTheme } = globalSlice.actions;
export default globalSlice.reducer;
