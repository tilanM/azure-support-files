import { Router } from "express";

import postInteropController from "../controllers/postInterop.mjs";

const router = Router();

router.post("/", postInteropController);

export default router;
