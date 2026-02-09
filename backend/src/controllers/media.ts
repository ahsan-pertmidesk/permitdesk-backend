import { Request, Response } from "express";
import { twilioClient } from "../services/twilio-conversations";
import axios from "axios";

/**
 * GET /api/media/:conversationSid/:messageSid/:mediaSid
 * Proxy endpoint to fetch and serve media from Twilio Conversations
 */
export async function getMedia(req: Request, res: Response) {
  try {
    const { conversationSid, messageSid, mediaSid } = req.params;

    console.log(`📥 Fetching media: ${mediaSid} from message ${messageSid}`);

    // Fetch message to get media details and links
    const message = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .messages(messageSid)
      .fetch();

    // Find the specific media item
    const mediaItem = message.media?.find((m: any) => m.sid === mediaSid);

    if (!mediaItem) {
      return res.status(404).json({
        success: false,
        error: "Media not found",
      });
    }

    // Get the conversation to find the service SID
    const conversation = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .fetch();

    const chatServiceSid = conversation.chatServiceSid;

    // First, get the media metadata to get the actual content URL
    const mediaMetadataUrl = `https://mcs.us1.twilio.com/v1/Services/${chatServiceSid}/Media/${mediaSid}`;
    
    console.log(`🔗 Step 1: Fetching media metadata from: ${mediaMetadataUrl}`);

    const metadataResponse = await axios.get(mediaMetadataUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64")}`,
      },
    });

    console.log(`📋 Media metadata:`, metadataResponse.data);

    // Get the actual content URL from the links
    const contentUrl = metadataResponse.data.links?.content_direct_temporary || 
                      metadataResponse.data.links?.content_temporary ||
                      metadataResponse.data.url;

    if (!contentUrl) {
      throw new Error("No content URL found in media metadata");
    }

    // Build full URL if it's relative
    const fullContentUrl = contentUrl.startsWith('http') 
      ? contentUrl 
      : `https://mcs.us1.twilio.com${contentUrl}`;

    console.log(`🔗 Step 2: Fetching actual media content from: ${fullContentUrl}`);

    // Fetch the actual media content
    const response = await axios.get(fullContentUrl, {
      responseType: "arraybuffer",
      headers: {
        Authorization: `Basic ${Buffer.from(
          `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
        ).toString("base64")}`,
      },
      maxRedirects: 5,
    });

    console.log(`✅ Media fetched successfully:`, {
      size: response.data.length,
      contentType: response.headers['content-type'],
      status: response.status,
    });

    // Set appropriate headers
    res.set({
      "Content-Type": mediaItem.content_type || "application/octet-stream",
      "Content-Disposition": `inline; filename="${mediaItem.filename || "file"}"`,
      "Content-Length": response.data.length,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year
    });

    // Send the media content
    res.send(response.data);
  } catch (error: any) {
    console.error("❌ Error fetching media:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data?.message || error.message || "Failed to fetch media",
    });
  }
}

/**
 * GET /api/media/:conversationSid/:messageSid/:mediaSid/info
 * Get media metadata without downloading the file
 */
export async function getMediaInfo(req: Request, res: Response) {
  try {
    const { conversationSid, messageSid, mediaSid } = req.params;

    const media = await twilioClient.conversations.v1
      .conversations(conversationSid)
      .messages(messageSid)
      .fetch();

    const mediaItem = media.media?.find((m: any) => m.sid === mediaSid);

    if (!mediaItem) {
      return res.status(404).json({
        success: false,
        error: "Media not found",
      });
    }

    res.json({
      success: true,
      media: {
        sid: mediaItem.sid,
        content_type: mediaItem.content_type,
        filename: mediaItem.filename,
        size: mediaItem.size,
        category: mediaItem.category,
        url: `/api/media/${conversationSid}/${messageSid}/${mediaSid}`,
      },
    });
  } catch (error) {
    console.error("Error fetching media info:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch media info",
    });
  }
}

