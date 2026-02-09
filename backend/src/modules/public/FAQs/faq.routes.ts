import { Router } from 'express';
import {
  createFaq,
  getAllFaqs,
  getFaqById,
  updateFaq,
  deleteFaq,
  createHubSpotContact,
} from './faq.controller';
import { validate } from '../../../middlewares/validater';
import { createFaqSchema } from './faq.validator';

export const faqRoutes = Router();

// Create FAQ
faqRoutes.post('/', validate(createFaqSchema), createFaq);

// Get all FAQs
faqRoutes.get('/', getAllFaqs);

// Get FAQ by ID
faqRoutes.get('/:id', getFaqById);

// Update FAQ
faqRoutes.put('/:id', validate(createFaqSchema), updateFaq);

// Delete FAQ
faqRoutes.delete('/:id', deleteFaq);

// Create HubSpot Contact
faqRoutes.post('/hupsortcontact', createHubSpotContact);

export default faqRoutes;
    
