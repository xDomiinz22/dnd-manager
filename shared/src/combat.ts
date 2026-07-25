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

// Bonos que un efecto de combate suma a las tiradas mientras esté activo —
// mismas claves que `character.rawSystem.bonuses` (A14): por tipo de acción
// (mwak/rwak/msak/rsak) y CD de conjuro. Se rellenan solo cuando vienen de
// un `change` reconocido con certeza (ver detectItemEffect.ts en web/) —
// nunca a mano libre por el jugador salvo que sepa la sintaxis de fórmula.
export const combatEffectBonusSchema = z.object({
  attack: z.string().optional(),
  damage: z.string().optional(),
});
export const combatEffectBonusesSchema = z.object({
  mwak: combatEffectBonusSchema.optional(),
  rwak: combatEffectBonusSchema.optional(),
  msak: combatEffectBonusSchema.optional(),
  rsak: combatEffectBonusSchema.optional(),
  spellDc: z.string().optional(),
});
export type CombatEffectBonuses = z.infer<typeof combatEffectBonusesSchema>;

export const combatEffectSchema = z.object({
  id: z.string(),
  name: z.string(),
  roundsRemaining: z.number(),
  bonuses: combatEffectBonusesSchema.nullable(),
});
export type CombatEffectDto = z.infer<typeof combatEffectSchema>;

// El nombre se aplica tal cual; la duración se manda ya convertida a rondas
// (1 ronda = 6s en 5e) — el selector de unidad rondas/minutos/horas vive en
// el cliente, el servidor solo guarda el número final. `bonuses` es opcional:
// solo viene relleno cuando el cliente detectó un bono reconocible en el
// ítem usado (ver detectItemEffect.ts) — un efecto aplicado a mano no trae nada.
export const applyCombatEffectSchema = z.object({
  name: z.string().min(1).max(60),
  roundsRemaining: z.number().int().min(1).max(9999),
  bonuses: combatEffectBonusesSchema.optional(),
});
export type ApplyCombatEffectInput = z.infer<typeof applyCombatEffectSchema>;

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
  effects: z.array(combatEffectSchema),
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
