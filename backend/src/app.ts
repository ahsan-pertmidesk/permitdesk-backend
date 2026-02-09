import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import router from "./routes";
import { errorHandler } from "./middlewares/error";

const app = express();
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Allow all origins for now
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT','PATCH','DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false })); // <-- add this
app.use(morgan("dev"));

app.use("/api", router);

// 404
app.use((req, res) => res.status(404).json({ error: "Not Found" }));

// Central error handler
app.use(errorHandler);

export default app;