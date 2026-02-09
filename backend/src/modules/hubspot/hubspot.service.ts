import axios from "axios";
import { Client } from "@hubspot/api-client";
import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts";
import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/tickets";
import {HUBSPOT_ACCESS_TOKEN,HUBSPOT_BASE_URL,CONTACT_OWNER,FOLDER_ID} from "../../config/variables"
import FormData from "form-data";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import {
  AWS_REGION,
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  BUCKET_NAME,
} from "../../config/variables";

const hubspotClient = new Client({
  accessToken: HUBSPOT_ACCESS_TOKEN ,
});

/**
 * Shared headers object for all HubSpot API requests
 */
const hubspotHeaders = {
  Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

export async function callHubspotGetApi(url: string, params?: Record<string, any>) {
  const response = await axios.get(url, {
    headers: hubspotHeaders,
    ...(params && { params }),
  });
  return response.data;
}

/**
 * Shared function for all HubSpot POST API requests
 */
export async function callHubspotCreateApi(url: string, data?: any) {
  const response = await axios.post(url, data, {
    headers: hubspotHeaders,
  });
  return response.data;
}

/**
 * Shared function for all HubSpot PATCH API requests
 */
export async function callHubspotPatchApi(url: string, data?: any) {
  const response = await axios.patch(url, data, {
    headers: hubspotHeaders,
  });
  return response.data;
}

/**
 * Normalize phone number for comparison
 * Removes 'whatsapp:' prefix and non-numeric characters
 */
function normalizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(/^whatsapp:/, "").replace(/[^0-9+]/g, "");
}

/**
 * Format phone number for WhatsApp (add whatsapp: prefix)
 */
function formatWhatsAppNumber(phoneNumber: string): string {
  const normalized = normalizePhoneNumber(phoneNumber);
  return normalized.startsWith("whatsapp:") ? normalized : `whatsapp:${normalized}`;
}

/**
 * Find contact in HubSpot by WhatsApp phone number
 * Returns contact with owner information
 */
export async function findContactByWhatsAppNumber(
  phoneNumber: string
): Promise<{ contactId: string; ownerId: string; ownerEmail: string; firstName: string; lastName: string } | null> {
  // MUST use WhatsApp-specific property (HubSpot adds hs_ prefix to custom properties)
  const whatsappProperty = process.env.HUBSPOT_WHATSAPP_PROPERTY || "hs_whatsapp_phone_number";
  
  try {
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    //console.log(`🔍 Searching HubSpot for contact with WhatsApp: ${normalizedNumber}`);
    //console.log(`📝 Using HubSpot property: ${whatsappProperty}`);

    // Search for contact by WhatsApp phone number
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: whatsappProperty,
              operator: FilterOperatorEnum.Eq,
              value: normalizedNumber,
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", whatsappProperty, "hubspot_owner_id", "email"],
      limit: 1,
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      const contact = searchResponse.results[0];
      const ownerId = contact.properties.hubspot_owner_id;

     

      if (!ownerId) {
        console.log(`⚠️  Contact found but no owner assigned: ${contact.id}`);
        return null;
      }

      // Get owner details to retrieve email
      const owner = await hubspotClient.crm.owners.ownersApi.getById(parseInt(ownerId));

      console.log(`✅ Owner: ${owner.email}`);

      return {
        contactId: contact.id,
        ownerId: ownerId,
        ownerEmail: owner.email || "",
        firstName: contact.properties.firstname || "",
        lastName: contact.properties.lastname || "",
      };
    }

    console.log(`❌ No contact found for WhatsApp: ${normalizedNumber}`);
    return null;
  } catch (error: any) {
    console.error("❌ Error finding contact in HubSpot:", error.message);
    if (error.body) {
      console.error("📄 HubSpot Error Body:", JSON.stringify(error.body, null, 2));
    }
    if (error.code === 400) {
      console.error("\n⚠️  PROPERTY ERROR - The property doesn't exist or isn't searchable!");
      console.error(`   Current property: ${whatsappProperty}`);
      console.error("\n   TO FIX THIS:");
      console.error("   1. Go to HubSpot → Settings → Properties → Contact Properties");
      console.error("   2. Create a new property:");
      console.error(`      - Name: ${whatsappProperty}`);
      console.error("      - Label: WhatsApp Phone Number");
      console.error("      - Field Type: Single-line text");
      console.error("   3. OR update HUBSPOT_WHATSAPP_PROPERTY in .env to match your existing property");
      console.error("\n   Alternatively, I can help you create the property via API.\n");
    }
    throw error;
  }
}

/**
 * Find owner's WhatsApp number from their contact record in HubSpot
 * Assuming owners also have contact records
 */
export async function getOwnerWhatsAppNumber(ownerEmail: string): Promise<string | null> {
  try {
    console.log(`🔍 Looking up WhatsApp number for owner: ${ownerEmail}`);

    // MUST use WhatsApp-specific property (HubSpot adds hs_ prefix to custom properties)
    const whatsappProperty = process.env.HUBSPOT_WHATSAPP_PROPERTY || "hs_whatsapp_phone_number";

    // Search for contact by email (assuming owner has a contact record)
    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: FilterOperatorEnum.Eq,
              value: ownerEmail,
            },
          ],
        },
      ],
      properties: [whatsappProperty, "email", "firstname", "lastname"],
      limit: 1,
    });

    if (searchResponse.results && searchResponse.results.length > 0) {
      const ownerContact = searchResponse.results[0];
      const whatsappNumber = ownerContact.properties[whatsappProperty];

      console.log(`📋 Owner contact: ${ownerContact.properties.firstname} ${ownerContact.properties.lastname}`);
      console.log(`   WhatsApp: ${whatsappNumber || 'NOT SET'}`);

      if (whatsappNumber) {
        const formattedNumber = formatWhatsAppNumber(whatsappNumber);
        console.log(`✅ Found owner WhatsApp: ${formattedNumber}`);
        return formattedNumber;
      }
      
      console.log(`⚠️  Owner contact found but WhatsApp number NOT SET in ${whatsappProperty}`);
    } else {
      console.log(`⚠️  No contact record found for owner: ${ownerEmail}`);
    }

    return null;
  } catch (error: any) {
    console.error("❌ Error getting owner WhatsApp number:", error.message);
    if (error.body) {
      console.error("📄 HubSpot Error Body:", JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}

/**
 * Create a ticket in HubSpot
 */
export async function createTicketForContact(
  contactId: string,
  ownerId: string,
  conversationSid: string,
  customerMessage: string
): Promise<string> {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    const conversationLink = `${frontendUrl}?sid=${conversationSid}`;

    console.log(`🎫 Creating ticket for contact: ${contactId}`);

    const ticketResponse = await hubspotClient.crm.tickets.basicApi.create({
      properties: {
        subject: "New WhatsApp Conversation",
        content: `Customer initiated a WhatsApp conversation.\n\nFirst message: ${customerMessage}\n\nConversation link: ${conversationLink}`,
        hs_pipeline: process.env.HUBSPOT_DEFAULT_PIPELINE_ID || "0",
        hs_pipeline_stage: process.env.HUBSPOT_DEFAULT_STAGE_ID || "1",
        hubspot_owner_id: ownerId,
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
              associationTypeId: 16, // Contact to Ticket association
            },
          ],
        },
      ],
    });

    console.log(`✅ Created ticket: ${ticketResponse.id}`);
    return ticketResponse.id;
  } catch (error) {
    console.error("Error creating ticket in HubSpot:", error);
    throw error;
  }
}

/**
 * Check if a ticket already exists for a conversation
 * Search tickets by conversation link in the content
 */
export async function checkExistingTicketForConversation(
  conversationSid: string
): Promise<boolean> {
  try {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3001";
    const conversationLink = `${frontendUrl}?sid=${conversationSid}`;

    const searchResponse = await hubspotClient.crm.tickets.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "content",
              operator: "CONTAINS_TOKEN" as any, // HubSpot API limitation
              value: conversationSid,
            },
          ],
        },
      ],
      limit: 1,
    });

    const exists = searchResponse.results && searchResponse.results.length > 0;
    console.log(`🎫 Ticket exists for conversation ${conversationSid}: ${exists}`);
    
    return exists;
  } catch (error) {
    console.error("Error checking existing ticket:", error);
    return false;
  }
}



/**
 * Fetch contact details from HubSpot using Email
 * Returns name, email, phone, owner info & lifecycle stage
 */
export async function getContactByEmail(email: string): Promise<{
  contactId: string;
  firstname: string | null;
  lastname: string | null;
  phone: string | null;
  email: string | null;
  lifecycleStage: string | null;
  ownerId: string | null;
  ownerEmail: string | null;
} | null> {
  try {
    console.log(`🔍 Searching HubSpot for contact by email: ${email}`);

    const searchResponse = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: FilterOperatorEnum.Eq,
              value: email,
            },
          ],
        },
      ],
      properties: [
        "firstname",
        "lastname",
        "email",
        "phone",
        "hubspot_owner_id",
        "lifecyclestage",
      ],
      limit: 1,
    });

    if (!searchResponse.results?.length) {
      console.log(`❌ No contact found for: ${email}`);
      return null;
    }

    const contact = searchResponse.results[0];
    const props = contact.properties;

    console.log(`✅ Contact found: ${contact.id}`);
    console.log(`   Name: ${props.firstname} ${props.lastname}`);
    console.log(`   Owner: ${props.hubspot_owner_id || "NO OWNER"}`);

    let ownerEmail: string | null = null;
    if (props.hubspot_owner_id) {
      const owner = await hubspotClient.crm.owners.ownersApi.getById(
        Number(props.hubspot_owner_id)
      );
      ownerEmail = owner.email || null;
    }

    return {
      contactId: contact.id,
      firstname: props.firstname || null,
      lastname: props.lastname || null,
      phone: props.phone || null,
      email: props.email || null,
      lifecycleStage: props.lifecyclestage || null,
      ownerId: props.hubspot_owner_id || null,
      ownerEmail,
    };

  } catch (error: any) {
    console.error("❌ Error fetching contact by email:", error.message);
    if (error.body) {
      console.error("📄 HubSpot Error Body:", JSON.stringify(error.body, null, 2));
    }
    throw error;
  }
}





export async function getTicketsWithAssociations(contactId: string) {
  try {
    const ticketAssocUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/tickets?limit=100`;
    const ticketAssocRes = await callHubspotGetApi(ticketAssocUrl);

    const ticketIds = ticketAssocRes.results.map((r: any) => r.toObjectId);
    if (!ticketIds.length) return [];

    const tickets: any[] = [];

    // Get all engagements from the contact (emails, notes, tasks)
    const contactEngagements = await getEngagementsForContact(contactId);

    for (const ticketId of ticketIds) {
      const ticketUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/tickets/${ticketId}?properties=subject,content,hs_pipeline_stage,createdate,lastmodifieddate`;
      const ticketRes = await callHubspotGetApi(ticketUrl);

      const ticket = ticketRes;

      // Attachments still fetched by ticket
      const attachments = await getAttachmentsForTicket(ticketId);

      tickets.push({
        ticketId: ticket.id,
        subject: ticket.properties.subject || '',
        content: ticket.properties.content || '',
        status: ticket.properties.hs_pipeline_stage || '',
        createdate: ticket.properties.createdate || '',
        lastmodifieddate: ticket.properties.lastmodifieddate || '',
        emails: contactEngagements.emails,
        notes: contactEngagements.notes,
        tasks: contactEngagements.tasks,
        attachments,
      });
    }

    return tickets;
  } catch (err: any) {
    console.error('Error fetching tickets with associations:', JSON.stringify(err.response?.data || err.message, null, 2));
    throw err;
  }
}

export async function getEngagementsForContact(contactId: string) {
  const url = `${HUBSPOT_BASE_URL}/engagements/v1/engagements/associated/contact/${contactId}/paged?limit=100`;
  const res = await callHubspotGetApi(url);

  const emails: any[] = [];
  const notes: any[] = [];
  const tasks: any[] = [];

  for (const item of res.results || []) {
    const type = item.engagement.type;
    const meta = item.metadata || {};
      
    const id = item.engagement.id;
    const createdAt = item.engagement.createdAt;

    if (type === 'EMAIL') {
      emails.push({
        id,
        subject: meta.subject || '',
        from: meta.from?.email || '',
        to: meta.to?.map((x: any) => x.email).join(', ') || '',
        body: meta.text || meta.html || '',
        createdAt,
        hubspotUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/record/0-49/${id}`,
      });
    } else if (type === 'NOTE') {
      notes.push({
        id,
        body: meta.body || '',
        createdAt,
        hubspotUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/record/0-4/${id}`,
      });
    } else if (type === 'TASK') {
      tasks.push({
        id,
        subject: meta.subject || '',
        status: meta.status || '',
        priority: meta.priority || '',
        dueDate: meta.forObjectType || '',
        createdAt,
        hubspotUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/record/0-27/${id}`,
      });
    }
  }

  return { emails, notes, tasks };
}

export async function getAttachmentsForTicket(ticketId: string) {
  const url = `https://api.hubapi.com/crm/v4/objects/tickets/${ticketId}/associations/files?limit=100`;

  const res = await callHubspotGetApi(url);

  const ids = res.results?.map((r: any) => r.toObjectId) || [];
  if (!ids.length) return [];

  const attachments: any[] = [];

  for (const id of ids) {
      const detailsUrl = `https://api.hubapi.com/crm/v3/objects/files/${id}?properties=name,url,createdAt`;
      const fileRes = await callHubspotGetApi(detailsUrl);

    const file = fileRes;
    attachments.push({
      id: file.id,
      filename: file.properties.name,
      url: file.properties.url,
      createdAt: file.properties.createdAt,
      hubspotUrl: `https://app.hubspot.com/files/${process.env.HUBSPOT_PORTAL_ID}/file/${file.id}`,
    });
  }

  return attachments;
}





export async function getPaymentsByContactId(contactId: number) {
  try {
    console.log(`💳 Fetching payments for contact: ${contactId}`);

    // Step 1: Fetch associations → Contact → Payments
    const assocRes = await callHubspotGetApi(
      `${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/hs_payment`
    );

    const associations = assocRes?.results || [];
    if (associations.length === 0) {
      console.log("⚠️ No payments found for this contact");
      return [];
    }

    // Step 2: Fetch payment details
    const payments = await Promise.all(
      associations.map(async (item: any) => {
        const paymentId = item.toObjectId;

        const paymentResp = await callHubspotGetApi(
          `${HUBSPOT_BASE_URL}/crm/v3/objects/hs_payment/${paymentId}?properties=hs_amount,hs_payment_date,hs_status,hs_transaction_id,hs_payment_method,hs_payment_notes`
        );

        const p = paymentResp.properties;

        return {
          paymentId,
          amount: p.hs_amount || null,
          paymentDate: p.hs_payment_date || null,
          status: p.hs_status || null,
          transactionId: p.hs_transaction_id || null,
          paymentMethod: p.hs_payment_method || null,
          paymentNotes: p.hs_payment_notes || null
        };
      })
    );

    return payments;
  } catch (error: any) {
    console.error("❌ Error fetching payments:", error.response?.data || error.message);
    throw error;
  }
}


export async function getHubspotInboxesService() {
   try {
     let threadId = "9128454899"
     const response = await callHubspotGetApi(
       `https://api.hubapi.com/conversations/v3/conversations/threads/${threadId}/messages`
     );

     return response.results || [];
  } catch (error: any) {
    console.error('Error fetching HubSpot thread messages:', error.response?.data || error.message);
    throw new Error('Failed to fetch HubSpot thread messages');
  }
}


export async function getHubspotThreadsByInboxService(inboxId: string) {
  try {
    let inboxId = "1311469280"
     const response = await callHubspotGetApi(
       `https://api.hubapi.com/conversations/v3/conversations/threads?inboxId=${inboxId}`
     );

     return response.results || [];
  } catch (error: any) {
    console.error('Error fetching HubSpot threads:', error.response?.data || error.message);
    throw new Error('Failed to fetch HubSpot threads');
  }
}



 export async function getAllContacts() {
  let allContacts = [];
  let hasMore = true;
  let after = undefined;

  try {
    while (hasMore) {
     let url:any = `https://api.hubapi.com/crm/v3/objects/contacts?limit=100${after ? `&after=${after}` : ''}`;
      let response = await callHubspotGetApi(url);

      const contacts = response.results || [];
      allContacts.push(...contacts);

      after = response.paging?.next?.after;
      hasMore = Boolean(after);
    }

    console.log(`Fetched ${allContacts.length} contacts`);
    return allContacts;
  } catch (error) {
    throw error;
  }
}


interface HubspotMediaFile {
  fileUrl: string;
  fileType: string;
  fileName?: string;
}

interface HubspotCommunicationDetails {
  hs_communication_body?: string;
  hs_communication_channel_type?: string;
  hs_createdate?: string;
  hs_lastmodifieddate?: string;
  hs_object_id?: string;
  hs_timestamp?: string;
  hs_message_status?: string;
  hs_sender_identifier?: string;
  hs_recipient_identifier?: string;
  hs_thread_id?: string;
  hs_attachment_urls?: string[];
}

interface HubspotAssociationType {
  category: string;
  typeId: number;
  label?: string | null;
}

interface HubspotMessageItem {
  toObjectId: number;
  associationTypes: HubspotAssociationType[];
  details: HubspotCommunicationDetails | null;
  mediaFiles?: HubspotMediaFile[];
}

interface HubspotMessageResponse {
  count: number;
  items: HubspotMessageItem[];
}

export async function getAllWhatsConversation(contactId: string): Promise<HubspotMessageResponse> {
  try {
    const assocUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/communications?limit=100`;

    const assocRes = await callHubspotGetApi(assocUrl);

    const associations = assocRes?.results || [];
    if (!associations.length) {
      return { count: 0, items: [] };
    }

    const items: HubspotMessageItem[] = await Promise.all(
      associations.map(async (assoc: any) => {
        const communicationId = assoc.toObjectId;
        const detailUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/communications/${communicationId}?properties=hs_communication_body,hs_communication_channel_type,hs_createdate,hs_lastmodifieddate,hs_object_id,hs_timestamp,hs_message_status,hs_sender_identifier,hs_recipient_identifier,hs_thread_id,hs_attachment_urls`;

        try {
          const detailRes = await callHubspotGetApi(detailUrl);

          const properties = detailRes.properties || {};

          const mediaFiles: HubspotMediaFile[] = [];
          if (properties.hs_attachment_urls) {
            const urls = Array.isArray(properties.hs_attachment_urls)
              ? properties.hs_attachment_urls
              : [properties.hs_attachment_urls];
            urls.forEach((url: string) => {
              const fileType = url.match(/\.(jpg|jpeg|png|mp4|pdf|docx|mp3|wav)$/i)?.[1] || "unknown";
              mediaFiles.push({
                fileUrl: url,
                fileType,
                fileName: url.split("/").pop(),
              });
            });
          }

          return {
            toObjectId: communicationId,
            associationTypes: assoc.associationTypes || [],
            details: {
              hs_communication_body: properties.hs_communication_body,
              hs_communication_channel_type: properties.hs_communication_channel_type,
              hs_createdate: properties.hs_createdate,
              hs_lastmodifieddate: properties.hs_lastmodifieddate,
              hs_object_id: properties.hs_object_id,
              hs_timestamp: properties.hs_timestamp,
              hs_message_status: properties.hs_message_status,
              hs_sender_identifier: properties.hs_sender_identifier,
              hs_recipient_identifier: properties.hs_recipient_identifier,
              hs_thread_id: properties.hs_thread_id,
              hs_attachment_urls: properties.hs_attachment_urls
                ? Array.isArray(properties.hs_attachment_urls)
                  ? properties.hs_attachment_urls
                  : [properties.hs_attachment_urls]
                : [],
            },
            mediaFiles,
          };
        } catch (error: any) {
          console.error(`Failed to fetch communication ${communicationId}:`, error.message);
          return {
            toObjectId: communicationId,
            associationTypes: assoc.associationTypes || [],
            details: null,
          };
        }
      })
    );

    return { count: items.length, items };
  } catch (error: any) {
    console.error("🚀 ~ getAllWhatsConversation ~ Error:", error.response?.data || error.message);
    throw new Error(error.response?.data || error.message);
  }
}




interface HubspotAssociation {
  toObjectId: string;
}

interface HubspotEngagement {
  id: string;
  properties: {
    hs_email_subject?: string;
    hs_email_direction?: string;
    hs_email_status?: string;
    hs_email_from?: string;
    hs_email_to?: string;
    hs_createdate?: string;
  };
}



export async function getAllEmailAssociations(contactId: string) {
  try {
    const assocUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/emails?limit=100`;
    const assocRes = await callHubspotGetApi(assocUrl);

    const emailIds = assocRes.results.map((r: any) => r.toObjectId);
    if (!emailIds.length) return [];

    const emails: any[] = [];

    for (const emailId of emailIds) {
      // Step 1: Fetch email object properties (subject, direction, etc.)
      const emailDetailsUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/emails/${emailId}?properties=hs_email_subject,hs_email_direction,hs_email_status,hs_email_from,hs_email_to,hs_createdate`;
      const emailDetailsRes = await callHubspotGetApi(emailDetailsUrl);

      const email = emailDetailsRes;

      // Step 2: Fetch engagement details to get the email body
      const engagementUrl = `${HUBSPOT_BASE_URL}/engagements/v1/engagements/${emailId}`;
      try {
        const engagementRes = await callHubspotGetApi(engagementUrl);

        const engagement = engagementRes;
        const body = engagement.metadata?.html || engagement.metadata?.text || null;

        emails.push({
          id: email.id,
          subject: email.properties.hs_email_subject,
          direction: email.properties.hs_email_direction,
          status: email.properties.hs_email_status,
          from: email.properties.hs_email_from,
          to: email.properties.hs_email_to,
          createdAt: email.properties.hs_createdate,
          body,
          hubspotUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/record/0-49/${email.id}`,
        });
      } catch {
        emails.push({
          ...email.properties,
          id: email.id,
          body: null,
          hubspotUrl: `https://app.hubspot.com/contacts/${process.env.HUBSPOT_PORTAL_ID}/record/0-49/${email.id}`,
        });
      }
    }

    return emails;
  } catch (err: any) {
    console.error('Error fetching email associations:', JSON.stringify(err.response?.data || err.message, null, 2));
    throw err;
  }
}

export async function getTicketById(ticketId: string) {
  try {
    const ticketResp = await callHubspotGetApi(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/tickets/${ticketId}?properties=subject,content,hs_pipeline_stage,hubspot_owner_id,hs_lastmodifieddate`
    );

    const p = ticketResp.properties;
    const ownerId = p.hubspot_owner_id || null;
    let owner = null;

    if (ownerId) {
      try {
        const ownerResp = await callHubspotGetApi(
          `${HUBSPOT_BASE_URL}/crm/v3/owners/${ownerId}`
        );

        const o = ownerResp;
        owner = {
          id: ownerId,
          email: o.email || null,
          firstName: o.firstName || null,
          lastName: o.lastName || null,
        };
      } catch {
        owner = { id: ownerId, email: null };
      }
    }

    const ticket = {
      ticketId,
      subject: p.subject || null,
      status: p.hs_pipeline_stage || null,
      description: p.content || null,
      ownerId,
      lastUpdated: p.hs_lastmodifieddate || null,
      owner,
    };

    return ticket;
  } catch (error: any) {
    console.error("🚀 ~ getTicketById ~ Error:", error.response?.data || error.message);
    throw error.response?.data || error.message;
  }
}



export async function getAllWhatsAppAndSMSByContactId(contactId: string) {
  try {
    // 1️⃣ Fetch associated engagements (emails, calls, messages, etc.)
    const assocUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/communications?limit=100`;

    const assocRes = await callHubspotGetApi(assocUrl);

    const associations = assocRes?.results || [];
    if (!associations.length) return [];

    // 2️⃣ Fetch each engagement detail and filter for SMS/WhatsApp
    const messages = await Promise.all(
      associations.map(async (a: any) => {
        const messageId = a.toObjectId;
        const messageUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/communications/${messageId}?properties=hs_communication_channel_type,hs_timestamp,hs_communication_body,hs_direction,hs_status,hs_attachment_ids,hs_sender_email,hs_sender_number,hs_recipient_number`;

        const msgRes = await callHubspotGetApi(messageUrl);

        const m = msgRes.properties;
        const channel = m.hs_communication_channel_type;

        if (channel !== "WHATSAPP" && channel !== "SMS") return null;

        // 3️⃣ Handle media attachments if exist
        let attachments: any[] = [];
        if (m.hs_attachment_ids) {
          const ids = m.hs_attachment_ids.split(";");
          attachments = await Promise.all(
            ids.map(async (id: string) => {
              try {
                const fileRes = await callHubspotGetApi(
                  `${HUBSPOT_BASE_URL}/files/v3/files/${id}`
                );
                return {
                  id,
                  name: fileRes.name,
                  url: fileRes.url,
                  type: fileRes.extension,
                };
              } catch {
                return { id, error: "Failed to fetch attachment" };
              }
            })
          );
        }

        return {
          messageId,
          type: channel,
          content: m.hs_communication_body || null,
          direction: m.hs_direction || null,
          status: m.hs_status || null,
          senderEmail: m.hs_sender_email || null,
          senderNumber: m.hs_sender_number || null,
          recipientNumber: m.hs_recipient_number || null,
          timestamp: m.hs_timestamp || null,
          attachments,
        };
      })
    );

    // 4️⃣ Clean up null results
    return messages.filter(Boolean);
  } catch (error: any) {
    console.error("🚀 ~ getAllWhatsAppAndSMSByContactId ~ Error:", error.response?.data || error.message);
    throw error.response?.data || error.message;
  }
}



export async function getAllDocumentsByContactId(contactId: string) {
  try {
    // 1️⃣ Get all email + communication associations
    const [emailAssocRes, commAssocRes] = await Promise.all([
      callHubspotGetApi(`${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/emails?limit=100`),
      callHubspotGetApi(`${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/communications?limit=100`),
    ]);

    const emailAssociations = emailAssocRes?.results || [];
    const commAssociations = commAssocRes?.results || [];

    if (!emailAssociations.length && !commAssociations.length) return [];

    const allAssociations = [
      ...emailAssociations.map((a: any) => ({ id: a.toObjectId, type: "EMAIL" })),
      ...commAssociations.map((a: any) => ({ id: a.toObjectId, type: "COMMUNICATION" })),
    ];

    // 2️⃣ Fetch each email/communication detail to find attachments
    const documents = await Promise.all(
      allAssociations.map(async (assoc) => {
        try {
          if (assoc.type === "EMAIL") {
            const emailUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/emails/${assoc.id}?properties=hs_email_subject,hs_attachment_ids,hs_createdate`;
            const emailRes = await callHubspotGetApi(emailUrl);

            const e = emailRes.properties;
            let attachments: any[] = [];

            if (e.hs_attachment_ids) {
              const ids = e.hs_attachment_ids.split(";").filter(Boolean);
              attachments = await Promise.all(
                ids.map(async (id: string) => {
                  try {
                    const fileRes = await callHubspotGetApi(`${HUBSPOT_BASE_URL}/files/v3/files/${id}`);
                    return {
                      id,
                      name: fileRes.name,
                      url: fileRes.url,
                      type: fileRes.extension,
                      source: "EMAIL",
                      createdAt: fileRes.createdAt,
                    };
                  } catch {
                    return { id, source: "EMAIL", error: "Failed to fetch attachment" };
                  }
                })
              );
            }

            return attachments;
          }

          // For communication threads (WhatsApp / SMS)
          const commUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/communications/${assoc.id}?properties=hs_communication_channel_type,hs_attachment_ids,hs_communication_body,hs_timestamp`;
          const commRes = await callHubspotGetApi(commUrl);

          const c = commRes.properties;
          const channel = c.hs_communication_channel_type;
          if (channel !== "WHATSAPP" && channel !== "SMS") return [];

          let attachments: any[] = [];
          if (c.hs_attachment_ids) {
            const ids = c.hs_attachment_ids.split(";").filter(Boolean);
            attachments = await Promise.all(
              ids.map(async (id: string) => {
                try {
                  const fileRes = await callHubspotGetApi(`${HUBSPOT_BASE_URL}/files/v3/files/${id}`);
                  return {
                    id,
                    name: fileRes.name,
                    url: fileRes.url,
                    type: fileRes.extension,
                    source: channel,
                    createdAt: fileRes.createdAt,
                  };
                } catch {
                  return { id, source: channel, error: "Failed to fetch attachment" };
                }
              })
            );
          }

          return attachments;
        } catch (e: any) {
          console.error(`Failed fetching for ${assoc.type} ${assoc.id}`, e.response?.data || e.message);
          return [];
        }
      })
    );

    // 3️⃣ Flatten and clean empty arrays
    const allDocs = documents.flat().filter(Boolean);
    return allDocs;
  } catch (error: any) {
    console.error("🚀 ~ getAllDocumentsByContactId ~ Error:", error.response?.data || error.message);
    throw error.response?.data || error.message;
  }
}


const associationTypes = [
  "tickets",
  "deals",
  "notes",
  "emails",
  "calls",
  "tasks",
  "meetings",
  "communications",
];

export async function getContactAssociations(contactId: string) {
  try {
    const results = await Promise.all(
      associationTypes.map(async (type) => {
        try {
          const assocUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/contacts/${contactId}/associations/${type}?limit=50`;
          const assocRes = await callHubspotGetApi(assocUrl);
          const associations = assocRes?.results || [];
          if (!associations.length) return { type, count: 0, items: [] };

          const details = await Promise.all(
            associations.map(async (a: any) => {
              const id = a.toObjectId;

              // Determine which properties to fetch depending on the type
              let props = "";
              switch (type) {
                case "tickets":
                  props =
                    "subject,content,hs_pipeline_stage,hubspot_owner_id,hs_lastmodifieddate";
                  break;
                case "emails":
                  props =
                    "hs_email_subject,hs_email_direction,hs_email_status,hs_email_sent_datetime";
                  break;
                case "communications":
                  props =
                    "hs_communication_channel_type,hs_timestamp,hs_communication_body";
                  break;
                case "notes":
                  props = "hs_note_body,hs_lastmodifieddate";
                  break;
                default:
                  props = "hs_lastmodifieddate";
              }

              try {
                const detailUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/${type}/${id}?properties=${props}`;
                const detailRes = await callHubspotGetApi(detailUrl);
                const p = detailRes.properties;
                return {
                  toObjectId: id,
                  associationTypes: a.associationTypes,
                  details: p,
                };
              } catch {
                return { toObjectId: id, associationTypes: a.associationTypes };
              }
            })
          );

          return { type, count: details.length, items: details };
        } catch (e: any) {
          console.error(`❌ Failed to fetch ${type}:`, e.response?.data || e.message);
          return { type, error: e.response?.data?.message || e.message };
        }
      })
    );

    const structured = results.reduce((acc: any, curr) => {
      acc[curr.type] = curr.error
        ? { error: curr.error }
        : { count: curr.count, items: curr.items };
      return acc;
    }, {});  

    return {
      contactId,
      totalCategories: associationTypes.length,
      associations: structured,
    };
  } catch (error: any) {
    console.error("🚀 ~ getContactAssociations ~ Error:", error.response?.data || error.message);
    throw error.response?.data || error.message;
  }
}




export async function getTicketWithEmails(ticketId: string) {
  try {
    // 1️⃣ Fetch ticket details
    const ticketUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/tickets/${ticketId}?properties=subject,content,hs_pipeline_stage,createdate,lastmodifieddate`;
    const ticketRes = await callHubspotGetApi(ticketUrl);

    const ticket = ticketRes;

    // 2️⃣ Fetch all associated email engagements
    const emails = await getEmailsForTicket(ticketId);

    // 3️⃣ Combine results
    return {
        ticketId: ticket.id,
        subject: ticket.properties.subject || '',
        content: ticket.properties.content || '',
        status: ticket.properties.hs_pipeline_stage || '',
        createdate: ticket.properties.createdate || '',
        lastmodifieddate: ticket.properties.lastmodifieddate || '',
        emails,
      }
  } catch (err: any) {
    console.error('Error fetching ticket with emails:', err.response?.data || err.message);
    throw err;
  }
}

/* ---------------------- Fetch Emails ---------------------- */

interface InlineAttachment {
  id: string
  name: string
  publicUrl: string
  preview: string
  source: 'inline'
  expiresIn?: string
}

interface ConvertResult {
  publicBody: string
  inlineAttachments: InlineAttachment[]
}

/* ---------------------- Main Email Fetch Function ---------------------- */
async function getEmailsForTicket(ticketId: string) {
  try {
    const url = `${HUBSPOT_BASE_URL}/engagements/v1/engagements/associated/ticket/${ticketId}/paged?limit=100`

    const res = await callHubspotGetApi(url)

    const results = res?.results || []
    const emailEngagements = results.filter(
      (e: any) => e.engagement?.type === 'EMAIL'
    )

    const emails = await Promise.all(
      emailEngagements.map(async (email: any) => {
        const meta = email.metadata || {}
        const id = email.engagement?.id
        const htmlBody = meta.html || ''
        const textBody = htmlBody.replace(/<[^>]+>/g, '').trim() || meta.text || ''

        // Convert inline images
        const { publicBody, inlineAttachments } = await convertInlineImagesToPublic(htmlBody)
        const attachments = await Promise.all(
          inlineAttachments.map(async (element: any) => {
            const url = await convertImagesURLToPublicURL(element.id)
            return {
              id: element.id,
              url,
            }
          })
        )

        return {
          id,
          subject: meta.subject || '',
          from: meta.from?.email || '',
          to: Array.isArray(meta.to)
            ? meta.to.map((t: any) => t.email).join(', ')
            : '',
          htmlBody,
          textBody,
          createdAt: email.engagement?.createdAt || null,
          attachments: attachments.filter(Boolean),
        }
      })
    )

    return emails
  } catch (err: any) {
    console.error(
      'Error fetching emails for ticket:',
      err.response?.data || err.message
    )
    return []
  }
}


/* ---------------------- Inline Image Conversion ---------------------- */
async function convertInlineImagesToPublic(
  htmlBody: string
): Promise<ConvertResult> {
  console.log("🚀 ~ convertInlineImagesToPublic ~ htmlBody:", htmlBody)
  if (!htmlBody)
    return { publicBody: htmlBody, inlineAttachments: [] }

  const regex =
    /https:\/\/[^"]*\/filemanager\/api\/v2\/files\/(\d+)\/signed-url-redirect\?portalId=\d+/g
  const matches = [...htmlBody.matchAll(regex)]
  if (matches.length === 0)
    return { publicBody: htmlBody, inlineAttachments: [] }

  const attachments: InlineAttachment[] = []

  for (const match of matches) {
    const fullMatchedUrl = match[0]
    const fileId = match[1]

    try {
      const fileMetaUrl = `${HUBSPOT_BASE_URL}/files/v3/files/${fileId}`

      const metaRes = await callHubspotGetApi(fileMetaUrl)

      const file = metaRes
      let publicUrl = file.url || file.defaultHostingUrl || ''
      const fileAccess = file.access

      if (
        fileAccess !== 'PUBLIC_INDEXABLE' &&
        fileAccess !== 'PUBLIC_NOT_INDEXABLE'
      ) {
        try {
          const makePublicUrl = `${HUBSPOT_BASE_URL}/files/v3/files/${fileId}`
          await axios.patch(
            makePublicUrl,
            { access: 'PUBLIC_NOT_INDEXABLE' },
            {
              headers: hubspotHeaders,
            }
          )

          const refreshedRes = await callHubspotGetApi(fileMetaUrl)
          publicUrl =
            refreshedRes.url ||
            refreshedRes.defaultHostingUrl ||
            ''
        } catch (err: any) {
        
        }
      }

      if (publicUrl) {
        htmlBody = htmlBody.replace(
          new RegExp(escapeRegExp(fullMatchedUrl), 'g'),                 
          publicUrl
        )
      }

      attachments.push({
        id: fileId,
        name: file.name || `inline-${fileId}`,
        publicUrl,
        preview: publicUrl,
        source: 'inline',
      })
    } catch (err: any) {
      console.error(
        `Error fetching HubSpot file ${fileId}:`,
        err.response?.data || err.message
      )
    }
  }

  return { publicBody: htmlBody, inlineAttachments: attachments }
}

function escapeRegExp(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}



function extractImageSrcFromHTML(html: string): string[] {
  const srcs: string[] = []
  if (!html) return srcs
  const regex = /<img[^>]+src="([^">]+)"/g
  let match
  while ((match = regex.exec(html)) !== null) {
    srcs.push(match[1])
  }
  return srcs
}

export async function getTicketTasksWithEmailsAndAttachments(ticketId: string) {
  try {
    const assocRes = await callHubspotGetApi(
      `${HUBSPOT_BASE_URL}/crm/v4/objects/tickets/${ticketId}/associations/tasks`
    )

    const taskResults = assocRes?.results || []
    if (!taskResults.length) return { tasks: [] }

    const taskIds = taskResults.map((r: any) => r.toObjectId)

    const tasksWithData = await Promise.all(
      taskIds.map(async (taskId: string) => {
        try {
          const taskRes = await callHubspotGetApi(
            `${HUBSPOT_BASE_URL}/crm/v3/objects/tasks/${taskId}?properties=hs_task_body,hs_task_status,hs_task_priority,hubspot_owner_id,hs_task_subject,hs_task_due_date`
          )

          const task = taskRes
          const props = task.properties || {}

          const plainTextDescription = props.hs_task_body
            ? props.hs_task_body.replace(/<[^>]*>/g, "").trim()
            : ""

          // Extract image URLs from HTML body
          const imgSrcs = extractImageSrcFromHTML(props.hs_task_body)

          // Convert HubSpot file URLs to public signed URLs if possible
          const attachments = await Promise.all(
            imgSrcs.map(async (src) => {
              const match = src.match(/files\/(\d+)\//)
              if (!match) return { url: src }
              const fileId = match[1]
              const url = await convertImagesURLToPublicURL(fileId)
              return { id: fileId, url }
            })
          )

          return {
            id: task.id,
            title: props.hs_task_subject || "",
            description: props.hs_task_body || "",
            plainTextDescription,
            dueDate: props.hs_task_due_date || null,
            ownerId: props.hubspot_owner_id || null,
            priority: props.hs_task_priority || "",
            status: props.hs_task_status || "",
            attachments: attachments.filter(Boolean),
          }
        } catch (err) {
          console.error(`Failed to fetch task ${taskId}:`, err)
          return null
        }
      })
    )

    return tasksWithData.filter(Boolean) 
  } catch (err: any) {
    console.error("Error fetching tasks:", err)
    return { ok: false, error: err.response?.data || err.message }
  }
}









export const getTicketNotesWithAttachments = async (ticketId: string) => {
  const associationsRes = await callHubspotGetApi(
    `https://api.hubapi.com/crm/v4/objects/tickets/${ticketId}/associations/notes?limit=100`
  )

  const noteIds = associationsRes.results.map((a: any) => a.toObjectId)
  if (!noteIds.length) return { notes: [] }

  const notesRes = await callHubspotCreateApi(
    `https://api.hubapi.com/crm/v3/objects/notes/batch/read`,
    {
      properties: ["hs_note_body", "hubspot_owner_id", "hs_attachment_ids"],
      inputs: noteIds.map((id: string) => ({ id })),
    }
  )

  const notes = notesRes.results

const notesWithAttachments = await Promise.all(
  notes.map(async (note: any) => {
    const attachmentIds = note.properties.hs_attachment_ids
      ? note.properties.hs_attachment_ids.split(";")
      : []

    const attachments = await Promise.all(
      attachmentIds.map(async (fileId: string) => {
        try {
          const fileRes = await callHubspotGetApi(
            `https://api.hubapi.com/files/v3/files/${fileId}`
          )
          return {
            id: fileId,
            name: fileRes.name,
            url: fileRes.url,
            size: fileRes.size,
          }
        } catch {
          return null
        }
      })
    )

    const plainTextBody = note.properties.hs_note_body
      ? note.properties.hs_note_body.replace(/<[^>]*>/g, "").trim()
      : ""

    // Correctly fetch public URLs
    const attachmentsUrl = await Promise.all(
      attachments
        .filter(Boolean)
        .map(async (element: any) => {
          const url = await convertImagesURLToPublicURL(element.id)
          return url
        })
    )

    return {
      id: note.id,
      body: plainTextBody,
      ownerId: note.properties.hubspot_owner_id,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      attachments: attachmentsUrl,
    }
  })
)
  return  notesWithAttachments 
}




export async function createHubSpotTicket(hubSpotContactId  : string, data: {
  subject: string
  name?: string
  content?: string
  hs_pipeline?: string
  hs_pipeline_stage?: string
  source_type?: string
//  category?: string
  priority?: string
}) {
  try {
 

    // Step 1: Create the ticket
    const createTicketRes = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/tickets`,
      {
        properties: {
          subject: data.subject,
          ...(data.name && { hs_ticket_name: data.name }),
          content: data.content || '',
          hs_pipeline: data.hs_pipeline || '0',
          hs_pipeline_stage: data.hs_pipeline_stage || '1',
          source_type: data.source_type || 'Customer Support',
        //  category: data.category || 'General',
          hs_ticket_priority: data.priority || 'MEDIUM',
        },
      }
    )

    const ticketId = createTicketRes.id;
    console.log(`✅ Ticket created: ${ticketId}`);

    // Step 3: Associate ticket with contact if contact exists
    if (hubSpotContactId) {
      console.log(`🔗 Associating ticket ${ticketId} with contact ${hubSpotContactId}...`);
      
      const associationTypeId = 16; // Contact to Ticket association
      const associateUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/tickets/${ticketId}/associations/contacts/${hubSpotContactId}`;

      try {
        await axios.put(
          associateUrl,
          [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: associationTypeId,
            },
          ],
          { headers: hubspotHeaders }
        );

        console.log(`✅ Associated ticket ${ticketId} with contact ${hubSpotContactId}`);
      } catch (assocErr: any) {
        console.error(`⚠️  Failed to associate ticket with contact:`, assocErr.response?.data || assocErr.message);
        // Continue even if association fails
      }
    }

    return { 
      ok: true, 
      ticketId: ticketId,
      ticket: createTicketRes, 
      contactId: hubSpotContactId || null 
    }
  } catch (err: any) {
    console.error('❌ Error creating HubSpot ticket:', err.response?.data || err.message)
    return { ok: false, error: err.response?.data || err.message }
  }
}


interface Attachment {
  id: string;
  url: string;
  name?: string;
  type?: string;
  size?: number;
}

interface FileResponse {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  [key: string]: any;
}

export async function getTicketAttachments(ticketId: string): Promise<Attachment[]> {
  try {
    // Get notes associated with the ticket
    const notesResponse = await callHubspotGetApi(
      `https://api.hubapi.com/crm/v4/objects/tickets/${ticketId}/associations/notes`
    );

    const noteIds = notesResponse.results.map((note: any) => note.toObjectId);
    
    // Get each note's details including attachments
    const allFiles: FileResponse[] = [];
    
    for (const noteId of noteIds) {
      const noteDetail = await callHubspotGetApi(
        `https://api.hubapi.com/crm/v3/objects/notes/${noteId}`,
        {
          properties: 'hs_attachment_ids'
        }
      );

      const attachmentIds = noteDetail.properties.hs_attachment_ids;
      
      if (attachmentIds) {
        const fileIds = attachmentIds.split(';');
        
        for (const fileId of fileIds) {
          try {
            const fileResponse = await callHubspotGetApi(
              `https://api.hubapi.com/files/v3/files/${fileId}`
            );
            allFiles.push(fileResponse);
          } catch (fileError) {
            console.error(`Error fetching file ${fileId}:`, fileError);
            // Continue with other files
          }
        }
      }
    }

    // Convert all file URLs to public URLs
    const attachments = await Promise.all(
      allFiles.map(async (element: FileResponse) => {
        try {
          const url = await convertImagesURLToPublicURL(element.id);
          return {
            id: element.id,
            url,
            name: element.name,
      
          };                             
        } catch (urlError) {
          console.error(`Error converting URL for file ${element.id}:`, urlError);
          // Return with original URL as fallback
          return {
            id: element.id,
            url: element.url,
            name: element.name,
          };
        }
      })
    );

    return attachments;
    
  } catch (error) {
    console.error('Error getting ticket attachments:', error);
    throw error;
  }
}


/**
 * Generate a 24-hour public URL for a file
 */
async function generatePublicUrl(fileId: string): Promise<string | null> {
  try {
    const response = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/filemanager/api/v3/files/${fileId}/signed-url`,
      { expires_in: 86400 } // 24 hours
    );
    return response?.url || null;
  } catch (error: any) {
    console.error(`Error generating public URL for ${fileId}:`, error.message);
    return null;
  }
}

/**
 * Alternative method: Get attachments through engagements
 */
async function getAttachmentsViaEngagements(ticketId: string) {
  try {
    // Get all engagements associated with the ticket
    const engagementsUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/tickets/${ticketId}/associations/engagements`;
    const engagementsRes = await callHubspotGetApi(engagementsUrl);

    if (!engagementsRes?.results?.length) return [];

    const engagementIds = engagementsRes.results.map((r: any) => r.toObjectId);
    
    // For each engagement, check for attachments
    const allAttachments: any[] = [];
    
    for (const engagementId of engagementIds) {
      try {
        const attachUrl = `${HUBSPOT_BASE_URL}/crm/v3/objects/engagements/${engagementId}/associations/attachments`;
        const attachRes = await callHubspotGetApi(attachUrl);

        if (attachRes?.results?.length) {
          const fileIds = attachRes.results.map((r: any) => r.toObjectId);
          
          for (const fileId of fileIds) {
            const fileUrl = `${HUBSPOT_BASE_URL}/files/v3/files/${fileId}`;
            const fileRes = await callHubspotGetApi(fileUrl);

            const publicUrl = await generatePublicUrl(fileId);

            allAttachments.push({
              id: fileId,
              name: fileRes.name,
              url: publicUrl || fileRes.url,
              originalUrl: fileRes.url,
              type: fileRes.type || fileRes.extension,
              size: fileRes.size,
              createdAt: fileRes.createdAt,
              updatedAt: fileRes.updatedAt,
              engagementId,
            });
          }
        }
      } catch (error: any) {
      }
    }

    return allAttachments;
  } catch (error: any) {
    console.error('Error in alternative method:', error.message);
    return [];
  }
}



export async function convertImagesURLToPublicURL(attachmentId: string) {
  try {
    const url = `https://api.hubapi.com/files/v3/files/${attachmentId}/signed-url`;

    const response = await callHubspotGetApi(url);

    return response.url;
  } catch (error: any) {
    console.error("Error converting image to public URL:", error.response?.data || error.message);
    return null;
  }
}





export async function getWhatsappMessagesForTicket(ticketId: string) {
  try {

    // Step 1: Get associated contacts
    const contactAssocRes = await callHubspotGetApi(
      `${HUBSPOT_BASE_URL}/crm/v4/objects/tickets/${ticketId}/associations/contacts`
    )

    const contacts = contactAssocRes?.results || []
    
    if (!contacts.length) {
      return { 
        ok: true, 
        messages: [], 
        message: 'No contacts associated with this ticket' 
      }
    }

    const allMessages: any[] = []

    // Step 2: For each contact, get their threads
    for (const contact of contacts) {
      const contactId = contact.toObjectId
      
      try {
        // Get OPEN threads
        const openThreadsRes = await callHubspotGetApi(
          `${HUBSPOT_BASE_URL}/conversations/v3/conversations/threads`,
          {
            associatedContactId: contactId,
            threadStatus: 'OPEN'
          }
        )

        const openThreads = openThreadsRes?.results || []

        // Get CLOSED threads
        const closedThreadsRes = await callHubspotGetApi(
          `${HUBSPOT_BASE_URL}/conversations/v3/conversations/threads`,
          {
            associatedContactId: contactId,
            threadStatus: 'CLOSED'
          }
        )

        const closedThreads = closedThreadsRes?.results || []
        const allThreads = [...openThreads, ...closedThreads]

        // Step 3: For each thread, get messages with full details
        for (const thread of allThreads) {
          const threadId = thread.id

          try {
            const messagesRes = await callHubspotGetApi(
              `${HUBSPOT_BASE_URL}/conversations/v3/conversations/threads/${threadId}/messages`
            )

            const messages = messagesRes?.results || []
            
            console.log(`Thread ${threadId}: Found ${messages.length} messages`)

            for (const msg of messages) {
              // Get full message details including attachments
              try {
                const messageDetailsRes = await callHubspotGetApi(
                  `${HUBSPOT_BASE_URL}/conversations/v3/conversations/threads/${threadId}/messages/${msg.id}`
                )

                const fullMsg = messageDetailsRes

                // Extract text content
                let textContent = fullMsg.text || fullMsg.richText || ''
                
                // Clean up HTML if present
                if (textContent.includes('<div') || textContent.includes('<p')) {
                  textContent = textContent.replace(/<[^>]*>/g, '').trim()
                }

                // Process attachments
                const attachments = (fullMsg.attachments || []).map((att: any) => ({
                  id: att.id,
                  mimeType: att.mimeType,
                  filename: att.filename,
                  url: att.url,
                  size: att.size,
                  width: att.width,
                  height: att.height
                }))

                // Determine message direction
                let direction = 'unknown'
                if (fullMsg.sender?.deliveryIdentifier?.type === 'HS_PHONE_NUMBER') {
                  direction = 'incoming'
                } else if (fullMsg.recipients?.[0]?.deliveryIdentifier?.type === 'HS_PHONE_NUMBER') {
                  direction = 'outgoing'
                }

                allMessages.push({
                  id: fullMsg.id,
                  threadId: threadId,
                  text: textContent,
                  richText: fullMsg.richText || '',
                  sender: {
                    actorId: fullMsg.sender?.actorId || 'unknown',
                    name: fullMsg.sender?.name || 'Unknown',
                    deliveryIdentifier: fullMsg.sender?.deliveryIdentifier || null
                  },
                  recipients: (fullMsg.recipients || []).map((r: any) => ({
                    actorId: r.actorId,
                    name: r.name,
                    recipientField: r.recipientField,
                    deliveryIdentifier: r.deliveryIdentifier
                  })),
                  createdAt: fullMsg.createdAt,
                  type: fullMsg.type,
                  clientType: fullMsg.clientType,
                  channelId: thread.channelId,
                  channelAccountId: thread.channelAccountId,
                  status: fullMsg.status,
                  hasInlineImages: fullMsg.hasInlineImages || false,
                  attachments: attachments,
                  direction: direction,
                  truncationStatus: fullMsg.truncationStatus
                })

              } catch (msgDetailErr: any) {
                console.error(`Error fetching details for message ${msg.id}:`, msgDetailErr.message)
                
                allMessages.push({
                  id: msg.id,
                  threadId: threadId,
                  text: msg.text || msg.richText || '',
                  sender: {
                    actorId: msg.sender?.actorId || 'unknown',
                    name: msg.sender?.name || 'Unknown'
                  },
                  recipients: msg.recipients || [],
                  createdAt: msg.createdAt,
                  type: msg.type,
                  attachments: msg.attachments || []
                })
              }
            }

          } catch (msgErr: any) {
            console.error(`Error fetching messages for thread ${threadId}:`, msgErr.response?.data || msgErr.message)
          }
        }

      } catch (threadErr: any) {
        console.error(`Error fetching threads for contact ${contactId}:`, threadErr.response?.data || threadErr.message)
      }
    }

    // Sort messages by creation date
    allMessages.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0).getTime()
      const dateB = new Date(b.createdAt || 0).getTime()
      return dateA - dateB
    })

    // Filter only WhatsApp messages (where recipients have HS_PHONE_NUMBER)
    const whatsappMessages = allMessages.filter(msg => 
      msg.recipients.some((r: any) => r.deliveryIdentifier?.type === 'HS_PHONE_NUMBER')
    )

    console.log(`✅ Total messages: ${allMessages.length}, WhatsApp messages: ${whatsappMessages.length}`)

    return { 
      count: whatsappMessages.length,
      messages: whatsappMessages,
    }

  } catch (err: any) {
    console.error('❌ Error:', err.response?.data || err.message)
    return {
      ok: false,
      message: 'Failed to fetch WhatsApp messages',
      error: err.response?.data || err.message,
      messages: []
    }
  }
}


/**
 * Get owner ID by email address
 */
async function getOwnerIdByEmail(ownerEmail: string): Promise<string | null> {
  try {
    // Get all owners using REST API
    const ownersRes = await callHubspotGetApi(
      `${HUBSPOT_BASE_URL}/crm/v3/owners`
    );
    
    const owners = ownersRes.results || [];
    const owner = owners.find((o: any) => o.email === ownerEmail);
    
    if (owner) {
      console.log(`✅ Found owner ID: ${owner.id} for email: ${ownerEmail}`);
      return owner.id.toString();
    }
    
    console.log(`⚠️  No owner found with email: ${ownerEmail}`);
    return null;
  } catch (error: any) {
    console.error("❌ Error getting owner by email:", error.message);
    return null;
  }
}

// 1️⃣ Create Contact
export async function createContact(contactData:any) {
  try {
    // If CONTACT_OWNER is set, get the owner ID and assign it to the contact
    let ownerId: string | null = null;
    if (CONTACT_OWNER) {
      ownerId = await getOwnerIdByEmail(CONTACT_OWNER);
      if (ownerId) {
        contactData.hubspot_owner_id = ownerId;
        console.log(`📌 Assigning contact to owner: ${CONTACT_OWNER} (ID: ${ownerId})`);
      } else {
        console.warn(`⚠️  Could not find owner with email: ${CONTACT_OWNER}. Contact will be created without owner assignment.`);
      }
    }

    const res = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/contacts`,
      { properties: contactData }
    )

    return {
      success: true,
      id: res.id,
      data: res,
    }
  } catch (err) {
    return {
      success: false,
    }
  }
}



export async function createTickets(ticketData: any, contactId?: string) {
  try {
    // 1️⃣ Create Ticket
    const ticketPayload = {
      properties: {
        hs_pipeline: ticketData.hs_pipeline || "0",
        hs_pipeline_stage: ticketData.hs_pipeline_stage || "1",
        subject: ticketData.subject || "New Support Ticket",
        content: ticketData.content || "",
        // Map source_type to valid hs_ticket_category options
        hs_ticket_category: mapTicketCategory(ticketData.source_type),
      },
    };

    const res = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/tickets`,
      ticketPayload
    );

    const ticketId = res.id;
    console.log("✅ Ticket created:", ticketId);

    // 2️⃣ Associate Ticket with Contact (if contactId provided)
    if (contactId) {
      console.log("🔗 Associating ticket with contact...");

      // Use the default association type ID for ticket to contact
      const associationTypeId = 16;

      const associateUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/tickets/${ticketId}/associations/contacts/${contactId}`;

      await axios.put(
        associateUrl,
        [
          {
            associationCategory: "HUBSPOT_DEFINED",
            associationTypeId: associationTypeId,
          },
        ],
        { headers: hubspotHeaders }
      );

      console.log(`✅ Associated ticket ${ticketId} with contact ${contactId}`);
    }

    // 3️⃣ Return success
    return {
      ok: true,
      message: contactId
        ? "Ticket created and associated with contact"
        : "Ticket created successfully",
      data: res.data,
    };
  } catch (err: any) {
    console.error("❌ Error creating ticket or association:", err.response?.data || err.message);
    
    return {
      ok: false,
      message: err.response?.data?.message || "Failed to create ticket or association",
      data: {
        success: false,
        error: err.response?.data || err.message,
      },
    };
  }
}

// Helper function to map source types to valid HubSpot ticket categories
function mapTicketCategory(sourceType?: string): string {
  const categoryMap: Record<string, string> = {
    EMAIL: "GENERAL_INQUIRY",
    PHONE: "GENERAL_INQUIRY",
    CHAT: "GENERAL_INQUIRY",
    CUSTOMER: "GENERAL_INQUIRY",
    PRODUCT: "PRODUCT_ISSUE",
    BILLING: "BILLING_ISSUE",
    FEATURE: "FEATURE_REQUEST",
  };

  if (!sourceType) return "GENERAL_INQUIRY";

  const upperSource = sourceType.toUpperCase();
  return categoryMap[upperSource] || "GENERAL_INQUIRY";
}


export async function createTaskForTicket(ticketId: string, taskData: {
  subject: string,
  body?: string,
  dueDate?: string,
  priority?: 'LOW'|'MEDIUM'|'HIGH',
  status?: 'NOT_STARTED'|'IN_PROGRESS'|'COMPLETED'|'WAITING'|'DEFERRED',
  taskType?: string,
  assignedTo?: string
}) {
  try {
    console.log(`📝 Creating task for ticket: ${ticketId}`);

    // 1) Create task
    const taskPayload = {
      properties: {
        hs_task_subject: taskData.subject,
        hs_task_body: taskData.body || "",
        hs_task_status: taskData.status || "NOT_STARTED",
        hs_task_priority: taskData.priority || "MEDIUM",
        hs_timestamp: taskData.dueDate || new Date().toISOString(),
        hs_task_type: taskData.taskType || "TODO",
        ...(taskData.assignedTo && { hubspot_owner_id: taskData.assignedTo })
      }
    };

    const createTaskRes = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/tasks`,
      taskPayload
    );

    const taskId = createTaskRes.id;
    console.log(`✅ Task created with ID: ${taskId}`);

    // 2) Get association types for tasks -> tickets (to find the 'type' string)
    //    Endpoint: GET /crm/v3/associations/{fromObjectType}/{toObjectType}/types
    //    Example: /crm/v3/associations/tasks/tickets/types
    let assocTypeName: string | null = null;

    try {
      const typesRes = await callHubspotGetApi(
        `${HUBSPOT_BASE_URL}/crm/v3/associations/tasks/tickets/types`
      );

      const types = typesRes?.results || [];
      console.log("Available association types (tasks->tickets):", types);

      // prefer a default labeled type if present, otherwise take the first
      if (types.length === 0) {
        throw new Error("No association types returned for tasks->tickets");
      }

      // pick a sensible default — look for names that contain 'task' or 'ticket' or 'task_to_ticket'
      const preferred = types.find((t: any) =>
        /(task_to_ticket|task_to_ticket_unlabeled|task_to_ticket_labeled|task_to_)/i.test(t.name)
      );

      assocTypeName = (preferred && preferred.name) || types[0].name;
      console.log("Using assoc type:", assocTypeName);

    } catch (typeErr: any) {
      console.warn("⚠️ Could not fetch association types for tasks->tickets:", typeErr.response?.data || typeErr.message);
      // still try the legacy single-association approach as fallback (below)
    }

    // 3) Create association via batch create (v3)
    if (assocTypeName) {
      try {
        const batchCreateUrl = `${HUBSPOT_BASE_URL}/crm/v3/associations/tasks/tickets/batch/create`;
        const batchBody = {
          inputs: [
            {
              from: { id: taskId },
              to: { id: ticketId },
              type: assocTypeName
            }
          ]
        };

        const assocRes = await callHubspotCreateApi(batchCreateUrl, batchBody);
        console.log(`✅ Task ${taskId} associated with ticket ${ticketId}`);
        console.log("Association response:", assocRes);

        return {
          ok: true,
          taskId,
          message: "Task created and associated successfully",
          data: createTaskRes,
          association: assocRes
        };

      } catch (assocErr: any) {
        console.error("❌ Error creating batch association (v3):", assocErr.response?.status, assocErr.response?.data || assocErr.message);
        // fall through to try legacy endpoint below
      }
    }

    // 4) Fallback: use legacy associations API (less preferred) — single association
    // Legacy: PUT /crm-associations/v1/associations
    // This is sometimes easier when you know the directions, but v3 is preferred.
    try {
      const legacyUrl = `${HUBSPOT_BASE_URL}/crm-associations/v1/associations`;
      const legacyBody = {
        fromObjectId: parseInt(taskId, 10),
        toObjectId: parseInt(ticketId, 10),
        category: "HUBSPOT_DEFINED",
        definitionId: 27 // NOTE: 27 was suggested in community posts for task<->ticket — verify for your portal
      };

      // If you get 404 or 400 here, the definitionId is likely wrong for your portal.
      const legacyRes = await axios.put(legacyUrl, legacyBody, { headers: hubspotHeaders });
      console.log("✅ Legacy association succeeded:", legacyRes.data);

      return {
        ok: true,
        taskId,
        message: "Task created and associated via legacy API (fallback)",
        data: createTaskRes,
        legacyAssociation: legacyRes.data
      };

    } catch (legacyErr: any) {
      console.error("❌ Legacy association also failed:", legacyErr.response?.status, legacyErr.response?.data || legacyErr.message);

      return {
        ok: true,
        taskId,
        message: "Task created but failed to associate with ticket",
        warning: "Association failed",
        associationError: legacyErr.response?.data || legacyErr.message,
        data: createTaskRes
      };
    }

  } catch (err: any) {
    console.error('❌ Error creating task:', err.response?.data || err.message);
    return {
      ok: false,
      message: 'Failed to create task',
      error: err.response?.data || err.message
    };
  }
}

export async function createNoteForTicket(ticketId: string, noteData: {
  title: string,
  body: string,
  ownerId?: string // HubSpot user ID
}) {
  try {
    console.log(`📝 Creating note for ticket: ${ticketId}`);

    // 1️⃣ Create the note
    const notePayload = {
      properties: {
        hs_note_body: noteData.body,
        hs_timestamp: new Date().toISOString(),
        hs_note_title: noteData.title,      }
    };

    const noteRes = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/notes`,
      notePayload
    );

    const noteId = noteRes.id;
    console.log(`✅ Note created with ID: ${noteId}`);

    // 2️⃣ Get association types for notes → tickets
    let assocTypeName: string | null = null;

    try {
      const typesRes = await callHubspotGetApi(
        `${HUBSPOT_BASE_URL}/crm/v3/associations/notes/tickets/types`
      );

      const types = typesRes?.results || [];
      console.log("Available association types (notes→tickets):", types);

      if (types.length === 0) {
        throw new Error("No association types returned for notes→tickets");
      }

      // Pick the first association type or one that looks right
      const preferred = types.find((t: any) =>
        /(note_to_ticket|notes_to_tickets|note_to_ticket_unlabeled)/i.test(t.name)
      );

      assocTypeName = (preferred && preferred.name) || types[0].name;
      console.log("Using assoc type:", assocTypeName);

    } catch (typeErr: any) {
      console.warn("⚠️ Could not fetch association types for notes→tickets:", typeErr.response?.data || typeErr.message);
    }

    // 3️⃣ Associate Note with Ticket
    if (assocTypeName) {
      try {
        const assocUrl = `${HUBSPOT_BASE_URL}/crm/v3/associations/notes/tickets/batch/create`;
        const body = {
          inputs: [
            {
              from: { id: noteId },
              to: { id: ticketId },
              type: assocTypeName
            }
          ]
        };

        const assocRes = await callHubspotCreateApi(assocUrl, body);
        console.log(`✅ Note ${noteId} associated with ticket ${ticketId}`);
        console.log("Association response:", assocRes);

        return {
          ok: true,
          noteId,
          message: "Note created and associated successfully",
          data: noteRes,
          association: assocRes
        };

      } catch (assocErr: any) {
        console.error("❌ Error creating note association:", assocErr.response?.status, assocErr.response?.data || assocErr.message);
      }
    }

    // 4️⃣ Fallback to legacy association if v3 fails
    try {
      const legacyUrl = `${HUBSPOT_BASE_URL}/crm-associations/v1/associations`;
      const legacyBody = {
        fromObjectId: parseInt(noteId, 10),
        toObjectId: parseInt(ticketId, 10),
        category: "HUBSPOT_DEFINED",
        definitionId: 202 // Common default for Note→Ticket, verify if needed
      };

      const legacyRes = await axios.put(legacyUrl, legacyBody, { headers: hubspotHeaders });
      console.log("✅ Legacy association succeeded:", legacyRes.data);

      return {
        ok: true,
        noteId,
        message: "Note created and associated via legacy API (fallback)",
        data: noteRes,
        legacyAssociation: legacyRes.data
      };

    } catch (legacyErr: any) {
      console.error("❌ Legacy association failed:", legacyErr.response?.status, legacyErr.response?.data || legacyErr.message);

      return {
        ok: true,
        noteId,
        message: "Note created but failed to associate with ticket",
        warning: "Association failed",
        associationError: legacyErr.response?.data || legacyErr.message,
        data: noteRes
      };
    }

  } catch (err: any) {
    console.error("❌ Error creating note:", err.response?.data || err.message);
    return {
      ok: false,
      message: "Failed to create note",
      error: err.response?.data || err.message
    };
  }
}


export async function sendEmailByTicketId(ticketId: string, subject: string, body: string) {
  try {

    const payload = {
      emailId: "ahsaniqbal@permitdesk.com", // or use "name": "template_name"
      message: {
        to: "muhammadgulshair@rigelai.net",
        from: "ahsaniqbal@permitdesk.com",
        sendId: "ticket-auto-reply",
        customProperties: {
          subject,
          body,
        },
      },
    };

    const res = await callHubspotCreateApi("https://api.hubapi.com/marketing/v4/email/single-send", payload);

    return { ok: true, data: res };
  } catch (err: any) {
    console.error("❌ Error sending email:", err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}


export async function sendWhatsAppMessageByTicketId(
  ticketId: string,
  text: string,
  options?: {
    threadId?: string;
    senderActorId?: string;
    channelId?: string;
    channelAccountId?: string;
    attachments?: { type: string; fileId: string }[];
  }
) {
  try {
    console.log(`📱 Sending WhatsApp message for ticket: ${ticketId}`);

    let threadId = options?.threadId;
    let channelId = options?.channelId;
    let channelAccountId = options?.channelAccountId;
    let senderActorId = options?.senderActorId;
    const attachments = options?.attachments;

    if (!threadId) {
      const contactAssocRes = await callHubspotGetApi(
        `${HUBSPOT_BASE_URL}/crm/v4/objects/tickets/${ticketId}/associations/contacts`
      );

      const contacts = contactAssocRes?.results || [];
      if (!contacts.length) {
        return { ok: false, error: "No contacts associated with this ticket" };
      }

      const contactId = contacts[0].toObjectId;

      const openThreadsRes = await callHubspotGetApi(
        `${HUBSPOT_BASE_URL}/conversations/v3/conversations/threads`,
        { associatedContactId: contactId, threadStatus: "OPEN" }
      );

      let allThreads = openThreadsRes?.results || [];
      if (allThreads.length === 0) {
        const closedThreadsRes = await callHubspotGetApi(
          `${HUBSPOT_BASE_URL}/conversations/v3/conversations/threads`,
          { associatedContactId: contactId, threadStatus: "CLOSED" }
        );
        allThreads = closedThreadsRes?.results || [];
      }

      if (allThreads.length === 0) {
        return { ok: false, error: "No conversation threads found for this ticket's contacts" };
      }

      const thread = allThreads[0];
      threadId = thread.id;

      if (!channelId) channelId = thread.originalChannelId;
      if (!channelAccountId) channelAccountId = thread.originalChannelAccountId;
    }

    if (!senderActorId) {
      return {
        ok: false,
        error: "senderActorId is required. Please provide it in the request body.",
      };
    }

    const payload: any = {
      type: "MESSAGE",
      text: text || "",
      senderActorId,
      channelId,
      channelAccountId,
      ...(attachments?.length && {
        attachments: attachments.map((a) => ({
          fileId: a.fileId, // ✅ HubSpot expects fileId, not id
          type: a.type
        })),
      }),
    };
    
    
    const url = `${HUBSPOT_BASE_URL}/conversations/v3/conversations/threads/${threadId}/messages`;
    const res = await callHubspotCreateApi(url, payload);

    console.log(`✅ WhatsApp message sent successfully to thread ${threadId}`);
    return { ok: true, data: res };
  } catch (err: any) {
    console.error("❌ Error sending WhatsApp message:", err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}



export async function uploadFileToHubSpot(
  fileBuffer: Buffer | Blob,
  fileName: string,
  fileType: string,
  options?: { 
    folderId?: string;
    access?: 'PRIVATE' | 'PUBLIC_INDEXABLE' | 'PUBLIC_NOT_INDEXABLE';
    folderPath?: string;
  }
): Promise<{ ok: boolean; fileId?: string; error?: any }> {
  try {
    console.log(`📤 Uploading file to HubSpot: ${fileName}`);

    // Create FormData for multipart/form-data upload
    const formData = new FormData();
    
    // Append the file
    formData.append('file', fileBuffer, {
      filename: fileName,
      contentType: fileType,
    });

    // Append fileName as a separate form field (required by HubSpot API)
    formData.append('fileName', fileName);

    // Determine folder location
    // Priority: options.folderId > options.folderPath > FOLDER_ID from env > default '/'
    let folderId: string | undefined;
    let folderPath: string | undefined;
    
    if (options?.folderId && typeof options.folderId === 'string' && options.folderId.trim() !== '') {
      folderId = options.folderId.trim();
      console.log('📁 Using folderId from options:', folderId);
    } else if (options?.folderPath && typeof options.folderPath === 'string' && options.folderPath.trim() !== '') {
      folderPath = options.folderPath.trim();
      console.log('📁 Using folderPath from options:', folderPath);
    } else if (FOLDER_ID && typeof FOLDER_ID === 'string' && FOLDER_ID.trim() !== '') {
      folderId = FOLDER_ID.trim();
      console.log('📁 Using folderId from environment:', folderId);
    } else {
      // Default to root folder if neither is provided
      folderPath = '/';
      console.log('📁 Using default folderPath: /');
    }

    // Append folderId or folderPath as separate form fields (not in options)
    if (folderId) {
      formData.append('folderId', folderId);
    } else if (folderPath) {
      formData.append('folderPath', folderPath);
    } else {
      console.error('❌ Neither folderId nor folderPath is set properly');
      return { 
        ok: false, 
        error: 'Configuration error: Neither folderId nor folderPath is set' 
      };
    }

    // Build options object - only access and other non-folder options go here
    // HubSpot requires the options parameter to always be present
    const uploadOptions: any = {};
    
    if (options?.access) {
      uploadOptions.access = options.access;
    } else {
      // Default to PRIVATE if no access is specified
      uploadOptions.access = 'PRIVATE';
    }
    
    // Always append options as JSON string (required by HubSpot API)
    formData.append('options', JSON.stringify(uploadOptions));
    console.log('📋 Upload options:', JSON.stringify(uploadOptions, null, 2));

    // Upload to HubSpot
    const response = await axios.post(
      `${HUBSPOT_BASE_URL}/files/v3/files`,
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        },
      }
    );

    const fileId = response.data?.id || response.data?.objects?.[0]?.id;
    
    if (!fileId) {
      throw new Error('File ID not returned from HubSpot');
    }

    console.log(`✅ File uploaded successfully. File ID: ${fileId}`);
    return { ok: true, fileId };
  } catch (err: any) {
    console.error('❌ Error uploading file to HubSpot:', err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}


export async function attachFileToTicket(
  fileUrl: string,
  ticketId: string,
  options?: {
    access?: 'PRIVATE' | 'PUBLIC_INDEXABLE' | 'PUBLIC_NOT_INDEXABLE';
    folderId?: string;
    folderPath?: string;
    fileName?: string;
  }
): Promise<{ ok: boolean; fileId?: string; error?: any }> {
  try {
    console.log(`📤 Attaching file from URL to ticket: ${fileUrl} -> Ticket ${ticketId}`);

    // Download file from URL
    console.log(`📥 Downloading file from URL: ${fileUrl}`);
    const fileResponse = await axios.get(fileUrl, {
      responseType: 'arraybuffer',
      timeout: 30000, // 30 second timeout
    });

    const fileBuffer = Buffer.from(fileResponse.data);
    
    // Determine file name
    let fileName = options?.fileName;
    if (!fileName) {
      // Try to extract from URL
      try {
        const urlObj = new URL(fileUrl);
        fileName = urlObj.pathname.split('/').pop() || 'file';
        // If no extension, try to get from Content-Type
        if (!fileName.includes('.')) {
          const contentType = fileResponse.headers['content-type'];
          if (contentType) {
            const ext = contentType.split('/')[1]?.split(';')[0];
            if (ext) fileName = `${fileName}.${ext}`;
          }
        }
      } catch {
        fileName = 'file';
      }
    }

    // Determine content type
    const contentType = fileResponse.headers['content-type'] || 'application/octet-stream';
    console.log(`✅ File downloaded (${fileBuffer.length} bytes, type: ${contentType})`);

    // Upload to HubSpot
    const uploadResult = await uploadFileToHubSpot(
      fileBuffer,
      fileName,
      contentType,
      {
        access: options?.access || 'PRIVATE',
        folderId: options?.folderId,
        folderPath: options?.folderPath,
      }
    );

    if (!uploadResult.ok || !uploadResult.fileId) {
      return { 
        ok: false, 
        error: uploadResult.error || 'Failed to upload file to HubSpot' 
      };
    }

    const fileId = uploadResult.fileId;
    console.log(`✅ File uploaded to HubSpot with ID: ${fileId}`);

    // Attach file to ticket using v4 associations API
    const fileAssocUrl = `${HUBSPOT_BASE_URL}/crm/v4/objects/tickets/${ticketId}/associations/files/${fileId}`;
    await axios.put(
      fileAssocUrl,
      [
        {
          associationCategory: 'HUBSPOT_DEFINED',
          associationTypeId: 19, // File to Ticket association type
        },
      ],
      { headers: hubspotHeaders }
    );

    console.log(`✅ File ${fileId} attached to ticket ${ticketId}`);
    return { ok: true, fileId };
  } catch (err: any) {
    console.error('❌ Error attaching file to ticket:', err.response?.data || err.message);
    return { ok: false, error: err.response?.data || err.message };
  }
}

/**
 * Helper function to attach an existing HubSpot file (by fileId) to a ticket
 * Uses the engagements API to create an engagement with the file attached
 */
export async function attachFileIdToTicket(
  ticketId: string,
  fileId: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    if (!ticketId || !fileId) {
      return { ok: false, error: 'ticketId and fileId are required' };
    }

    const url = `${HUBSPOT_BASE_URL}/engagements/v1/engagements`;

    // Convert string IDs to numbers as HubSpot API expects numeric IDs
    const ticketIdNum = parseInt(ticketId, 10);
    const fileIdNum = parseInt(fileId, 10);

    if (isNaN(ticketIdNum) || isNaN(fileIdNum)) {
      return { ok: false, error: 'ticketId and fileId must be valid numbers' };
    }

    const requestBody = {
      engagement: {
        type: 'NOTE',
        active: true,
        timestamp: Date.now(),
      },
      associations: {
        ticketIds: [ticketIdNum],
      },
      attachments: [
        {
          id: fileIdNum,
        },
      ],
      metadata: {},
    };

    await axios.post(url, requestBody, { headers: hubspotHeaders });

    console.log(`✅ File ${fileId} attached to ticket ${ticketId}`);
    return { ok: true };
  } catch (err: any) {
    console.error(
      '❌ Error attaching file to ticket:',
      err.response?.data || err.message
    );
    return { ok: false, error: err.response?.data || err.message };
  }
}




export async function uploadFileFromS3AndAttachToTicket(
  fileUrl: string,
  fileName: string,
  ticketId: string
): Promise<{ ok: boolean; fileId?: string; error?: any }> {
  try {
    const s3Client = new S3Client({
      region: AWS_REGION?.trim() ?? '',
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID || '',
        secretAccessKey: AWS_SECRET_ACCESS_KEY || '',
      },
    });

    // Download file from S3
    console.log(`📥 Downloading file from S3: ${fileUrl}`);
    const getObjectCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileUrl,
    });

    const s3Response = await s3Client.send(getObjectCommand);
    
    if (!s3Response.Body) {
      throw new Error('File body is empty or undefined');
    }
    
    const fileBuffer = Buffer.from(await s3Response.Body.transformToByteArray());
    const contentType = s3Response.ContentType || 'application/octet-stream';

    console.log(`✅ File downloaded from S3 (${fileBuffer.length} bytes)`);

    // Upload to HubSpot
    const uploadResult = await uploadFileToHubSpot(fileBuffer, fileName, contentType, {
      access: 'PRIVATE',
      folderPath: '/', // Upload to root folder
    });

    if (!uploadResult.ok || !uploadResult.fileId) {
      return { ok: false, error: uploadResult.error || 'Failed to upload file to HubSpot' };
    }

    // Attach to ticket
    const attachResult = await attachFileIdToTicket(ticketId, uploadResult.fileId);

    if (!attachResult.ok) {
      return { ok: false, error: attachResult.error || 'Failed to attach file to ticket' };
    }

    console.log(`✅ File uploaded and attached to ticket ${ticketId}`);
    return { ok: true, fileId: uploadResult.fileId };
  } catch (err: any) {
    console.error('❌ Error in uploadFileFromS3AndAttachToTicket:', err.message);
    return { ok: false, error: err.message };
  }
}




export async function importFileFromUrlAndAttachToTicket(
  fileUrl: string,
  ticketId: string,
  options?: {
    access?: 'PRIVATE' | 'PUBLIC_INDEXABLE' | 'PUBLIC_NOT_INDEXABLE';
    folderId?: string;
    folderPath?: string;
    duplicateValidationStrategy?: 'NONE' | 'REJECT' | 'RETURN_EXISTING';
    duplicateValidationScope?: 'ENTIRE_PORTAL' | 'EXACT_FOLDER';
    overwrite?: boolean;
    ttl?: string; // e.g., 'P2W' for 2 weeks, 'P1M' for 1 month
    maxPollAttempts?: number; // Maximum number of polling attempts (default: 30)
    pollDelayMs?: number; // Delay between polling attempts in ms (default: 2000)
  }
): Promise<{ 
  ok: boolean; 
  fileId?: string; 
  importId?: string;
  status?: string;
  error?: any 
}> {
  try {


    // Step 1: Import file from URL
    const requestBody: any = {
      url: fileUrl,
    };

    // Set access level (default to PUBLIC_INDEXABLE if not specified)
    requestBody.access = options?.access || 'PUBLIC_INDEXABLE';

    // Determine folder location
    // Priority: folderId > folderPath > default '/'
    if (options?.folderId && typeof options.folderId === 'string' && options.folderId.trim() !== '') {
      requestBody.folderId = options.folderId.trim();
    } else if (options?.folderPath && typeof options.folderPath === 'string' && options.folderPath.trim() !== '') {
      requestBody.folderPath = options.folderPath.trim();
    } else {
      // Default to root folder if neither is provided
      requestBody.folderPath = '/';
    }

    // Add optional parameters
    if (options?.duplicateValidationStrategy) {
      requestBody.duplicateValidationStrategy = options.duplicateValidationStrategy;
    }

    if (options?.duplicateValidationScope) {
      requestBody.duplicateValidationScope = options.duplicateValidationScope;
    }

    if (options?.overwrite !== undefined) {
      requestBody.overwrite = options.overwrite;
    }

    if (options?.ttl) {
      requestBody.ttl = options.ttl;
    }


    // Make the import request using the shared helper function
    const importResponse = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/files/v3/files/import-from-url/async`,
      requestBody
    )     
    let getFileUploadStatus = await callHubspotGetApi(
      importResponse.links.status
    );
    console.log("🚀 ~ importFileFromUrlAndAttachToTicket ~ getFileUploadStatus:", getFileUploadStatus)

      
      return getFileUploadStatus;

 

    } catch (err: any) {
      console.error('❌ Error importing file from URL and attaching to ticket:', err.response?.data || err.message);
      return { 
        ok: false, 
        error: err.response?.data || err.message 
      };
    }
} 

export async function addChatUrlNoteToTicket(
  ticketId: string,
  chatUrl: string
): Promise<{ ok: boolean; error?: any }> {
  try {
    if (!ticketId || !chatUrl) {
      return { ok: false, error: 'ticketId and chatUrl are required' };
    }

    // 1️⃣ Create the note
    const notePayload = {
      properties: {
        hs_note_body: `Client Chat With AI URL:\n${chatUrl}`,
        hs_timestamp: new Date().toISOString(),
      }
    };

    const noteRes = await callHubspotCreateApi(
      `${HUBSPOT_BASE_URL}/crm/v3/objects/notes`,
      notePayload
    );

    const noteId = noteRes.id;
    console.log(`✅ Note created with ID: ${noteId}`);

    // 2️⃣ Get association types for notes → tickets
    let assocTypeName: string | null = null;

    try {
      const typesRes = await callHubspotGetApi(
        `${HUBSPOT_BASE_URL}/crm/v3/associations/notes/tickets/types`
      );

      const types = typesRes?.results || [];
      console.log("Available association types (notes→tickets):", types);

      if (types.length === 0) {
        throw new Error("No association types returned for notes→tickets");
      }

      // Pick the first association type or one that looks right
      const preferred = types.find((t: any) =>
        /(note_to_ticket|notes_to_tickets|note_to_ticket_unlabeled)/i.test(t.name)
      );

      assocTypeName = (preferred && preferred.name) || types[0].name;
      console.log("Using assoc type:", assocTypeName);

    } catch (typeErr: any) {
      console.warn("⚠️ Could not fetch association types for notes→tickets:", typeErr.response?.data || typeErr.message);
    }

    // 3️⃣ Associate Note with Ticket
    if (assocTypeName) {
      try {
        const assocUrl = `${HUBSPOT_BASE_URL}/crm/v3/associations/notes/tickets/batch/create`;
        const body = {
          inputs: [
            {
              from: { id: noteId },
              to: { id: ticketId },
              type: assocTypeName
            }
          ]
        };

        await callHubspotCreateApi(assocUrl, body);
        console.log(`✅ Note ${noteId} associated with ticket ${ticketId}`);
        console.log(`✅ Chat URL added to ticket ${ticketId}`);
        return { ok: true };

      } catch (assocErr: any) {
        console.error("❌ Error creating note association:", assocErr.response?.status, assocErr.response?.data || assocErr.message);
      }
    }

    // 4️⃣ Fallback to legacy association if v3 fails
    try {
      const legacyUrl = `${HUBSPOT_BASE_URL}/crm-associations/v1/associations`;
      const legacyBody = {
        fromObjectId: parseInt(noteId, 10),
        toObjectId: parseInt(ticketId, 10),
        category: "HUBSPOT_DEFINED",
        definitionId: 202 // Common default for Note→Ticket
      };

      await axios.put(legacyUrl, legacyBody, { headers: hubspotHeaders });
      console.log("✅ Legacy association succeeded");
      console.log(`✅ Chat URL added to ticket ${ticketId}`);
      return { ok: true };

    } catch (legacyErr: any) {
      console.error("❌ Legacy association failed:", legacyErr.response?.status, legacyErr.response?.data || legacyErr.message);
      console.log(`⚠️ Note created but failed to associate with ticket`);
      // Still return ok: true since note was created
      return { ok: true };
    }

  } catch (err: any) {
    console.error(
      '❌ Error adding chat URL to ticket:',
      err.response?.data || err.message
    );
    return { ok: false, error: err.response?.data || err.message };
  }
}


export { hubspotClient, normalizePhoneNumber, formatWhatsAppNumber };

