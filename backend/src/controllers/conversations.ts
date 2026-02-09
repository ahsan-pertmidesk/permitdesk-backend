import { Request, Response } from "express";
import {
  getConversationHistory,
  getConversationDetails,
  listAllConversations,
  deleteConversationAndUnlink,
  getCurrentMappings,
} from "../services/twilio-conversations";

/**
 * GET /api/conversations - List all conversations
 */
export async function listConversations(req: Request, res: Response) {
  try {
    const conversations = await listAllConversations();
    res.json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/conversations/:sid - Get conversation details and history
 */
export async function getConversation(req: Request, res: Response) {
  try {
    const { sid } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const details = await getConversationDetails(sid);
    
    if (!details) {
      return res.status(404).json({
        success: false,
        error: "Conversation not found",
      });
    }

    res.json({
      success: true,
      conversation: details,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/conversations/:sid/messages - Get conversation messages only
 */
export async function getConversationMessages(req: Request, res: Response) {
  try {
    const { sid } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;

    const messages = await getConversationHistory(sid, limit);

    res.json({
      success: true,
      count: messages.length,
      messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * DELETE /api/conversations/:sid - Delete conversation and unlink client-agent mapping
 */
export async function deleteConversation(req: Request, res: Response) {
  try {
    const { sid } = req.params;
    
    const result = await deleteConversationAndUnlink(sid);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        removedMappings: result.removedMappings,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * GET /api/conversations/debug/mappings - Get current client-agent mappings (for debugging)
 */
export async function getMappings(req: Request, res: Response) {
  try {
    const mappings = getCurrentMappings();
    res.json({
      success: true,
      count: Object.keys(mappings).length,
      mappings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

