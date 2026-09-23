import { Request, Response } from 'express';
import { forwardToCloudModel } from '../services/cloudModelService';
import { WorkspaceAudience } from '../types/pipeline';

export const generatePipeline = async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectIdea, targetAudience, model } = req.body;

    if (!projectIdea || typeof projectIdea !== 'string') {
      res.status(400).json({
        error: 'Bad Request: "projectIdea" is required and must be a string.',
      });
      return;
    }

    const userIdentity = req.user;
    const userRole = userIdentity?.role;

    // Security enforcement: If user is a student, lock audience mode to 'student'
    let effectiveAudience: WorkspaceAudience;
    if (userRole === 'student') {
      effectiveAudience = 'student';
    } else {
      effectiveAudience = targetAudience === 'expert' ? 'expert' : 'student';
    }

    const pipelineData = await forwardToCloudModel(projectIdea, effectiveAudience, {
      model,
    });

    // After successful generation, securely report usage via Stripe billing hook
    if (typeof req.reportBillingUsage === 'function') {
      try {
        await req.reportBillingUsage(1);
      } catch (billingErr) {
        console.error('Failed reporting billing usage:', billingErr);
      }
    }

    res.status(200).json(pipelineData);
  } catch (error: any) {
    console.error('Error in generatePipeline:', error);

    const isTimeout = error.name === 'AbortError';
    const isRateLimit = error.message?.includes('rate limit');
    const isAuthError = error.message?.includes('API key') || error.message?.includes('authentication');

    const statusCode = isRateLimit ? 429 : isAuthError ? 502 : 500;

    res.status(statusCode).json({
      error: 'Cloud model deconstruction processing failed',
      details: isTimeout
        ? 'Request to cloud model endpoint timed out'
        : error.message || 'Internal server error',
    });
  }
};
