import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles/index.css";
import "./styles/sections/chrome.css";
import "./styles/sections/hero.css";
import "./styles/sections/beats.css";
import "./styles/sections/rally.css";
import "./styles/sections/dive.css";
import "./styles/sections/toolkit.css";
import "./styles/sections/finale.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
