import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Component } from 'react';
export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error(`Error in ${this.props.componentName || 'Component'}:`, error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (_jsxs("div", { style: {
                    padding: '1rem',
                    border: '1px solid #fbbf24',
                    borderRadius: '8px',
                    backgroundColor: '#fef3c7',
                    color: '#92400e',
                    textAlign: 'center'
                }, children: [_jsxs("p", { children: ["\u26A0\uFE0F ", this.props.componentName || 'Component', " temporarily unavailable"] }), _jsxs("details", { style: { marginTop: '0.5rem', fontSize: '0.875rem' }, children: [_jsx("summary", { children: "Error details" }), _jsx("pre", { style: { textAlign: 'left', marginTop: '0.5rem', fontSize: '0.75rem' }, children: this.state.error?.message })] })] }));
        }
        return this.props.children;
    }
}
