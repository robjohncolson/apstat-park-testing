import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// @ts-nocheck
import { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { DEFAULT_GROK_PROMPT } from '../../constants/grokPrompt';
const MARKDOWN_URL = '/docs/using-pdfs-with-grok.md';
const GrokHelper = () => {
    const [markdown, setMarkdown] = useState('');
    const [copied, setCopied] = useState(false);
    // Fetch markdown guide on mount
    useEffect(() => {
        let isMounted = true;
        fetch(MARKDOWN_URL)
            .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
            .then((text) => {
            if (isMounted)
                setMarkdown(text);
        })
            .catch(() => {
            if (isMounted)
                setMarkdown('# Guide not found');
        });
        return () => {
            isMounted = false;
        };
    }, []);
    const handleCopy = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(DEFAULT_GROK_PROMPT);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
        catch {
            // ignore
        }
    }, []);
    return (_jsxs("div", { className: "grok-helper", style: { maxHeight: '70vh', overflowY: 'auto' }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }, children: _jsx("button", { onClick: handleCopy, "aria-label": "Copy starter prompt", children: copied ? 'Copied!' : 'Copy Starter Prompt' }) }), _jsx(ReactMarkdown, { children: markdown })] }));
};
export default GrokHelper;
