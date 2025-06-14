import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GrokHelper from './GrokHelper';

// Mock fetch and clipboard before each test
beforeEach(() => {
  vi.restoreAllMocks();

  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve('# Test Guide\n\nContent'),
    } as Response),
  ) as unknown as typeof fetch;

  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  });
});

describe('GrokHelper', () => {
  it('renders markdown content', async () => {
    render(<GrokHelper />);

    expect(await screen.findByText('Test Guide')).toBeInTheDocument();
  });

  it('copies starter prompt to clipboard when button clicked', async () => {
    render(<GrokHelper />);

    const button = await screen.findByRole('button', {
      name: /copy starter prompt/i,
    });

    fireEvent.click(button);

    expect(navigator.clipboard.writeText).toHaveBeenCalled();
  });
}); 