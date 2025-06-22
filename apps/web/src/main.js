import { jsx as _jsx } from "react/jsx-runtime";
// @ts-nocheck
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./index.css"; // legacy styles, will be phased out
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";
import { BlockchainProvider } from "./context/BlockchainProvider";
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsx(AuthProvider, { children: _jsx(BlockchainProvider, { children: _jsx(App, {}) }) }) }));
