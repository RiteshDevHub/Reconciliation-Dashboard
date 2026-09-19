import { Router, type IRouter } from "express";
import healthRouter from "./health";
import zohoRouter from "./zoho";

const router: IRouter = Router();

router.use(healthRouter);
router.use(zohoRouter);

export default router;
