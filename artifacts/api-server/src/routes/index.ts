import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import ordersRouter from "./orders";
import notificationsRouter from "./notifications";
import adminRouter from "./admin";
import ticketsRouter from "./tickets";
import profileRouter from "./profile";
import referralsRouter from "./referrals";
import withdrawalsRouter from "./withdrawals";
import couponsRouter from "./coupons";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(ordersRouter);
router.use(notificationsRouter);
router.use(adminRouter);
router.use(ticketsRouter);
router.use(profileRouter);
router.use(referralsRouter);
router.use(withdrawalsRouter);
router.use(couponsRouter);

export default router;
