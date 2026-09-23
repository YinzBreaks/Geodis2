import { Router } from 'express';
import { generatePipeline } from '../controllers/pipelineController';
import { handleStepMediaDispatch } from '../controllers/mediaController';

const router = Router();

router.post('/pipeline/deconstruct', generatePipeline);
router.post('/pipeline/step/media', handleStepMediaDispatch);

export default router;
