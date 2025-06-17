import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  componentName?: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`Error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          padding: '1rem',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          backgroundColor: '#fef3c7',
          color: '#92400e',
          textAlign: 'center'
        }}>
          <p>⚠️ {this.props.componentName || 'Component'} temporarily unavailable</p>
          <details style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
            <summary>Error details</summary>
            <pre style={{ textAlign: 'left', marginTop: '0.5rem', fontSize: '0.75rem' }}>
              {this.state.error?.message}
            </pre>
          </details>
        </div>
      );
    }

    return this.props.children;
  }
} 