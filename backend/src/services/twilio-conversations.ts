import twilio from "twilio";
import {
  findContactByWhatsAppNumber,
  getOwnerWhatsAppNumber,
  createTicketForContact,
  checkExistingTicketForConversation,
} from "../modules/hubspot/hubspot.service";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

// Configuration
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+17732323344";

// Dynamic Client-to-Agent mapping (populated from HubSpot)
const CLIENT_AGENT_MAPPING: Record<string, string> = {};

interface ConversationParticipant {
  address: string;
  proxyAddress: string;
}

/**
 * Find or create a conversation between client and agent
 */
export async function findOrCreateConversation(
  clientNumber: string,
  agentNumber: string
): Promise<any> {
  try {
    const conversationSid = `conv_${clientNumber.replace(/[^0-9]/g, "")}_${agentNumber.replace(/[^0-9]/g, "")}`;
    const friendlyName = `Client ${clientNumber} ↔ Agent ${agentNumber}`;

    // Try to find existing conversation
    try {
      const conversation = await twilioClient.conversations.v1.conversations(conversationSid).fetch();
      console.log(`✅ Found existing conversation: ${conversation.sid}`);
      return conversation;
    } catch (err: any) {
      if (err.status === 404) {
        // Conversation doesn't exist, create it
        console.log(`Creating new conversation: ${conversationSid}`);
        const newConversation = await twilioClient.conversations.v1.conversations.create({
          uniqueName: conversationSid,
          friendlyName: friendlyName,
        });

        console.log(`✅ Created conversation: ${newConversation.sid}`);
        return newConversation;
      }
      throw err;
    }
  } catch (error) {
    console.error("Error in findOrCreateConversation:", error);
    throw error;
  }
}

/**
 * Add a participant to a conversation
 */
export async function addParticipantToConversation(
  conversationSid: string,
  participantAddress: string
): Promise<any> {
  try {
    // Check if participant already exists
    const participants = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants.list();

    const existingParticipant = participants.find(
      (p) => p.messagingBinding?.address === participantAddress
    );

    if (existingParticipant) {
      console.log(`Participant ${participantAddress} already in conversation`);
      return existingParticipant;
    }

    // Add new participant with messaging binding
    const participant = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants.create({
        "messagingBinding.address": participantAddress,
        "messagingBinding.proxyAddress": TWILIO_WHATSAPP_NUMBER,
      } as any);

    console.log(`✅ Added participant ${participantAddress} to conversation`);
    return participant;
  } catch (error) {
    console.error(`Error adding participant ${participantAddress}:`, error);
    throw error;
  }
}

/**
 * Send a message in a conversation (text or media)
 */
export async function sendMessageInConversation(
  conversationSid: string,
  messageBody: string,
  author?: string,
  mediaUrls?: string[]
): Promise<any> {
  try {
    const messageParams: any = {
      author: author || "system",
    };

    // Add body if present
    if (messageBody) {
      messageParams.body = messageBody;
    }

    // Add media URLs if present
    if (mediaUrls && mediaUrls.length > 0) {
      messageParams.media = mediaUrls;
    }

    const message = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .messages.create(messageParams);

    console.log(`✅ Sent message in conversation ${conversationSid}`, {
      hasBody: !!messageBody,
      mediaCount: mediaUrls?.length || 0,
    });
    return message;
  } catch (error) {
    console.error("Error sending message in conversation:", error);
    throw error;
  }
}

/**
 * Get the assigned agent for a client
 */
export function getAssignedAgent(clientNumber: string): string | null {
  return CLIENT_AGENT_MAPPING[clientNumber] || null;
}

/**
 * Check if a number is a client
 */
export function isClient(number: string): boolean {
  return number in CLIENT_AGENT_MAPPING;
}

/**
 * Check if a number is an agent
 */
export function isAgent(number: string): boolean {
  return Object.values(CLIENT_AGENT_MAPPING).includes(number);
}

/**
 * Get the client for an agent (reverse lookup)
 */
export function getClientForAgent(agentNumber: string): string | null {
  for (const [client, agent] of Object.entries(CLIENT_AGENT_MAPPING)) {
    if (agent === agentNumber) {
      return client;
    }
  }
  return null;
}

/**
 * Send rejection message to unknown customer
 */
async function sendRejectionMessage(phoneNumber: string): Promise<void> {
  try {
    const message = "Sorry, we couldn't verify your account. Please contact our support team for assistance.";
    
    await twilioClient.messages.create({
      from: TWILIO_WHATSAPP_NUMBER,
      to: phoneNumber,
      body: message,
    });

    console.log(`📤 Sent rejection message to: ${phoneNumber}`);
  } catch (error) {
    console.error("Error sending rejection message:", error);
  }
}

/**
 * Main handler: Process incoming message and route through Conversations API
 * 
 * Flow:
 * 1. Check if sender is already a known agent (in mapping) → Agent flow
 * 2. Check if sender is already a known client (in mapping) → Client flow
 * 3. If unknown, check HubSpot:
 *    - Found in HubSpot → Add to mapping, create ticket, proceed with client flow
 *    - Not found → Send rejection message
 */
export async function handleConversationMessage(
  from: string,
  messageBody: string,
  mediaUrls?: string[]
): Promise<{ success: boolean; message: string }> {
  try {
    const hasMedia = mediaUrls && mediaUrls.length > 0;
    console.log(`\n📨 Processing message from: ${from}`, {
      hasText: !!messageBody,
      mediaCount: mediaUrls?.length || 0,
    });

    // Check if sender is an AGENT (reverse lookup in mapping)
    if (isAgent(from)) {
      // Message from AGENT → ensure conversation exists with CLIENT
      const clientNumber = getClientForAgent(from);

      if (!clientNumber) {
        console.log(`❌ No active client for agent: ${from}`);
        return {
          success: false,
          message: "No client assigned to this agent",
        };
      }

      console.log(`👔 Agent message detected. Ensuring conversation with client: ${clientNumber}`);

      // Find or create conversation
      const conversation = await findOrCreateConversation(clientNumber, from);

      // Add both participants if not already added
      await addParticipantToConversation(conversation.sid, clientNumber);
      await addParticipantToConversation(conversation.sid, from);

      // Message is already in the conversation - no need to re-send
      console.log(`✅ Message logged in conversation ${conversation.sid}`);

      return {
        success: true,
        message: `Message${hasMedia ? ' with media' : ''} from agent delivered to client ${clientNumber}`,
      };
    }

    // Check if sender is already a known CLIENT (in mapping)
    if (isClient(from)) {
      // Message from CLIENT → ensure conversation exists with AGENT
      const agentNumber = getAssignedAgent(from);
      
      if (!agentNumber) {
        console.log(`❌ No agent assigned for client: ${from}`);
        return {
          success: false,
          message: "No agent assigned to this client",
        };
      }

      console.log(`👤 Known client message. Routing to agent: ${agentNumber}`);

      // Find or create conversation
      const conversation = await findOrCreateConversation(from, agentNumber);

      // Add both participants if not already added
      await addParticipantToConversation(conversation.sid, from);
      await addParticipantToConversation(conversation.sid, agentNumber);

      console.log(`✅ Message logged in conversation ${conversation.sid}`);

      return {
        success: true,
        message: `Message${hasMedia ? ' with media' : ''} from client delivered to agent ${agentNumber}`,
      };
    }

    // Unknown sender → Check HubSpot
    console.log(`❓ Unknown sender. Checking HubSpot for: ${from}`);

    const hubspotContact = await findContactByWhatsAppNumber(from);

    if (!hubspotContact) {
      console.log(`❌ Contact not found in HubSpot: ${from}`);
      await sendRejectionMessage(from);
      return {
        success: false,
        message: "Contact not found in HubSpot - rejection message sent",
      };
    }

    // Contact found in HubSpot - get owner's WhatsApp number
    console.log(`✅ Contact found in HubSpot. Customer: ${hubspotContact.firstName} ${hubspotContact.lastName}, Owner: ${hubspotContact.ownerEmail}`);
    
    const agentWhatsAppNumber = await getOwnerWhatsAppNumber(hubspotContact.ownerEmail);

    if (!agentWhatsAppNumber) {
      console.log(`❌ No WhatsApp number found for owner: ${hubspotContact.ownerEmail}`);
      return {
        success: false,
        message: "Owner has no WhatsApp number configured",
      };
    }

    console.log(`✅ Found agent WhatsApp: ${agentWhatsAppNumber}`);

    // Add to mapping for future messages
    CLIENT_AGENT_MAPPING[from] = agentWhatsAppNumber;
    console.log(`📝 Added to mapping: ${from} → ${agentWhatsAppNumber}`);

    // Find or create conversation
    const conversation = await findOrCreateConversation(from, agentWhatsAppNumber);

    // Add both participants
    await addParticipantToConversation(conversation.sid, from);
    await addParticipantToConversation(conversation.sid, agentWhatsAppNumber);

    // Check if ticket already exists for this conversation
    const ticketExists = await checkExistingTicketForConversation(conversation.sid);

    if (!ticketExists) {
      // This is a NEW conversation - add the first message manually
      console.log(`📨 Adding first message to conversation`);
      await sendMessageInConversation(
        conversation.sid,
        messageBody || "",
        from,
        mediaUrls
      );

      // Create ticket in HubSpot (first message only)
      console.log(`🎫 Creating new ticket for conversation: ${conversation.sid}`);
      
      await createTicketForContact(
        hubspotContact.contactId,
        hubspotContact.ownerId,
        conversation.sid,
        messageBody || "(Media only)"
      );
      
      console.log(`✅ Ticket created and assigned to owner`);

      // Send intro message AND first message directly to agent
      // This bypasses WhatsApp's 24-hour window since we're sending FROM our Twilio number TO agent
      const customerName = `${hubspotContact.firstName || ""} ${hubspotContact.lastName || ""}`.trim();
      const displayName = customerName || from.replace('whatsapp:', '');
      const introMessage = `New conversation from ${displayName}:\n\n"${messageBody || "(Media attachment)"}"`;
      
      // Send intro message directly to agent via Twilio Messages API
      await twilioClient.messages.create({
        from: TWILIO_WHATSAPP_NUMBER,
        to: agentWhatsAppNumber,
        body: introMessage,
      });
      
      console.log(`📧 Sent intro + first message directly to agent (bypasses 24hr window)`);
    } else {
      console.log(`ℹ️  Ticket already exists for conversation: ${conversation.sid}`);
    }

    console.log(`✅ Message logged in conversation ${conversation.sid}`);

    return {
      success: true,
      message: `New customer verified via HubSpot. Message delivered to agent ${agentWhatsAppNumber}`,
    };

  } catch (error) {
    console.error("Error in handleConversationMessage:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get conversation history (recent messages)
 */
export async function getConversationHistory(
  conversationSid: string,
  limit: number = 50
): Promise<any[]> {
  try {
    const messages = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .messages.list({ limit });

    console.log(`📖 Retrieved ${messages.length} messages from conversation ${conversationSid}`);
    
    // Get conversation details to extract roles from friendlyName
    const conversation = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .fetch();
    
    // Get participants to determine who is agent vs client
    const participants = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants.list();

    const participantAddresses = participants
      .map((p) => p.messagingBinding?.address)
      .filter((addr): addr is string => !!addr);

    console.log(`📋 Conversation participants:`, participantAddresses);

    // Determine roles from mapping (if available)
    let clientNumber: string | null = null;
    let agentNumber: string | null = null;

    for (const address of participantAddresses) {
      if (isClient(address)) {
        clientNumber = address;
        agentNumber = getAssignedAgent(address);
        break;
      } else if (isAgent(address)) {
        agentNumber = address;
        clientNumber = getClientForAgent(address);
        break;
      }
    }

    // If not in mapping, parse from friendlyName: "Client whatsapp:+XXX ↔ Agent whatsapp:+YYY"
    if (!clientNumber || !agentNumber) {
      console.log(`⚠️  Roles not in mapping. Parsing from friendlyName: ${conversation.friendlyName}`);
      
      const friendlyName = conversation.friendlyName || "";
      const match = friendlyName.match(/Client\s+(whatsapp:\+\d+)\s+↔\s+Agent\s+(whatsapp:\+\d+)/);
      
      if (match) {
        clientNumber = match[1];
        agentNumber = match[2];
        console.log(`✅ Parsed from friendlyName - Client: ${clientNumber}, Agent: ${agentNumber}`);
      } else if (participantAddresses.length === 2) {
        // Fallback: if we have exactly 2 participants and can't determine roles,
        // we can still try to infer from HubSpot or just label them
        console.log(`⚠️  Could not parse roles from friendlyName. Using first as client, second as agent.`);
        clientNumber = participantAddresses[0];
        agentNumber = participantAddresses[1];
      }
    }

    console.log(`👤 Client: ${clientNumber}, 👔 Agent: ${agentNumber}`);
    
    return messages.map((msg) => {
      let mediaWithUrls: any[] = [];

      // If message has media, add proxy URLs
      if (msg.media && msg.media.length > 0) {
        mediaWithUrls = msg.media.map((mediaItem: any) => ({
          sid: mediaItem.sid,
          content_type: mediaItem.content_type,
          filename: mediaItem.filename,
          size: mediaItem.size,
          category: mediaItem.category,
          // Use our proxy endpoint to serve media
          url: `/api/media/${conversationSid}/${msg.sid}/${mediaItem.sid}`,
        }));
      }

      // Determine role by comparing author to identified client/agent
      const authorIsClient = msg.author === clientNumber;
      const authorIsAgent = msg.author === agentNumber;

      return {
        author: msg.author,
        body: msg.body,
        dateCreated: msg.dateCreated,
        media: mediaWithUrls,
        index: msg.index,
        sid: msg.sid,
        isAgent: authorIsAgent,
        isClient: authorIsClient,
        role: authorIsAgent ? "agent" : authorIsClient ? "client" : "unknown",
      };
    });
  } catch (error) {
    console.error("Error getting conversation history:", error);
    return [];
  }
}

/**
 * Get conversation details including all participants and metadata
 */
export async function getConversationDetails(conversationSid: string): Promise<any> {
  try {
    const conversation = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .fetch();

    const participants = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants.list();

    const messages = await getConversationHistory(conversationSid, 10);

    return {
      sid: conversation.sid,
      uniqueName: conversation.uniqueName,
      friendlyName: conversation.friendlyName,
      state: conversation.state,
      dateCreated: conversation.dateCreated,
      dateUpdated: conversation.dateUpdated,
      participants: participants.map((p) => ({
        sid: p.sid,
        address: p.messagingBinding?.address,
        dateCreated: p.dateCreated,
      })),
      recentMessages: messages,
      messageCount: messages.length,
    };
  } catch (error) {
    console.error("Error getting conversation details:", error);
    return null;
  }
}

/**
 * List all active conversations
 */
export async function listAllConversations(): Promise<any[]> {
  try {
    const conversations = await twilioClient.conversations.v1.conversations.list({ limit: 100 });
    
    console.log(`📋 Found ${conversations.length} total conversations`);
    
    return conversations.map((conv) => ({
      sid: conv.sid,
      uniqueName: conv.uniqueName,
      friendlyName: conv.friendlyName,
      state: conv.state,
      dateCreated: conv.dateCreated,
      dateUpdated: conv.dateUpdated,
    }));
  } catch (error) {
    console.error("Error listing conversations:", error);
    return [];
  }
}

/**
 * Delete a conversation and remove client-agent mapping
 * Useful for testing and cleanup
 */
export async function deleteConversationAndUnlink(
  conversationSid: string
): Promise<{ success: boolean; message: string; removedMappings?: string[] }> {
  try {
    console.log(`🗑️  Deleting conversation: ${conversationSid}`);

    // First, get conversation details to find participants
    const conversation = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .fetch();

    // Get participants to identify client-agent mapping
    const participants = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .participants.list();

    const participantAddresses = participants
      .map((p) => p.messagingBinding?.address)
      .filter((addr): addr is string => !!addr);

    console.log(`📋 Found ${participantAddresses.length} participants:`, participantAddresses);

    // Delete the conversation from Twilio
    await twilioClient.conversations.v1.conversations(conversationSid).remove();
    console.log(`✅ Deleted conversation from Twilio: ${conversationSid}`);

    // Remove from client-agent mapping
    const removedMappings: string[] = [];
    
    for (const address of participantAddresses) {
      // Check if this address is a client in our mapping
      if (CLIENT_AGENT_MAPPING[address]) {
        const agentAddress = CLIENT_AGENT_MAPPING[address];
        delete CLIENT_AGENT_MAPPING[address];
        removedMappings.push(`${address} -> ${agentAddress}`);
        console.log(`🔗 Removed mapping: ${address} -> ${agentAddress}`);
      }
      
      // Also check if this address is an agent (reverse lookup and remove)
      for (const [client, agent] of Object.entries(CLIENT_AGENT_MAPPING)) {
        if (agent === address) {
          delete CLIENT_AGENT_MAPPING[client];
          removedMappings.push(`${client} -> ${agent}`);
          console.log(`🔗 Removed mapping: ${client} -> ${agent}`);
          break;
        }
      }
    }

    return {
      success: true,
      message: `Conversation deleted and ${removedMappings.length} mapping(s) removed`,
      removedMappings: removedMappings.length > 0 ? removedMappings : undefined,
    };
  } catch (error) {
    console.error("Error deleting conversation:", error);
    return {
      success: false,
      message: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Get current client-agent mappings (for debugging)
 */
export function getCurrentMappings(): Record<string, string> {
  return { ...CLIENT_AGENT_MAPPING };
}

export { twilioClient };

