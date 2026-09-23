import React from 'react';
import { OrchestrationStep } from '../types/orchestration';
import { SandboxGate } from './SandboxGate';

export interface AiderStepCardProps {
  step: OrchestrationStep;
  isLocked: boolean;
  onComplete: (stepNumber: number) => void;
}

export const AiderStepCard: React.FC<AiderStepCardProps> = ({
  step,
  isLocked,
  onComplete,
}) => {
  const completed = step.isCompleted;

  const getEngineBadgeClass = (engine: OrchestrationStep['assignedEngine']) => {
    switch (engine) {
      case 'DeepSeek-4':
        return 'bg-purple-950/70 text-purple-300 border-purple-700/50';
      case 'Gemma-4':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-700/50';
      case 'Media-Gen':
        return 'bg-amber-950/70 text-amber-300 border-amber-700/50';
      case 'Qwen-3.8':
        return 'bg-blue-950/70 text-blue-300 border-blue-700/50';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  // Border & elevation styles
  const cardBorderClass = isLocked
    ? 'border-gray-700 opacity-50 bg-slate-950/40'
    : completed
    ? 'border-emerald-500/80 bg-slate-900/90 shadow-emerald-500/5'
    : 'border-cyan-400 bg-slate-900/90 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-400/20';

  return (
    <div className={`rounded-xl border p-5 transition-all duration-200 ${cardBorderClass}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-semibold text-slate-300">
            {step.stepNumber}
          </span>

          <h4 className="text-sm font-semibold text-slate-100">{step.taskName}</h4>

          {/* Engine Badge */}
          <span
            className={`text-[11px] font-mono font-medium px-2 py-0.5 rounded border ${getEngineBadgeClass(
              step.assignedEngine
            )}`}
          >
            {step.assignedEngine}
          </span>
        </div>

        {/* Lock / Completion Status */}
        <div className="flex items-center gap-2">
          {isLocked ? (
            <div className="flex items-center gap-1 text-xs text-slate-400 font-mono bg-slate-800/80 px-2 py-1 rounded border border-slate-700">
              <svg className="w-3.5 h-3.5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              <span>Locked (Prereqs: {step.dependencies.join(', ')})</span>
            </div>
          ) : completed ? (
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-800">
              ✓ Completed
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onComplete(step.stepNumber)}
              className="text-xs font-medium px-3 py-1 rounded-md bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 transition cursor-pointer"
            >
              Mark Complete
            </button>
          )}
        </div>
      </div>

      {/* Pedagogical Hint block if present */}
      {step.pedagogicalHint && (
        <div className="mb-3 p-3 rounded-lg bg-indigo-950/30 border border-indigo-900/50 text-indigo-200 text-xs">
          <strong className="text-indigo-300 font-medium mr-1">Pedagogical Hint:</strong>
          {step.pedagogicalHint}
        </div>
      )}

      {/* Wrap internal execution prompt code inside SandboxGate */}
      {step.aiderConfig && (
        <SandboxGate step={step} onUnlock={() => console.log(`Step ${step.stepNumber} sandbox gate unlocked`)} />
      )}

      {/* Media Generation Config block if present */}
      {step.mediaConfig && (
        <div className="mt-3 bg-slate-950/60 rounded-lg p-3 border border-slate-800 text-xs space-y-1.5 font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-amber-400 font-semibold">Asset: {step.mediaConfig.assetType}</span>
            <span className="text-slate-500">→</span>
            <span className="text-slate-300">{step.mediaConfig.targetOutputDirectory}</span>
          </div>
          <div className="text-slate-300 italic bg-slate-900 p-2 rounded border border-slate-800">
            "{step.mediaConfig.prompt}"
          </div>
        </div>
      )}
    </div>
  );
};
