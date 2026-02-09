import { Router } from 'express';
import {
  createSuggestedQuestions,
  getAllSuggestedQuestions,
  getSuggestedQuestionsById,
  updateSuggestedQuestions,
  deleteSuggestedQuestions,
} from './suggestedQuestions.controller';
import { validate } from '../../../middlewares/validater';
import { createSuggestedQuestionsSchema } from './suggestedQuestions.validator';

export const SuggestedQuestionsRoutes = Router();

// Create SuggestedQuestions
SuggestedQuestionsRoutes.post('/', validate(createSuggestedQuestionsSchema), createSuggestedQuestions);

// Get all SuggestedQuestionss
SuggestedQuestionsRoutes.get('/', getAllSuggestedQuestions);

// Get SuggestedQuestions by ID
SuggestedQuestionsRoutes.get('/:id', getSuggestedQuestionsById);

// Update SuggestedQuestions
SuggestedQuestionsRoutes.put('/:id', validate(createSuggestedQuestionsSchema), updateSuggestedQuestions);

// Delete SuggestedQuestions
SuggestedQuestionsRoutes.delete('/:id', deleteSuggestedQuestions);

export default SuggestedQuestionsRoutes;
    
