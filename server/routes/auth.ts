import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  googleHandler,
  loginHandler,
  logoutHandler,
  refreshHandler,
  registerHandler,
} from "../controllers/authController";

export const authRouter = Router();

// Frena fuerza bruta/credential stuffing contra login y registro (no había
// ningún límite antes). No se aplica a /refresh ni /logout: el frontend
// llama a /refresh automáticamente en cada 401, así que limitarlo golpearía
// a usuarios legítimos, no a un atacante.
const authAttemptsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_ATTEMPTS", message: "Demasiados intentos. Prueba más tarde." },
  },
});

authRouter.post("/auth/register", authAttemptsLimiter, registerHandler);
authRouter.post("/auth/login", authAttemptsLimiter, loginHandler);
authRouter.post("/auth/google", authAttemptsLimiter, googleHandler);
authRouter.post("/auth/refresh", refreshHandler);
authRouter.post("/auth/logout", logoutHandler);
