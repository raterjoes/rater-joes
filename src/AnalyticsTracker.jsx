// src/AnalyticsTracker.jsx
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initAnalytics, logPageView } from "./analytics";

export default function AnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    console.log("📊 Google Analytics initialized");
    initAnalytics();
  }, []);

  useEffect(() => {
    console.log("📄 Logging pageview:", location.pathname + location.search);
    logPageView(location.pathname + location.search);
  }, [location]);

  return null;
}