import type { RequestHandler } from "express";
import { getEnemyOrThrow } from "../services/enemyService";
import { getMembership } from "../services/authorization";
import { AppError } from "../errors/AppError";

/**
 * Solo el Master del grupo AL QUE PERTENECE el enemigo (resuelto desde la
 * propia ficha, no del :groupId de la URL) puede crearlo/editarlo/borrarlo —
 * mismo patrón que requireCharacterMaster, evita que el Master de otro grupo
 * toque una ficha ajena adivinando su id.
 */
export const requireEnemyMaster: RequestHandler = async (req, _res, next) => {
  try {
    const enemy = await getEnemyOrThrow((req.params.enemyId ?? req.params.id) as string);
    const membership = await getMembership(enemy.groupId, req.userId!);
    if (!membership || membership.role !== "MASTER") {
      throw new AppError(403, "NOT_GROUP_MASTER", "Solo el Master del grupo puede hacer esto");
    }
    req.enemy = enemy;
    next();
  } catch (err) {
    next(err);
  }
};
