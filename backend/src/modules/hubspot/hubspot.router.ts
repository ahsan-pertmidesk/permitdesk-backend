import { Router } from "express";
import {fetchHubSpotContactByEmail,getAllTicketsWithAssociations,getPaymentsByContact,
    getHubspotInboxes,fetchAllContact,fetchAllWhatsConversation,fetchAllEmailAssociations,fetchTicketById,fetchWhatsAppAndSMSByContactId
    ,fetchAllDocumentsByContactId,fetchContactAssociations,createTicketsForContact,createContacts,createTaskController,createNoteController,
    sendTicketEmailController,sendTicketWhatsAppController,uploadFileToHubSpotController
} from "./hubspot.controller"
import { fileUploader } from "../../middlewares/multer";
const routers= Router();
routers.get("/contact", fetchAllContact);
routers.get("/contact/:id/whats-app-conversation", fetchAllWhatsConversation );
routers.get("/contact/:id/email-associations", fetchAllEmailAssociations );
routers.get("/contact/:id/document-associations", fetchAllDocumentsByContactId );
routers.get("/contact/:id/associations",fetchContactAssociations);
routers.get("/getInboxes", getHubspotInboxes);
routers.get("/:email", fetchHubSpotContactByEmail);
routers.get("/contact/:id/tickets", getAllTicketsWithAssociations);
routers.get("/ticket/:id", fetchTicketById); 
routers.get("/contacts/:id/messages", fetchWhatsAppAndSMSByContactId);
routers.get("/payment/:id", getPaymentsByContact);
routers.post("/contact/:id/ticket", createTicketsForContact);
routers.post('/contact/tickets/:ticketId/tasks', createTaskController)
routers.post('/contact/tickets/:ticketId/notes', createNoteController )
routers.post('/contact/tickets/:ticketId/email', sendTicketEmailController )
routers.post('/contact/tickets/:ticketId/whatsapp', sendTicketWhatsAppController )

routers.post("/contact/:id/ticket", createTicketsForContact);
routers.post("/contact", createContacts);
routers.post("/upload-file", fileUploader("file", "files"), uploadFileToHubSpotController);
    
export default routers;
   