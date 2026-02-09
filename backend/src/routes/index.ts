import { Router } from "express";
import health from "./health";
import twilioWhatsapp from "./webhooks/twilio.whatsapp";
import conversations from "./conversations";
import authRoutes from "../modules/auth/auth.routes";
import hubspotRoutes from "../modules/hubspot/hubspot.router"
import openaiRoutes from "../modules/openAi/openai.router";
import media from "./media";
import faqRoutes from "../modules/public/FAQs/faq.routes";
import questionRoutes from "../modules/messages/question.routes";
import conversationsRoutes from "../modules/conversations/conversation.routes";
import initialWorkFlowQuestionRoutes from "../modules/initialWorkFlow/initialWorkFlow.routes"
import { storageRoutes } from "../modules/uploder/presignedUrl.routes";
import contactRoutes from "../modules/contact/contact.routes";

const router = Router();
router.use("/health", health);
router.use("/webhooks/twilio/whatsapp", twilioWhatsapp); // POST /api/webhooks/twilio/whatsapp
router.use("/conversations", conversations); // GET /api/conversations (Twilio conversations)
router.use("/db/questions", questionRoutes); // Database questions CRUD
router.use("/media", media); // GET /api/media/:conversationSid/:messageSid/:mediaSid
router.use("/hubspot", hubspotRoutes);
router.use("/auth", authRoutes);
router.use("/openai", openaiRoutes);
router.use("/faqs", faqRoutes);
router.use("/question", questionRoutes);
router.use("/conversation", conversationsRoutes);
router.use("/storage", storageRoutes);
router.use("/initial-work-flow-question", initialWorkFlowQuestionRoutes);
router.use("/contacts", contactRoutes);


export default router;
