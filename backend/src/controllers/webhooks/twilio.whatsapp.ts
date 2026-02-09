import { Request, Response } from "express";
import { handleConversationMessage } from "../../services/twilio-conversations";

export async function handleTwilioWhatsappInbound(req: Request, res: Response) {
  // ACK quickly so Twilio doesn't retry
  res.status(200).end();

  try {
    // Extract basic message data
    const from = String(req.body.From || "");
    const messageBody = String(req.body.Body || "").trim();
    const numMedia = Number(req.body.NumMedia || 0) || 0;

    // Extract media URLs if present
    const mediaUrls: string[] = [];
    const mediaTypes: string[] = [];
    
    for (let i = 0; i < numMedia; i++) {
      const mediaUrl = String(req.body[`MediaUrl${i}`] || "");
      const mediaType = String(req.body[`MediaContentType${i}`] || "");
      
      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
        mediaTypes.push(mediaType);
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📩 Incoming WhatsApp message:");
    console.log("  From:", from);
    console.log("  Body:", messageBody || "(no text)");
    console.log("  Media:", numMedia);
    
    if (numMedia > 0) {
      console.log("  Media Files:");
      mediaUrls.forEach((url, idx) => {
        console.log(`    ${idx + 1}. ${mediaTypes[idx]} - ${url}`);
      });
    }
    
    console.log("  Time:", new Date().toISOString());
    console.log("=".repeat(60));

    // Skip if no content (no text and no media)
    if (!messageBody && mediaUrls.length === 0) {
      console.log("⚠️  Empty message (no text or media), skipping");
      return;
    }

    // Process message through Twilio Conversations API (1-to-1 relay)
    const result = await handleConversationMessage(from, messageBody, mediaUrls);

    console.log("\n📊 Result:", result.success ? "✅ SUCCESS" : "❌ FAILED");
    console.log("   Message:", result.message);
    console.log("=".repeat(60) + "\n");

  } catch (err) {
    console.error("❌ Failed to handle inbound WhatsApp message:", err);
  }
}
