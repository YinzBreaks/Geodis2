export type WorkspaceAudience = 'expert' | 'student';

export interface AiderConfig {
  filesToLoad: string[];
  executionPrompt: string;
}

export interface MediaConfig {
  assetType: 'IMAGE' | 'AUDIO_VOICE' | 'AUDIO_MUSIC' | 'NONE';
  prompt: string;
  targetOutputDirectory: string;
}

export interface PipelineStep {
  stepNumber: number;
  taskName: string;
  assignedEngine: 'DeepSeek-4' | 'Qwen-3.8' | 'Gemma-4' | 'Media-Gen';
  dependencies: number[];
  aiderConfig: AiderConfig | null;
  mediaConfig: MediaConfig | null;
  pedagogicalHint: string;
  isCompleted: boolean;
}

export interface DeconstructionPipelineResponse {
  pipelineId: string;
  rawIdea: string;
  audienceMode: WorkspaceAudience;
  steps: PipelineStep[];
}
