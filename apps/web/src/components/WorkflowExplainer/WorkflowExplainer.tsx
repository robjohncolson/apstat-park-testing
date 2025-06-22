import { FC } from "react";

const WorkflowExplainer: FC = () => {
  return (
    <div className="workflow-explainer" style={{ maxHeight: "70vh", overflowY: "auto" }}>
      <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>
        How to Use the AI Quiz Tutor
      </h2>

      {/* Embedded video */}
      <div
        style={{
          position: "relative",
          paddingBottom: "56.25%",
          height: 0,
          overflow: "hidden",
          borderRadius: "8px",
          marginBottom: "1.5rem",
        }}
      >
        <iframe
          src="https://www.youtube.com/embed/CnJyUYjnwJk"
          title="AI Quiz Tutor Workflow Walk-through"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            border: 0,
          }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>

      <ol style={{ lineHeight: 1.6 }}>
        <li>
          <strong>Step 1: Download Files</strong>
          <ul>
            <li>Save the Question PDF and Answer PDF for the quiz to your device.</li>
          </ul>
        </li>
        <li>
          <strong>Step 2: Copy Prompt</strong>
          <ul>
            <li>
              Click <em>Copy Grok Prompt</em> next to the quiz. This copies a ready-to-use AI
              prompt to your clipboard.
            </li>
          </ul>
        </li>
        <li>
          <strong>Step 3: Start a New Chat</strong>
          <ul>
            <li>Open Grok (or your preferred AI chat) in a new browser tab and start a fresh conversation.</li>
          </ul>
        </li>
        <li>
          <strong>Step 4: Paste &amp; Attach</strong>
          <ul>
            <li>Paste the copied prompt into the chat box, then attach the Question and Answer PDFs.  Press Submit when you are ready to start your session.</li>
          </ul>
        </li>
        <li>
          <strong>Step 5: Ask Away</strong>
          <ul>
            <li>Ask clarifying questions or request explanations for any problem you find tricky.</li>
          </ul>
        </li>
        <li>
          <strong>Step 6: Review &amp; Reflect</strong>
          <ul>
            <li>
              Read the AI's guidance, verify with the provided answers. *Between this quiz and the videos for each lesson, I recommend keeping pencil and paper nearby!
            </li>
          </ul>
        </li>
      </ol>
    </div>
  );
};

export default WorkflowExplainer; 