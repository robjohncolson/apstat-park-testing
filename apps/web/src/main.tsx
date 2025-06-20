// @ts-nocheck
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./index.css"; // legacy styles, will be phased out
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext";
import { BlockchainService } from "./services/BlockchainService";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
);

// Initialize blockchain service (smoke test)
BlockchainService.getInstance().start().catch(console.error);
