import ApiResponse from '../../../middlewares/apiResponse';
import { catchAsync } from '../../../middlewares/index';
import { DBQuery } from '../../../services/dbservices';
import { createContact } from '../../hubspot/hubspot.service';

let FaqQuery = new DBQuery('Faq');

// Create FAQ
export const createFaq = catchAsync(async (req, res, next) => {
  const { question } = req.body;

  const faq = await FaqQuery.create({
    question,
  });  

  return res
    .status(201)
    .json(new ApiResponse(201, 'FAQ created successfully', faq));
});

// Get all FAQs
export const getAllFaqs = catchAsync(async (req, res, next) => {

  const result = await FaqQuery.findMany({});

  return res
    .status(200)
    .json(new ApiResponse(200, 'FAQs retrieved successfully', result));
});

// Get FAQ by ID
export const getFaqById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const faq = await FaqQuery.findOne({ id }, undefined, 'FAQ not found');

  return res
    .status(200)
    .json(new ApiResponse(200, 'FAQ retrieved successfully', faq));
});

// Update FAQ
export const updateFaq = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { question } = req.body;

  // Check if FAQ exists
  await FaqQuery.findOne({ id }, undefined, 'FAQ not found');

  const updatedFaq = await FaqQuery.findByIdAndUpdate(id, {
    question,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, 'FAQ updated successfully', ""));
});

// Delete FAQ (soft delete)
export const deleteFaq = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  // Check if FAQ exists
  await FaqQuery.findOne({ id }, undefined, 'FAQ not found');

  await FaqQuery.findByIdAndDelete({ id });

  return res
    .status(200)
    .json(new ApiResponse(200, 'FAQ deleted successfully', ''));
});

// Create HubSpot Contact
export const createHubSpotContact = catchAsync(async (req, res, next) => {
  const { uuid } = req.body;


  const contactData = {
    firstname: uuid,
  };

  try {
    
    const result = await createContact(contactData);

    if (!result.success) {
      return res
        .status(500)
        .json(new ApiResponse(500, 'Failed to create HubSpot contact', '', false));
    }

    return res
      .status(201)
      .json(new ApiResponse(201, 'HubSpot contact created successfully',{id: result.data.id}));
  } catch (error: any) {
    return res
      .status(500)
      .json(new ApiResponse(500, 'Failed to create HubSpot contact', error.message || '', false));
  }
});

