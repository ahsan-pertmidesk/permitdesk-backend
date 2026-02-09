import { Router } from "express";
import { healthController } from "../controllers/health";

const r = Router();
r.get("/", healthController);
export default r;
