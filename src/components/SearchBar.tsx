"use client";
import React, { useState, useCallback, useRef } from "react";

interface SearchBarProps {
  query: string;
  setQuery: (val: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  loading: boolean;
  onPlaceholderClick: (val: string) => void;
}

const placeholderQueries = [
  "warm outfit for windy walk in Istanbul",
  "casual office look under 5000 TL",
  "summer vacation in Bodrum",
];

export function SearchBar({ query, setQuery, onSubmit, loading, onPlaceholderClick }: SearchBarProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in your browser. Try Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = false;
    recognition.interimResults = false;
    // Auto-detect language — supports English, Turkish, Russian, etc.
    recognition.lang = "";

    recognition.onstart = () => setIsListening(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, [setQuery]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  }, []);

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-[0_24px_60px_-48px_rgba(31,26,23,0.6)] backdrop-blur"
    >
      <label className="text-sm font-medium uppercase tracking-[0.25em] text-ink-700">
        Describe what you need
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Try: something warm for a windy evening"
          className="min-w-[220px] flex-1 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-base text-ink-900 shadow-sm focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-400/30"
        />
        <button
          type="button"
          onClick={isListening ? stopListening : startListening}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all ${
            isListening 
              ? "border-clay-500 bg-clay-500/10 text-clay-500 animate-pulse shadow-[0_0_12px_rgba(198,106,61,0.3)]" 
              : "border-sand-200 bg-white text-ink-700 hover:bg-sand-50 hover:border-sage-400"
          }`}
          title={isListening ? "Stop listening" : "Voice input"}
        >
          {isListening ? "⏹" : "🎤"}
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-2xl bg-sage-600 px-6 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white transition hover:bg-sage-400 disabled:cursor-not-allowed disabled:bg-sand-200 disabled:text-ink-700"
        >
          {loading ? "Searching…" : "Ask Agent"}
        </button>
      </div>
      <div className="flex flex-wrap gap-2 text-xs text-ink-700">
        {placeholderQueries.map((item) => (
          <button
            type="button"
            key={item}
            onClick={() => onPlaceholderClick(item)}
            className="rounded-full border border-sand-200 bg-white px-3 py-1 transition hover:border-sage-400 hover:text-sage-600"
          >
            {item}
          </button>
        ))}
      </div>
    </form>
  );
}
