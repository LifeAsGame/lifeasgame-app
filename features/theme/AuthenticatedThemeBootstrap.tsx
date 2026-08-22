"use client";

import { useEffect, useRef } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { getSettingsApi } from "@/lib/api/endpoints/settings.api";
import { useTheme } from "./ThemeProvider";
import { parseServerThemePreference } from "./theme";

export function AuthenticatedThemeBootstrap() {
  const { currentUser, session, isAuthenticated, isLoading } = useAuth();
  const { setPreference } = useTheme();
  const requestVersion = useRef(0);
  const userId = currentUser?.id;
  const sessionKey = session?.accessToken;

  useEffect(() => {
    const version = ++requestVersion.current;
    if (isLoading || !isAuthenticated || !userId || !sessionKey) return;
    let active = true;

    void getSettingsApi()
      .then((response) => {
        if (!active || version !== requestVersion.current || response.userId !== userId) return;
        const preference = parseServerThemePreference(response.flagsJson);
        if (preference) setPreference(preference);
      })
      .catch(() => {
        // The local/pre-paint cache remains authoritative until this session can hydrate.
      });

    return () => { active = false; };
  }, [isAuthenticated, isLoading, sessionKey, setPreference, userId]);

  return null;
}
