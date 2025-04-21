"use client";
import React, { useState } from 'react';

export default function HomePage() {
  const [term, setTerm] = useState('');
  const [crnsInput, setCrnsInput] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const handleRegisterAll = async () => {
    try {
      setMessage('Processing registration with plan...');
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term }),
      });
      if (!res.ok) throw new Error('Failed to register with plan');
      const json = await res.json();
      setMessage(json.message);
    } catch (err) {
      console.error(err);
      setMessage('Registration failed');
    }
  };

  const handleRegisterCRNs = async () => {
    try {
      setMessage('Processing CRN registration...');
      const crns = crnsInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, crns }),
      });
      if (!res.ok) throw new Error('Failed to register CRNs');
      const json = await res.json();
      setMessage(json.message);
    } catch (err) {
      console.error(err);
      setMessage('Registration failed');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="text-2xl font-semibold text-foreground">Course Registrator</h1>
      <div className="bg-foreground p-8 rounded-xl shadow-md w-full max-w-md space-y-6">
        <div>
          <label>
            Term:
            <select value={term} onChange={e => setTerm(e.target.value)} className="mt-1 block w-full border-foreground/50 rounded-md shadow-sm focus:ring-accent focus:border-accent">
              <option value="">Select term</option>
              <option value="Fall Semester 2025">Fall Semester 2025</option>
              <option value="Summer Session 2025">Summer Session 2025</option>
            </select>
          </label>
        </div>
        <div>
          <button onClick={handleRegisterAll} disabled={!term} className="py-2 px-4 bg-accent text-foreground rounded-md shadow hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed">
            Register All
          </button>
        </div>
        <hr className="border-foreground/20 my-4" />
        <div>
          <label>
            CRNs (comma-separated):
            <input
              type="text"
              value={crnsInput}
              onChange={e => setCrnsInput(e.target.value)}
              placeholder="e.g. 12345, 67890"
              className="mt-1 block w-full border-foreground/50 rounded-md shadow-sm focus:ring-accent focus:border-accent"
            />
          </label>
        </div>
        <div>
          <button
            onClick={handleRegisterCRNs}
            disabled={!term || !crnsInput.trim()}
            className="py-2 px-4 bg-accent text-foreground rounded-md shadow hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Register CRNs
          </button>
        </div>
        {message && <p className="text-center text-foreground">{message}</p>}
      </div>
    </main>
  );
}