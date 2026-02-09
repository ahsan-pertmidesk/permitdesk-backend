import ApiResponse from '../../middlewares/apiResponse';
import { catchAsync } from '../../middlewares/index';
import { DBQuery } from '../../services/dbservices';
import { CreateContactInput, UpdateContactInput } from './contact.types';
import {sendEmail} from '../../services/send-grid';
import {isBusinessMail } from '@myselfraj/is-business-mail'
import { generateContactEmail } from '../../services/email-html/utils/emailTemplateFunctions';
import { SEND_GRID_SENDER_EMAIL } from '../../config/variables';


const ContactQuery = new DBQuery('Contact');

// Create Contact
export const createContact = catchAsync(async (req, res, next) => {
  const { email, fullName, phoneNumber, message }: CreateContactInput = req.body;

  const isBusiness =  isBusinessMail(email);
  if (!isBusiness) {
    return res
      .status(400)
      .json(new ApiResponse(400, 'Business or work email address allowed', '', false));
  }


  const contactData: CreateContactInput = {
    email,
    fullName,
    phoneNumber,
    message,
  };

  const contact = await ContactQuery.create(contactData);
  
  // Generate HTML email template with contact details
  const emailHtml = generateContactEmail({
    fullName: contactData.fullName,
    email: contactData.email,
    phoneNumber: contactData.phoneNumber,
    message: contactData.message,
  });
  
  // Send email notification to admin about new contact submission
  const adminEmail =SEND_GRID_SENDER_EMAIL;
  await sendEmail(adminEmail!, 'New Contact Form Submission', emailHtml);

  return res
    .status(201)
    .json(new ApiResponse(201, 'Contact created successfully', contact));
});

// Get all Contacts with pagination
export const getAllContacts = catchAsync(async (req, res, next) => {
  const { page, limit, search } = req.query;

  const pageNumber = page ? parseInt(page as string, 10) : 1;
  const pageLimit = limit ? parseInt(limit as string, 10) : 12;

  let query: Record<string, any> = {};

  // Add search functionality for email and fullName
  if (search) {
    query.OR = [
      { email: { contains: search as string, mode: 'insensitive' } },
      { fullName: { contains: search as string, mode: 'insensitive' } },
    ];
  }

  const result = await ContactQuery.getAllWithPagination(
    query,
    pageLimit,
    pageNumber,
    undefined,
    undefined,
    { createdAt: 'desc' }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, 'Contacts retrieved successfully', result));
});

// Get Contact by ID
export const getContactById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const contact = await ContactQuery.findOne({ id }, undefined, 'Contact not found');

  return res
    .status(200)
    .json(new ApiResponse(200, 'Contact retrieved successfully', contact));
});



// Update Contact
export const updateContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { email, fullName, phoneNumber, message }: UpdateContactInput = req.body;

  // Check if contact exists
  const existingContact = await ContactQuery.findOne({ id }, undefined, 'Contact not found');

  // If email is being updated, check for duplicates
  if (email && email !== existingContact.email) {
    await ContactQuery.checkDuplicateWithNonUnique(
      { email },
      'Contact with this email already exists'
    );
  }

  const updateData: UpdateContactInput = {};

  if (email !== undefined) updateData.email = email;
  if (fullName !== undefined) updateData.fullName = fullName;
  if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
  if (message !== undefined) updateData.message = message;

  const updatedContact = await ContactQuery.findByIdAndUpdate(id, updateData);

  return res
    .status(200)
    .json(new ApiResponse(200, 'Contact updated successfully', updatedContact));
});

// Delete Contact (soft delete)
export const deleteContact = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if contact exists
  await ContactQuery.findOne({ id }, undefined, 'Contact not found');

  await ContactQuery.findByIdAndDelete({ id });

  return res
    .status(200)
    .json(new ApiResponse(200, 'Contact deleted successfully', ''));
});

