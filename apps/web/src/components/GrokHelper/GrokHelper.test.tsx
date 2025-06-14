import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import GrokHelper from './GrokHelper';

describe('GrokHelper', () => {
  it('renders the component with placeholder text', () => {
    render(<GrokHelper />);
    expect(screen.getByText('Grok Helper')).toBeInTheDocument();
  });
}); 