import { Router } from "express";
import { getMedia, getMediaInfo } from "../controllers/media";

const router = Router();

// Get media file (download/view)
router.get("/:conversationSid/:messageSid/:mediaSid", getMedia);

// Get media metadata
router.get("/:conversationSid/:messageSid/:mediaSid/info", getMediaInfo);

export default router;

