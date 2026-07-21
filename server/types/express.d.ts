import type { GroupMember } from "@prisma/client";
import type { CharacterWithPortrait } from "../services/characterService";
import type { EnemyWithPortrait } from "../services/enemyService";

declare global {
  namespace Express {
    interface Request {
      userId?: string;
      groupMembership?: GroupMember;
      character?: CharacterWithPortrait;
      enemy?: EnemyWithPortrait;
    }
  }
}

export {};
