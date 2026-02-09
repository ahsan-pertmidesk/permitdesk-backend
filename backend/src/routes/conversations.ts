import { Router } from "express";
import {
  listConversations,
  getConversation,
  getConversationMessages,
  deleteConversation,
  getMappings,
} from "../controllers/conversations";

const router = Router();

// List all conversations
router.get("/", listConversations); 

// Get current client-agent mappings (for debugging)
router.get("/debug/mappings", getMappings);

// Get specific conversation details
router.get("/:sid", getConversation);

// Get conversation messages
router.get("/:sid/messages", getConversationMessages);

// Delete conversation and unlink client-agent mapping
router.delete("/:sid", deleteConversation);

export default router;

