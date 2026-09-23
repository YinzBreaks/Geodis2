export type LocalClusterEngine = 'DeepSeek-4' | 'Qwen-3.8' | 'Gemma-4' | 'Media-Gen';

export type WorkspaceAudience = 'expert' | 'student';

export interface UserIdentity {
  id: string;
  email?: string;
  role: 'expert' | 'student';
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface AiderConfig {
  filesToLoad: string[];
  executionPrompt: string;
}

export interface MediaConfig {
  assetType: 'IMAGE' | 'AUDIO_VOICE' | 'AUDIO_MUSIC' | 'NONE';
  prompt: string;
  targetOutputDirectory: string;
}

export interface OrchestrationStep {
  stepNumber: number;
  taskName: string;
  assignedEngine: LocalClusterEngine;
  dependencies: number[];
  aiderConfig: AiderConfig | null;
  mediaConfig: MediaConfig | null;
  pedagogicalHint: string;
  isCompleted: boolean;
}

export interface ProjectPipeline {
  pipelineId: string;
  rawIdea: string;
  audienceMode: WorkspaceAudience;
  steps: OrchestrationStep[];
}
