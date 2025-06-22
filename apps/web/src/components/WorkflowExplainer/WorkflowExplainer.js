import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const WorkflowExplainer = () => {
    return (_jsxs("div", { className: "workflow-explainer", style: { maxHeight: "70vh", overflowY: "auto" }, children: [_jsx("h2", { style: { textAlign: "center", marginBottom: "1rem" }, children: "How to Use the AI Quiz Tutor" }), _jsx("div", { style: {
                    position: "relative",
                    paddingBottom: "56.25%",
                    height: 0,
                    overflow: "hidden",
                    borderRadius: "8px",
                    marginBottom: "1.5rem",
                }, children: _jsx("iframe", { src: "https://www.youtube.com/embed/CnJyUYjnwJk", title: "AI Quiz Tutor Workflow Walk-through", style: {
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        border: 0,
                    }, allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share", allowFullScreen: true }) }), _jsxs("ol", { style: { lineHeight: 1.6 }, children: [_jsxs("li", { children: [_jsx("strong", { children: "Step 1: Download Files" }), _jsx("ul", { children: _jsx("li", { children: "Save the Question PDF and Answer PDF for the quiz to your device." }) })] }), _jsxs("li", { children: [_jsx("strong", { children: "Step 2: Copy Prompt" }), _jsx("ul", { children: _jsxs("li", { children: ["Click ", _jsx("em", { children: "Copy Grok Prompt" }), " next to the quiz. This copies a ready-to-use AI prompt to your clipboard."] }) })] }), _jsxs("li", { children: [_jsx("strong", { children: "Step 3: Start a New Chat" }), _jsx("ul", { children: _jsx("li", { children: "Open Grok (or your preferred AI chat) in a new browser tab and start a fresh conversation." }) })] }), _jsxs("li", { children: [_jsx("strong", { children: "Step 4: Paste & Attach" }), _jsx("ul", { children: _jsx("li", { children: "Paste the copied prompt into the chat box, then attach the Question and Answer PDFs.  Press Submit when you are ready to start your session." }) })] }), _jsxs("li", { children: [_jsx("strong", { children: "Step 5: Ask Away" }), _jsx("ul", { children: _jsx("li", { children: "Ask clarifying questions or request explanations for any problem you find tricky." }) })] }), _jsxs("li", { children: [_jsx("strong", { children: "Step 6: Review & Reflect" }), _jsx("ul", { children: _jsx("li", { children: "Read the AI's guidance, verify with the provided answers. *Between this quiz and the videos for each lesson, I recommend keeping pencil and paper nearby!" }) })] })] })] }));
};
export default WorkflowExplainer;
