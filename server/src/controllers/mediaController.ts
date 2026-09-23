import { Request, Response } from 'express';
import { dispatchMediaGeneration, MediaGenerationConfig } from '../services/mediaDispatcherService';

export const handleStepMediaDispatch = async (req: Request, res: Response): Promise<void> => {
  try {
    const { assetType, prompt, targetOutputDirectory } = req.body;

    if (!assetType || !prompt || !targetOutputDirectory) {
      res.status(400).json({
        error: 'Bad Request: "assetType", "prompt", and "targetOutputDirectory" are all required.',
      });
      return;
    }

    const validAssetTypes = ['IMAGE', 'AUDIO_VOICE', 'AUDIO_MUSIC', 'NONE'];
    if (!validAssetTypes.includes(assetType)) {
      res.status(400).json({
        error: `Bad Request: "assetType" must be one of ${validAssetTypes.join(', ')}.`,
      });
      return;
    }

    const config: MediaGenerationConfig = {
      assetType,
      prompt,
      targetOutputDirectory,
    };

    const result = await dispatchMediaGeneration(config);

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error in handleStepMediaDispatch:', error);
    res.status(500).json({
      error: 'Media dispatch failed unexpectedly',
      details: error.message || 'Internal server error',
    });
  }
};
