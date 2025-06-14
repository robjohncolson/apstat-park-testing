import React from "react";
import { screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import { LoginPage } from "./LoginPage";
import { renderWithProviders } from "../utils/test-utils";

// Helper to render LoginPage within MemoryRouter so we can inspect navigation
const renderLogin = (initialPath = "/") => {
  return renderWithProviders(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
      </Routes>
    </MemoryRouter>,
    {
      skipRouter: true, // prevent double router injection
    },
  );
};

// Reset mocks between each test
afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe("LoginPage", () => {
  it("renders initial suggested username and buttons", async () => {
    const _fetchMock = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "coolfox1" }),
      } as Response);
    void _fetchMock;

    renderLogin();

    // Wait for suggested username div to appear (exact match)
    await screen.findByText(/^coolfox1$/i);

    expect(
      screen.getByRole("button", { name: /continue as coolfox1/i })
    ).toBeInTheDocument();

    // Custom name button should start disabled
    const customBtn = screen.getByRole("button", {
      name: /continue with custom name/i,
    });
    expect(customBtn).toBeDisabled();

    // Only one fetch for initial generation
    expect(_fetchMock).toHaveBeenCalledTimes(1);
  });

  it("generates a new username when 'Generate New' is clicked", async () => {
    const _fetchMock = vi
      .spyOn(global, "fetch")
      // Initial username
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "happycat2" }),
      } as Response)
      // Generated username
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "swiftowl3" }),
      } as Response);
    void _fetchMock;

    renderLogin();

    // Wait for first username display
    await screen.findByText(/^happycat2$/i);

    // Click Generate New
    const genBtn = screen.getByRole("button", { name: /generate new/i });
    fireEvent.click(genBtn);

    // Wait for updated username
    await screen.findByText(/^swiftowl3$/i);

    expect(
      screen.getByRole("button", { name: /continue as swiftowl3/i })
    ).toBeInTheDocument();

    expect(_fetchMock).toHaveBeenCalledTimes(2);
  });

  it("logs in with suggested username and navigates to dashboard", async () => {
    const _fetchMock = vi
      .spyOn(global, "fetch")
      // initial generate-username
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "brightpanda5" }),
      } as Response)
      // create user API
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: 1, username: "brightpanda5" } }),
      } as Response);
    void _fetchMock;

    renderLogin();

    const continueBtn = await screen.findByRole("button", {
      name: /continue as brightpanda5/i,
    });

    fireEvent.click(continueBtn);

    // Wait for navigation
    await screen.findByTestId("dashboard");

    // Expect user stored in localStorage (AuthContext side effect)
    const stored = window.localStorage.getItem("apstat-user");
    expect(stored).not.toBeNull();
  });

  it("enables custom username button only when input is non-empty and logs in", async () => {
    // Initial username fetch not important here
    vi.spyOn(global, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ username: "calmwolf7" }),
      } as Response)
      // create user API for custom user
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ user: { id: 2, username: "mycustom" } }),
      } as Response);

    renderLogin();

    // Custom continue button should be disabled initially
    const customBtn = screen.getByRole("button", {
      name: /continue with custom name/i,
    });
    expect(customBtn).toBeDisabled();

    const input = screen.getByPlaceholderText(/enter your preferred username/i);
    fireEvent.change(input, { target: { value: "mycustom" } });

    expect(customBtn).toBeEnabled();

    fireEvent.click(customBtn);

    await screen.findByTestId("dashboard");
  });
}); 