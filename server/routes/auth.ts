import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from "../controllers/authController";

export const authRouter = Router();

authRouter.post("/auth/register", registerHandler);
authRouter.post("/auth/login", loginHandler);
authRouter.post("/auth/refresh", refreshHandler);
authRouter.post("/auth/logout", logoutHandler);
