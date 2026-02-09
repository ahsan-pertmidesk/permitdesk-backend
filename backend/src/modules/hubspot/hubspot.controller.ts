import { Request, Response } from "express";
import { catchAsync } from "../../middlewares/index";
import ApiResponse from "../../middlewares/apiResponse";
import { getContactByEmail,getTicketsWithAssociations,getPaymentsByContactId,getHubspotInboxesService,getAllContacts,getAllWhatsConversation,
getAllEmailAssociations,getTicketById,getAllWhatsAppAndSMSByContactId,getAllDocumentsByContactId,getContactAssociations ,
getTicketWithEmails,getTicketTasksWithEmailsAndAttachments,getTicketNotesWithAttachments,createTickets,getTicketAttachments,
getWhatsappMessagesForTicket,createContact,createTaskForTicket,createNoteForTicket,sendEmailByTicketId,sendWhatsAppMessageByTicketId,
uploadFileToHubSpot
} from "./hubspot.service";
import { FOLDER_ID } from "../../config/variables";


export const fetchHubSpotContactByEmail = catchAsync(async (req, res) => {
  console.log("The fetch HubSpot Contact By Email api is ruing")
  const { email } = req.params;

  if (!email) {
    return res.status(400).json(new ApiResponse(400, "Email is required", null, false));
  }

  const contact = await getContactByEmail(email);

  if (!contact) {
    return res.status(404).json(new ApiResponse(404, "Contact not found", null, false));
  }

  return res.status(200).json(new ApiResponse(200, 'Contact retrieved successfully', contact));

});


export const getAllTicketsWithAssociations = catchAsync(async (req: Request, res: Response) => {
  let  id = (req.params.id);

  if (!id) {
    return res.status(400).json(new ApiResponse(400, "Contact ID is required", null, false));
  }

  const tickets = await getTicketsWithAssociations(id);

  return res.status(200).json(new ApiResponse(200, "Tickets retrieved successfully", tickets));
});

 

export const fetchTicketById = catchAsync(async (req: Request, res: Response) => {
  const ticketId = req.params.id;

  if (!ticketId) {
    return res.status(400).json(new ApiResponse(400, "Ticket ID is required", null, false));
  }

   const ticket = await getTicketWithEmails(ticketId);
   const tasks = await getTicketTasksWithEmailsAndAttachments(ticketId)
   const notes = await getTicketNotesWithAttachments(ticketId)
   const attachments = await getTicketAttachments(ticketId)
   const whatsApp = await getWhatsappMessagesForTicket(ticketId)

  return res.status(200).json(new ApiResponse(200, "Ticket retrieved successfully", {
    ticket,
    tasks,
    notes,
    attachments,
    whatsApp
  }));
});

export const getPaymentsByContact = catchAsync(async (req: Request, res: Response) => {
  let  id = parseInt(req.params.id);

  if (!id) {
    return res.status(400).json(new ApiResponse(400, "Contact ID is required", null, false));
  }

  const payments = await getPaymentsByContactId(id);

  return res.status(200).json(new ApiResponse(200, "Payments retrieved successfully", {
    count: payments.length,
    payments
  }));  
});




export const getHubspotInboxes = catchAsync(async (req: Request, res: Response) => {
  console.log("The api is ruing")
  const inboxes = await getHubspotInboxesService();
  return res.status(200).json(new ApiResponse(200, "Inboxes retrieved successfully", {
    count: inboxes.length,
    inboxes,
  }));
});


export const fetchAllContact = catchAsync(async (req: Request, res: Response) => {
  console.log("The fetch all contact  api is ruing")
  const contacts = await getAllContacts();
  return res.status(200).json(new ApiResponse(200, "Contacts retrieved successfully", {
    count: contacts.length,
    contacts,
  }));
});


export const fetchAllWhatsConversation = catchAsync(async (req: Request, res: Response) => {
  console.log("The fetch all whats Conversation  api is ruing")
  let contactId = req.params.id
  const contacts = await getAllWhatsConversation(contactId);
  return res.status(200).json(new ApiResponse(200, "WhatsApp conversations retrieved successfully", contacts));
});



export const fetchAllEmailAssociations = catchAsync(async (req: Request, res: Response) => {
  console.log("The fetch all Email Associations  api is ruing")
  let contactId = req.params.id
  const contacts = await getAllEmailAssociations(contactId);
  console.log("🚀 ~ fetchAllEmailAssociations ~ contacts:", contacts)
  return res.status(200).json(new ApiResponse(200, "Email associations retrieved successfully", {
    count: contacts.length,
    contacts,
  }));
});



export const fetchWhatsAppAndSMSByContactId = catchAsync(async (req: Request, res: Response) => {
  const contactId = req.params.id;

  if (!contactId) {
    return res.status(400).json(new ApiResponse(400, "Contact ID is required", null, false));
  }

  const messages = await getAllWhatsAppAndSMSByContactId(contactId);

  return res.status(200).json(new ApiResponse(200, "WhatsApp and SMS messages retrieved successfully", {
    count: messages.length,
    messages,
  }));
});


export const fetchAllDocumentsByContactId = catchAsync(async (req: Request, res: Response) => {
  const contactId = req.params.id;
  if (!contactId) {
    return res.status(400).json(new ApiResponse(400, "Contact ID is required", null, false));
  }

  const documents = await getAllDocumentsByContactId(contactId);

  return res.status(200).json(new ApiResponse(200, "Documents retrieved successfully", {
    count: documents.length,
    documents,
  }));
});


export const fetchContactAssociations = catchAsync(async (req: Request, res: Response) => {
  const contactId = req.params.id;
  if (!contactId) {
    return res.status(400).json(new ApiResponse(400, "Contact ID is required", null, false));
  }

  const data = await getContactAssociations(contactId);

  return res.status(200).json(new ApiResponse(200, "Contact associations retrieved successfully", data));
});





export const createContacts = catchAsync(async (req: Request, res: Response) => {
  const contactData = req.body

  if (!contactData || Object.keys(contactData).length === 0) {
    return res.status(400).json(new ApiResponse(400, "Contact data is required", null, false))
  }

  const result = await createContact(contactData)

  if (!result.success) {
    return res.status(500).json(new ApiResponse(500, "Failed to create HubSpot contact", null, false))
  }

  return res.status(201).json(new ApiResponse(201, "Contact created successfully", result.data))
})



export const createTicketsForContact = catchAsync(async (req: Request, res: Response) => {
  let data = req.body
  let contactId = req.params.id as string
  

  const result = await createTickets(data, contactId)


  return res.status(201).json(new ApiResponse(201, contactId
    ? "Ticket created and associated with contact"
    : "Ticket created successfully", result))
})



export const createTaskController = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params
  const { subject, body, dueDate, priority, status, taskType, assignedTo } = req.body

  // Validation
  if (!ticketId) {
    return res.status(400).json(new ApiResponse(400, 'Ticket ID is required', null, false))
  }

  if (!subject) {
    return res.status(400).json(new ApiResponse(400, 'Task subject is required', null, false))
  }

  // Validate priority if provided
  const validPriorities = ['LOW', 'MEDIUM', 'HIGH']
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json(new ApiResponse(400, 'Invalid priority. Must be LOW, MEDIUM, or HIGH', null, false))
  }

  // Validate status if provided
  const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'WAITING', 'DEFERRED']
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json(new ApiResponse(400, 'Invalid status. Must be NOT_STARTED, IN_PROGRESS, COMPLETED, WAITING, or DEFERRED', null, false))
  }

  // Validate dueDate format if provided
  if (dueDate && isNaN(Date.parse(dueDate))) {
    return res.status(400).json(new ApiResponse(400, 'Invalid date format. Use ISO 8601 format (e.g., 2025-11-05T12:00:00Z)', null, false))
  }

  // Create task
  const result = await createTaskForTicket(ticketId, {
    subject,
    body,
    dueDate,
    priority,
    status,
    taskType,
    assignedTo
  })

  if (!result.ok) {
    return res.status(500).json(new ApiResponse(500, result.message || 'Failed to create task', result.error || null, false))
  }

  return res.status(201).json(new ApiResponse(201, 'Task created successfully', {
    taskId: result.taskId,
    ticketId: ticketId,
    task: result.data
  }))
})



export const createNoteController = catchAsync(async (req: Request, res: Response) => {
  const { note } = req.body;
     const { ticketId } = req.params

  if (!ticketId || !note || !note.body) {
    return res.status(400).json(new ApiResponse(400, "Ticket ID and note body are required", null, false));
  }

  const result = await createNoteForTicket(ticketId, note);

  if (!result.ok) {
    return res.status(500).json(new ApiResponse(500, result.message || 'Failed to create note', result.error || null, false));
  }

  return res.status(201).json(new ApiResponse(201, result.message || 'Note created successfully', {
    noteId: result.noteId,
    note: result.data
  }));
})


export const sendTicketEmailController = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { subject, body } = req.body;

  // Validation
  if (!ticketId) {
    return res.status(400).json(new ApiResponse(400, "Ticket ID is required", null, false));
  }

  // Send email
  const result = await sendEmailByTicketId(ticketId, 
    subject,
    body,
  );

  if (!result.ok) {
    return res.status(400).json(new ApiResponse(400, 'Failed to send email', result.error || null, false));
  }

  return res.status(200).json(new ApiResponse(200, 'Email sent successfully', result.data || null));
})





export const sendTicketWhatsAppController = catchAsync(async (req: Request, res: Response) => {
  const { ticketId } = req.params;
  const { text, threadId, senderActorId, channelId, channelAccountId, attachments } = req.body;

  if (!ticketId) {
    return res.status(400).json(new ApiResponse(400, "Ticket ID is required", null, false));
  }

  if (!senderActorId) {
    return res.status(400).json(new ApiResponse(400, "senderActorId is required", null, false));
  }

  const result = await sendWhatsAppMessageByTicketId(ticketId, text, {
    threadId,
    senderActorId,
    channelId,
    channelAccountId,
    attachments,
  });

  if (!result.ok) {
    return res.status(400).json(
      new ApiResponse(400, "Failed to send WhatsApp message", result.error || null, false)
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "WhatsApp message sent successfully", result.data || null));
});

import fs from 'fs';
const isValidFolderId = (value: any): value is string =>
  typeof value === 'string' && /^[0-9]+$/.test(value);

export const uploadFileToHubSpotController = catchAsync(
  async (req: Request, res: Response) => {
    const file = req.file;

    if (!file) {
      return res.status(400).json(
        new ApiResponse(400, 'File is required.', null, false)
      );
    }

    // ---------------------------
    // Read file buffer
    // ---------------------------
    let fileBuffer: Buffer;

    if (file.buffer) {
      fileBuffer = file.buffer;
    } else if (file.path) {
      if (!fs.existsSync(file.path)) {
        return res.status(500).json(
          new ApiResponse(500, 'Uploaded file not found.', null, false)
        );
      }
      fileBuffer = fs.readFileSync(file.path);
    } else {
      return res.status(500).json(
        new ApiResponse(500, 'Unable to read file buffer.', null, false)
      );
    }

    // ---------------------------
    // folderId (REQUIRED)
    // ---------------------------
    const folderId = String(req.body.folderId ?? '').trim();

    if (!isValidFolderId(folderId)) {
      return res.status(400).json(
        new ApiResponse(
          400,
          'Invalid folderId. Must be a numeric string.',
          { folderId },
          false
        )
      );
    }

    // ---------------------------
    // Optional access
    // ---------------------------
    const access = req.body.access;
    const uploadOptions: {
      access?: 'PRIVATE' | 'PUBLIC_INDEXABLE' | 'PUBLIC_NOT_INDEXABLE';
      folderId: string;
    } = {
      folderId,
    };

    if (
      access &&
      ['PRIVATE', 'PUBLIC_INDEXABLE', 'PUBLIC_NOT_INDEXABLE'].includes(access)
    ) {
      uploadOptions.access = access;
    }

    // ---------------------------
    // File name
    // ---------------------------
    const fileName =
      req.body.fileName || file.originalname || file.filename;

    // ---------------------------
    // Upload to HubSpot
    // ---------------------------
    const result = await uploadFileToHubSpot(
      fileBuffer,
      fileName,
      file.mimetype || 'application/octet-stream',
      uploadOptions
    );

    if (!result.ok) {
      // Delete file if upload failed and file was saved to disk
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (deleteError) {
          console.error('Error deleting file after failed upload:', deleteError);
        }
      }
      return res.status(500).json(
        new ApiResponse(
          500,
          'Failed to upload file to HubSpot',
          result.error,
          false
        )
      );
    }

    // ---------------------------
    // Delete file from local storage after successful upload
    // ---------------------------
    if (file.path && fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
      } catch (deleteError) {
        console.error('Error deleting file after successful upload:', deleteError);
        // Don't fail the request if file deletion fails, just log it
      }
    }

    return res.status(201).json(
      new ApiResponse(201, 'File uploaded successfully', {
        fileId: result.fileId,
        folderId,
        fileName,
      })
    );
  }
);







