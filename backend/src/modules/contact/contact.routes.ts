import { Router } from 'express';
import {
  createContact,
  getAllContacts,
  getContactById,
  updateContact,
  deleteContact,
} from './contact.controller';
import { validate } from '../../middlewares/validater';
import { createContactSchema, updateContactSchema } from './contact.validation';

export const contactRoutes = Router();

// Create Contact
contactRoutes.post('/', validate(createContactSchema), createContact);

// Get all Contacts with pagination
contactRoutes.get('/', getAllContacts);


// Get Contact by ID
contactRoutes.get('/:id', getContactById);

// Update Contact
contactRoutes.put('/:id', validate(updateContactSchema), updateContact);

// Delete Contact (soft delete)
contactRoutes.delete('/:id', deleteContact);

// Hard delete Contact (permanent)

export default contactRoutes;

