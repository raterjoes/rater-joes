// analytics.js
import ReactGA from "react-ga4";

export const initAnalytics = () => {
    ReactGA.initialize("G-XGXNILBDRPY", { debug_mode: true });
};

export const logPageView = (path) => {
  ReactGA.send({ hitType: "pageview", page: path });
};