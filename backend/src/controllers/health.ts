import { Request, Response } from "express";

export const healthController = (req: Request, res: Response) => {
  res.json({
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
};
  