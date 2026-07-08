import type { GroupMember } from "@prisma/client";
import type { CharacterWithPortrait } from "../services/characterService";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      groupMembership?: GroupMember;
      character?: CharacterWithPortrait;
    }
  }
}

export {};
