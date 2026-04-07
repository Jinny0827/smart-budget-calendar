import { Router } from "express";
import { authenticationToken} from "../middleware/auth";
import { getMyActivity } from "../controllers/activity-controller";

const router = Router();
router.get("/", authenticationToken , getMyActivity);

export default router;