import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

describe("Grid style basic", () => {
  it("renders grid styled div", () => {
    render(
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        hello
      </div>,
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
  });
});
