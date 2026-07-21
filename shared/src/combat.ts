import { z } from "zod";
import { dieGroupResultSchema } from "./dice";

// Al iniciar combate o añadir refuerzos: personajes por id + enemigos con
// cuántas copias añadir de cada uno (p.ej. 3 goblins de la misma ficha).
export const addParticipantsSchema = z.object({
  characterIds: z.array(z.string()).default([]),
  enemies: z
    .array(
      z.object({
        enemyId: z.string(),
        count: z.number().int().min(1).max(20),
      }),
    )
    .default([]),
});
export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>;

// El total nunca se acepta del cliente: la fórmula "1d20+bono" se reconstruye
// en el servidor a partir de CombatParticipant.initiativeBonus. `rolls` solo
// se manda cuando el cliente ya animó la física real del 1d20 (igual que
// createRollSchema en dice.ts).
export const rollInitiativeSchema = z.object({
  participantId: z.string(),
  rolls: z.array(dieGroupResultSchema).optional(),
});
export type RollInitiativeInput = z.infer<typeof rollInitiativeSchema>;

export const combatParticipantKindSchema = z.enum(["CHARACTER", "ENEMY"]);
export type CombatParticipantKind = z.infer<typeof combatParticipantKindSchema>;

export const combatParticipantSchema = z.object({
  id: z.string(),
  kind: combatParticipantKindSchema,
  characterId: z.string().nullable(),
  enemyId: z.string().nullable(),
  displayName: z.string(),
  portraitUrl: z.string().nullable(),
  // Presente solo si kind === "CHARACTER" y el visor es Master o el dueño —
  // el cliente lo usa para habilitar el botón de tirar/actuar en su turno.
  ownerId: z.string().nullable(),
  initiativeTotal: z.number().nullable(),
  initiativeBonus: z.number(),
  turnOrder: z.number().nullable(),
});
export type CombatParticipantDto = z.infer<typeof combatParticipantSchema>;

export const combatEncounterSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  sessionId: z.string(),
  round: z.number(),
  currentTurnIndex: z.number().nullable(),
  startedAt: z.string(),
  participants: z.array(combatParticipantSchema),
});
export type CombatEncounterDto = z.infer<typeof combatEncounterSchema>;

export const combatEncounterViewSchema = combatEncounterSchema.nullable();
export type CombatEncounterView = z.infer<typeof combatEncounterViewSchema>;
