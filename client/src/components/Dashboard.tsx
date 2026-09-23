import React, { useState } from 'react';
import { useOrchestrator } from '../context/OrchestrationContext';
import { MOCK_PROJECT_PIPELINE } from '../utils/mockData';
import { WorkspaceAudience } from '../types/orchestration';
import { AiderStepCard } from './AiderStepCard';

export const Dashboard: React.FC = () => {
  const {
    currentPipeline,
    setCurrentPipeline,
    isLoading,
    setIsLoading,
    currentUserRole,
    userIdentity,
    session,
    signOut,
    markStepComplete,
    isStepLocked,
  } = useOrchestrator();

  const [projectIdea, setProjectIdea] = useState(
    'Build an internal attendance dashboard with student check-ins, analytics, and exported reports.'
  );
  const [audienceMode, setAudienceMode] = useState<WorkspaceAudience>(
    currentUserRole === 'student' ? 'student' : 'expert'
  );
  const [useOfflineMock, setUseOfflineMock] = useState(true);

  // If currentUserRole is student, enforce student audience
  const effectiveAudienceMode = currentUserRole === 'student' ? 'student' : audienceMode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectIdea.trim()) return;

    setIsLoading(true);

    if (useOfflineMock) {
      // Simulate quick cluster response with mock data
      setTimeout(() => {
        const injectedMock = {
          ...MOCK_PROJECT_PIPELINE,
          rawIdea: projectIdea,
          audienceMode: effectiveAudienceMode,
        };
        setCurrentPipeline(injectedMock);
        setIsLoading(false);
      }, 400);
      return;
    }

    // Try online cluster API endpoint; if offline or fails, fallback to mock injection
    try {
      const response = await fetch('/api/pipeline/deconstruct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-remote-user': 'developer_local',
          'x-remote-groups': currentUserRole === 'expert' ? 'teachers' : 'students',
        },
        body: JSON.stringify({
          projectIdea,
          targetAudience: effectiveAudienceMode,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setCurrentPipeline(data);
    } catch (err) {
      console.warn('Network / cluster unavailable, falling back to mock pipeline:', err);
      const fallbackMock = {
        ...MOCK_PROJECT_PIPELINE,
        rawIdea: projectIdea,
        audienceMode: effectiveAudienceMode,
      };
      setCurrentPipeline(fallbackMock);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">
            PO
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              PromptOrganizer
              <span className="text-xs px-2 py-0.5 rounded-full border border-cyan-500/30 bg-cyan-950/50 text-cyan-400 font-mono">
                Cluster Orchestrator
              </span>
            </h1>
            <p className="text-xs text-slate-400">Zero-Trust AI Agent Deconstruction Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs">
          {session && (
            <div className="hidden sm:flex items-center gap-2 text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-md border border-slate-700/50">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="font-mono text-[11px] text-slate-300">
                {userIdentity?.email || session.user.email}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2 bg-slate-800/70 px-3 py-1.5 rounded-md border border-slate-700/60">
            <span className="text-slate-400">Role:</span>
            <span
              className={`font-semibold uppercase tracking-wider ${
                currentUserRole === 'expert' ? 'text-amber-400' : 'text-cyan-400'
              }`}
            >
              {currentUserRole}
            </span>
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300 bg-slate-800/40 hover:bg-slate-800/70 px-3 py-1.5 rounded-md border border-slate-700/50 transition">
            <input
              type="checkbox"
              checked={useOfflineMock}
              onChange={(e) => setUseOfflineMock(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
            />
            <span className="font-mono text-[11px]">Mock Mode (Offline)</span>
          </label>

          {session && (
            <button
              type="button"
              onClick={signOut}
              className="text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-700 transition"
              title="Sign Out"
            >
              Sign Out
            </button>
          )}
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <main className="flex-1 p-6 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Project Blueprint Input */}
        <section className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm sticky top-24">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <div>
              <h2 className="text-base font-semibold text-white">Project Blueprint Input</h2>
              <p className="text-xs text-slate-400">Deconstruct any system concept into an autonomous pipeline</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="projectIdea" className="block text-xs font-medium text-slate-300 mb-2">
                Project Idea / Raw Concept
              </label>
              <textarea
                id="projectIdea"
                value={projectIdea}
                onChange={(e) => setProjectIdea(e.target.value)}
                placeholder="Describe your architecture, service, or full-stack application proposal..."
                rows={5}
                required
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 rounded-lg p-3 text-sm text-slate-200 placeholder-slate-500 outline-none transition resize-none"
              />
            </div>

            {/* Audience Mode Selector */}
            <div className="bg-slate-950/40 p-3.5 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-300">Audience Mode</span>
                <span className="text-[11px] text-slate-400">
                  {currentUserRole === 'student' ? 'Locked to Student' : 'Select Target Audience'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 rounded-lg border border-slate-800">
                <button
                  type="button"
                  disabled={currentUserRole === 'student'}
                  onClick={() => setAudienceMode('expert')}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                    effectiveAudienceMode === 'expert'
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed'
                  }`}
                >
                  Expert
                  <span className="text-[10px] opacity-75">(Full Code)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAudienceMode('student')}
                  className={`py-2 px-3 text-xs font-medium rounded-md transition flex items-center justify-center gap-1.5 ${
                    effectiveAudienceMode === 'student'
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Student
                  <span className="text-[10px] opacity-75">(Scaffold Only)</span>
                </button>
              </div>

              {currentUserRole === 'student' && (
                <p className="mt-2 text-[11px] text-cyan-400/90 leading-tight">
                  Policy Enforced: Active Authelia role is student. Boilerplate stubs and pedagogical hints enabled.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading || !projectIdea.trim()}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 via-indigo-600 to-cyan-500 bg-size-200 hover:bg-pos-100 text-white text-sm font-semibold shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>Deconstructing on Cluster...</span>
                </>
              ) : (
                <>
                  <span>Deconstruct Blueprint</span>
                  <span className="text-xs opacity-75 font-mono">⚡</span>
                </>
              )}
            </button>
          </form>
        </section>

        {/* Right Column: Execution Pipeline Workspace */}
        <section className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-6 shadow-xl backdrop-blur-sm min-h-[500px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
            <div>
              <h2 className="text-base font-semibold text-white">Execution Pipeline Workspace</h2>
              <p className="text-xs text-slate-400">
                {currentPipeline
                  ? `Pipeline ID: ${currentPipeline.pipelineId} (${currentPipeline.steps.length} Steps)`
                  : 'Awaiting deconstruction input'}
              </p>
            </div>
            {currentPipeline && (
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-cyan-400">
                Mode: {currentPipeline.audienceMode}
              </span>
            )}
          </div>

          {/* Empty Placeholder State */}
          {!currentPipeline && (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-950/30">
              <div className="w-14 h-14 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400 mb-4 shadow-inner">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="text-sm font-semibold text-slate-200 mb-1">No Active Pipeline Blueprint</h3>
              <p className="text-xs text-slate-400 max-w-sm">
                Enter your system concept on the left and click "Deconstruct Blueprint" to generate the multi-agent task
                graph.
              </p>
            </div>
          )}

          {/* List of OrchestrationStep Cards */}
          {currentPipeline && (
            <div className="space-y-4">
              {currentPipeline.steps.map((step) => {
                const locked = isStepLocked(step);

                return (
                  <AiderStepCard
                    key={step.stepNumber}
                    step={step}
                    isLocked={locked}
                    onComplete={markStepComplete}
                  />
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
