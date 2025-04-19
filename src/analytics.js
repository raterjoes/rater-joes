import ReactGA from "react-ga4";

export const initAnalytics = () => {
  ReactGA.initialize([
    {
      trackingId: "G-XGXNILBDRPY",
      gtagOptions: { debug_mode: true }
    }
  ]);

  // Force it globally
  ReactGA.set({ debug_mode: true });
};

export const logPageView = (path) => {
  ReactGA.send({ hitType: "pageview", page: path });
};