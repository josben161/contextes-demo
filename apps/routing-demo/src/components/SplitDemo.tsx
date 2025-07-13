'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function SplitDemo() {
  const [query, setQuery] = useState('');
  const [baselineAnswer, setBaselineAnswer] = useState('');
  const [ctxAnswer, setCtxAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      // Call baseline API
      const baselineRes = await fetch('/api/baseline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      const baselineData = await baselineRes.json();
      setBaselineAnswer(baselineData.answer || '');

      // Call contextes API
      const ctxRes = await fetch('/api/contextes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      
      if (ctxRes.status === 403) {
        toast.error('Licence required');
        setCtxAnswer('');
      } else {
        const ctxData = await ctxRes.json();
        setCtxAnswer(ctxData.answer || '');
      }
    } catch (error) {
        console.error('Error processing query:', error);
        toast.error('Error processing query');
      } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your query..."
            className="border p-2 w-full"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Submit'}
          </button>
        </div>
      </form>

      <div className="flex gap-4">
        <pre className="border w-1/2 p-4 bg-gray-50 rounded">
          <strong>Baseline</strong>
          {loading ? '\nLoading...' : baselineAnswer || '\nNo answer yet'}
        </pre>
        <pre className="border w-1/2 p-4 bg-gray-50 rounded">
          <strong>Context ES</strong>
          {loading ? '\nLoading...' : ctxAnswer || '\nNo answer yet'}
        </pre>
      </div>
    </div>
  );
}
