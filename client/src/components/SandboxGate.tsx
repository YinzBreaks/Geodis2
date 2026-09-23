import React, { useState } from 'react';
import { OrchestrationStep } from '../types/orchestration';

export interface SandboxGateProps {
  step: OrchestrationStep;
  onUnlock?: () => void;
}

export type GateStage = 'LOCKED' | 'REVIEWING_LOGIC' | 'UNLOCKED';

export const SandboxGate: React.FC<SandboxGateProps> = ({ step, onUnlock }) => {
  const [gateStage, setGateStage] = useState<GateStage>('LOCKED');
  const [hasAcknowledged, setHasAcknowledged] = useState<boolean>(false);

  const handleStartReview = () => {
    setGateStage('REVIEWING_LOGIC');
  };

  const handleRevealCommand = () => {
    if (!hasAcknowledged) return;
    setGateStage('UNLOCKED');
    if (onUnlock) {
      onUnlock();
    }
  };

  // Helper to format aider terminal command
  const filesArgs = step.aiderConfig?.filesToLoad.join(' ') || '';
  const promptArg = step.aiderConfig?.executionPrompt.replace(/"/g, '\\"') || '';
  const aiderCLICommand = `aider ${filesArgs} --message "${promptArg}"`;

  return (
    <div className="mt-3 rounded-lg border border-indigo-900/60 bg-slate-950/70 overflow-hidden text-xs transition-all">
      {/* Stage 1: LOCKED */}
      {gateStage === 'LOCKED' && (
        <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/20 to-slate-950 border-l-4 border-indigo-500">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-indigo-900/40 border border-indigo-700/50 text-indigo-300">
              <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h5 className="text-sm font-semibold text-indigo-200 flex items-center gap-2">
                <span>🔒 Pedagogy Gate: Active Learning Review Required</span>
              </h5>
              <p className="text-slate-400 mt-1 leading-relaxed">
                Direct execution instructions are locked for student mode. Review the architectural rationale and
                conceptual pattern before revealing the Aider scaffolding prompt.
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleStartReview}
                  className="px-3.5 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5"
                >
                  <span>Begin Architecture Review</span>
                  <span className="font-mono text-xs">→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage 2: REVIEWING_LOGIC */}
      {gateStage === 'REVIEWING_LOGIC' && (
        <div className="p-4 bg-indigo-950/30 border-l-4 border-amber-500 space-y-3">
          <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs tracking-wider uppercase">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <span>Architectural Comprehension & Pedagogy Hint</span>
          </div>

          <blockquote className="p-3.5 bg-slate-900/90 rounded-md border-l-2 border-indigo-400 text-slate-200 text-xs italic leading-relaxed">
            {step.pedagogicalHint ||
              'Carefully examine how interface contracts and dependency boundaries guard system integrity.'}
          </blockquote>

          <label className="flex items-start gap-2.5 p-3 rounded-md bg-slate-900/70 border border-slate-800 cursor-pointer select-none text-slate-300 hover:bg-slate-900 transition">
            <input
              type="checkbox"
              checked={hasAcknowledged}
              onChange={(e) => setHasAcknowledged(e.target.checked)}
              className="mt-0.5 rounded bg-slate-950 border-slate-700 text-indigo-500 focus:ring-0 cursor-pointer"
            />
            <span className="text-xs leading-snug">
              I have read the architectural specification and understand why this component is decoupled from the
              database layer.
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setGateStage('LOCKED')}
              className="px-3 py-1.5 rounded-md text-slate-400 hover:text-slate-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!hasAcknowledged}
              onClick={handleRevealCommand}
              className="px-4 py-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium shadow-md shadow-cyan-600/30 transition flex items-center gap-1.5"
            >
              <span>Reveal Aider Command</span>
              <span>🔓</span>
            </button>
          </div>
        </div>
      )}

      {/* Stage 3: UNLOCKED */}
      {gateStage === 'UNLOCKED' && step.aiderConfig && (
        <div className="p-4 bg-slate-900/90 border-l-4 border-emerald-500 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-emerald-400 font-semibold text-xs flex items-center gap-1.5">
              <span>✓ Architecture Gate Passed</span>
              <span className="text-[10px] text-slate-400 font-normal">(Student Sandbox Unlocked)</span>
            </span>
            <button
              type="button"
              onClick={() => setGateStage('LOCKED')}
              className="text-[11px] text-slate-400 hover:text-slate-300 underline"
            >
              Re-lock Gate
            </button>
          </div>

          <div className="bg-slate-950 rounded-lg p-3 border border-slate-800 space-y-2 font-mono text-[11px]">
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-slate-500">Files:</span>
              <span className="text-cyan-300">{step.aiderConfig.filesToLoad.join(', ')}</span>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Aider Command:</span>
              <pre className="bg-black/80 text-emerald-300 p-2.5 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap selection:bg-emerald-900 selection:text-white">
                {aiderCLICommand}
              </pre>
            </div>

            <div>
              <span className="text-slate-500 block mb-1">Scaffold Execution Prompt:</span>
              <pre className="bg-slate-900 text-slate-300 p-2 rounded border border-slate-800 overflow-x-auto whitespace-pre-wrap">
                {step.aiderConfig.executionPrompt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
