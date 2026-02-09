import { Router } from "express";
import { generateTextController, generateHaikuController } from "./openai.controller";

const router = Router();

router.post("/generate", generateTextController);
router.post("/haiku", generateHaikuController);

export default router;

