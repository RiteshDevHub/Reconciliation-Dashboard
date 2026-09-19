import { Router, type IRouter } from "express";
import healthRouter from "./health";
import zohoRouter from "./zoho";
import banksRouter from "./banks";

const router: IRouter = Router();

router.use(healthRouter);
router.use(zohoRouter);
router.use(banksRouter);

export default router;
