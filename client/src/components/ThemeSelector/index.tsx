"use client";

import React, { useState } from "react";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setTheme } from "@/state";
import { themes, themeCategories, ThemeId } from "@/themes";
import { Palette, Sun, Moon, Check, X } from "lucide-react";

interface ThemeSelectorProps {
  variant?: "button" | "inline";
}

const ThemeSelector = ({ variant = "button" }: ThemeSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const currentTheme = useAppSelector((state) => state.global.theme);

  const handleThemeSelect = (themeId: ThemeId) => {
    dispatch(setTheme(themeId));
    setIsOpen(false);
  };

  if (variant === "inline") {
    return (
      <div className="w-full">
        <h3 className="text-sm font-semibold mb-3 text-[var(--theme-text)]">
          Choose Theme
        </h3>
        <div className="space-y-4">
          {themeCategories.map((category) => (
            <div key={category.name}>
              <p className="text-xs font-medium text-[var(--theme-text-muted)] mb-2 uppercase tracking-wider">
                {category.name}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {category.themes.map((themeId) => {
                  const theme = themes[themeId];
                  const isSelected = currentTheme === themeId;

                  return (
                    <button
                      key={themeId}
                      onClick={() => handleThemeSelect(themeId)}
                      className={`
                        relative p-3 rounded-xl border-2 transition-all duration-200
                        flex items-center gap-2
                        ${isSelected
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-surface-active)]'
                          : 'border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-surface-hover)]'
                        }
                      `}
                    >
                      {/* Color preview */}
                      <div
                        className="w-6 h-6 rounded-lg flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: theme.colors.primary }}
                      />

                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-1">
                          {theme.isDark ? (
                            <Moon className="w-3 h-3 text-[var(--theme-text-muted)]" />
                          ) : (
                            <Sun className="w-3 h-3 text-[var(--theme-text-muted)]" />
                          )}
                          <span className="text-xs font-medium text-[var(--theme-text)]">
                            {theme.isDark ? 'Dark' : 'Light'}
                          </span>
                        </div>
                      </div>

                      {isSelected && (
                        <Check className="w-4 h-4 text-[var(--theme-primary)]" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Button variant with popup
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-xl p-2.5
                 bg-[var(--theme-surface-hover)]
                 hover:bg-[var(--theme-surface-active)]
                 transition-all duration-300 group
                 border border-[var(--theme-border)]"
        title="Choose theme"
      >
        <Palette className="h-5 w-5 text-[var(--theme-primary)]
                          group-hover:scale-110 transition-transform duration-300" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Popup */}
          <div className="absolute right-0 top-full mt-2 z-50
                        w-80 p-4 rounded-2xl shadow-xl
                        bg-[var(--theme-surface)]
                        border border-[var(--theme-border)]
                        animate-fade-in-down">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[var(--theme-text)]">
                Choose Theme
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-[var(--theme-surface-hover)] transition-colors"
              >
                <X className="w-4 h-4 text-[var(--theme-text-muted)]" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {themeCategories.map((category) => (
                <div key={category.name}>
                  <p className="text-xs font-medium text-[var(--theme-text-muted)] mb-2 uppercase tracking-wider">
                    {category.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {category.themes.map((themeId) => {
                      const theme = themes[themeId];
                      const isSelected = currentTheme === themeId;

                      return (
                        <button
                          key={themeId}
                          onClick={() => handleThemeSelect(themeId)}
                          className={`
                            relative p-3 rounded-xl border-2 transition-all duration-200
                            flex items-center gap-2
                            ${isSelected
                              ? 'border-[var(--theme-primary)] bg-[var(--theme-surface-active)]'
                              : 'border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-surface-hover)]'
                            }
                          `}
                        >
                          {/* Color preview */}
                          <div
                            className="w-6 h-6 rounded-lg flex-shrink-0 shadow-sm"
                            style={{ backgroundColor: theme.colors.primary }}
                          />

                          <div className="flex-1 text-left">
                            <div className="flex items-center gap-1">
                              {theme.isDark ? (
                                <Moon className="w-3 h-3 text-[var(--theme-text-muted)]" />
                              ) : (
                                <Sun className="w-3 h-3 text-[var(--theme-text-muted)]" />
                              )}
                              <span className="text-xs font-medium text-[var(--theme-text)]">
                                {theme.isDark ? 'Dark' : 'Light'}
                              </span>
                            </div>
                          </div>

                          {isSelected && (
                            <Check className="w-4 h-4 text-[var(--theme-primary)]" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;
