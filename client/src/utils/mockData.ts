import { ProjectPipeline } from '../types/orchestration';

export const MOCK_PROJECT_PIPELINE: ProjectPipeline = {
  pipelineId: 'pipeline-attendance-001',
  rawIdea: 'Build an internal attendance dashboard with student check-ins, analytics, and exported reports.',
  audienceMode: 'student',
  steps: [
    {
      stepNumber: 1,
      taskName: 'Base Database Models & Attendance Schema',
      assignedEngine: 'DeepSeek-4',
      dependencies: [],
      aiderConfig: {
        filesToLoad: ['server/src/models/AttendanceRecord.ts', 'server/src/models/User.ts'],
        executionPrompt:
          '// Scaffolding: Define TypeScript interfaces and Prisma/Mongoose schema skeletons for StudentAttendance and User models.\n// Leave core relationship mapping and indexing methods as instructional TODO exercises.',
      },
      mediaConfig: null,
      pedagogicalHint:
        'Think about indexing strategies on timestamps and student IDs. How will historical query performance scale across thousands of daily check-ins?',
      isCompleted: false,
    },
    {
      stepNumber: 2,
      taskName: 'Boilerplate Sidebar View Component',
      assignedEngine: 'Gemma-4',
      dependencies: [1],
      aiderConfig: {
        filesToLoad: ['client/src/components/Sidebar.tsx'],
        executionPrompt:
          '// Generate responsive navigation sidebar skeleton with links for Overview, Daily Roster, and Reports.\n// Include empty handler stubs for active route switching.',
      },
      mediaConfig: null,
      pedagogicalHint:
        'Notice how role-based route visibility should be decoupled from presentational navigation items to keep the component testable.',
      isCompleted: false,
    },
    {
      stepNumber: 3,
      taskName: 'Local Asset Generation: App Logo & Badges',
      assignedEngine: 'Media-Gen',
      dependencies: [1],
      aiderConfig: null,
      mediaConfig: {
        assetType: 'IMAGE',
        prompt:
          'Minimalist modern vector icon of a biometric shield with attendance checkmark, deep indigo and neon cyan glowing accents, transparent background.',
        targetOutputDirectory: 'client/public/assets/branding',
      },
      pedagogicalHint:
        'Visual identity anchors the user experience. Consider maintaining consistent border-radii and color palettes across static assets.',
      isCompleted: false,
    },
  ],
};
