import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Simple test component to verify our testing setup
function SimpleComponent({ text }: { text: string }) {
  return <div>Hello {text}</div>;
}

describe('Simple Component Test', () => {
  it('should render basic text', () => {
    render(<SimpleComponent text="World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });
}); 