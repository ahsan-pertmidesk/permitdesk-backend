import { Router } from "express";
import { handleTwilioWhatsappInbound } from "../../controllers/webhooks/twilio.whatsapp";

const router = Router();
router.post("/", handleTwilioWhatsappInbound);

export default router;
