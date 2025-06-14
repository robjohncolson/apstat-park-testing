// @ts-nocheck
import React, { useEffect, useState, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';

import { DEFAULT_GROK_PROMPT } from '../../constants/grokPrompt';

const MARKDOWN_URL = '/docs/using-pdfs-with-grok.md';

const GrokHelper: React.FC = () => {
  const [markdown, setMarkdown] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch markdown guide on mount
  useEffect(() => {
    let isMounted = true;
    fetch(MARKDOWN_URL)
      .then((res) => (res.ok ? res.text() : Promise.reject(res.status)))
      .then((text) => {
        if (isMounted) setMarkdown(text);
      })
      .catch(() => {
        if (isMounted) setMarkdown('# Guide not found');
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
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="grok-helper" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={handleCopy} aria-label="Copy starter prompt">
          {copied ? 'Copied!' : 'Copy Starter Prompt'}
        </button>
      </div>
      <ReactMarkdown>{markdown}</ReactMarkdown>
    </div>
  );
};

export default GrokHelper; 