import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import styles from "./LoginPage.module.css";
import { Button } from "../components/ui/Button";
export function LoginPage() {
    const { login, generateUsername, isLoading } = useAuth();
    const navigate = useNavigate();
    const [suggestedUsername, setSuggestedUsername] = useState("");
    const [customUsername, setCustomUsername] = useState("");
    const [error, setError] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const handleGenerateUsername = async () => {
        setIsGenerating(true);
        setError("");
        try {
            const username = await generateUsername();
            setSuggestedUsername(username);
        }
        catch {
            setError("Failed to generate username. Please try again.");
        }
        finally {
            setIsGenerating(false);
        }
    };
    const handleLogin = async (username) => {
        if (!username.trim()) {
            setError("Please enter a username or generate one.");
            return;
        }
        setError("");
        try {
            console.log("About to call login...");
            await login(username.trim());
            console.log("Login successful, about to navigate...");
            // Now navigate using React Router since AuthContext will update the App component
            navigate("/dashboard", { replace: true });
            console.log("Navigate called");
        }
        catch (error) {
            console.error("Login error:", error);
            setError("Failed to log in. Please try again.");
        }
    };
    // Generate a username on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        handleGenerateUsername();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return (_jsx("div", { className: styles.loginPage, children: _jsxs("div", { className: styles.loginContainer, children: [_jsxs("header", { className: styles.loginHeader, children: [_jsx("h1", { children: "\uD83C\uDFDE\uFE0F Welcome to APStat Park" }), _jsx("p", { children: "Your journey through AP Statistics starts here!" })] }), _jsxs("div", { className: styles.loginForm, children: [_jsx("h2", { children: "Choose Your Adventure Name" }), error && _jsx("div", { className: styles.errorMessage, children: error }), _jsxs("div", { className: styles.usernameSection, children: [_jsx("h3", { children: "Suggested Username" }), _jsxs("div", { className: styles.suggestedUsername, children: [_jsx("div", { className: styles.usernameDisplay, children: isGenerating
                                                ? "Generating..."
                                                : suggestedUsername || "No username generated" }), _jsx(Button, { onClick: handleGenerateUsername, disabled: isGenerating, variant: "secondary", children: isGenerating ? "Generating..." : "Generate New" })] }), suggestedUsername && (_jsx(Button, { onClick: () => handleLogin(suggestedUsername), disabled: isLoading, variant: "primary", children: isLoading
                                        ? "Logging in..."
                                        : `Continue as ${suggestedUsername}` }))] }), _jsx("div", { className: styles.divider, children: _jsx("span", { children: "or" }) }), _jsxs("div", { className: styles.customUsernameSection, children: [_jsx("h3", { children: "Create Your Own Username" }), _jsx("input", { type: "text", value: customUsername, onChange: (e) => setCustomUsername(e.target.value), placeholder: "Enter your preferred username", className: styles.usernameInput, maxLength: 30 }), _jsx(Button, { onClick: () => handleLogin(customUsername), disabled: isLoading || !customUsername.trim(), variant: "secondary", children: isLoading ? "Logging in..." : "Continue with Custom Name" })] }), _jsx("div", { className: styles.loginInfo, children: _jsxs("p", { children: [_jsx("strong", { children: "Note:" }), " Your username will be saved locally in your browser. You can use the same name across different devices to sync your progress!"] }) })] })] }) }));
}
