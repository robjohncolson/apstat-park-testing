// @ts-nocheck
import { StrictMode } from "react";
import Modal from "react-modal";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./index.css"; // legacy styles, will be phased out
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";

// Accessibility: tie react-modal to root element
Modal.setAppElement("#root");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);
