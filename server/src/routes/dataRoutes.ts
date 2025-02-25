import { Router } from "express";
import { generateReport } from "../controllers/dataController";

const router = Router();

router.post("/generate-report", generateReport);

export default router;