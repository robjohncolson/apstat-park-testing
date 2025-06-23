import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import WorkflowExplainer from "./WorkflowExplainer.tsx";

describe("WorkflowExplainer", () => {
  it("renders the core workflow steps", () => {
    render(<WorkflowExplainer />);
    expect(screen.getByText("Step 1: Download Files")).toBeInTheDocument();
    expect(screen.getByText(/Step 4: Paste & Attach/i)).toBeInTheDocument();
  });
}); 