import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateEnemyInput,
  ImportEnemyInput,
  ImportEnemyMdInput,
  UpdateEnemyInput,
} from "@dnd-manager/shared";
import { enemiesApi } from "./api";

export const enemiesKey = (groupId: string) => ["groups", groupId, "enemies"] as const;
export const enemyKey = (groupId: string, enemyId: string) =>
  ["groups", groupId, "enemies", enemyId] as const;

export function useEnemies(groupId: string) {
  return useQuery({
    queryKey: enemiesKey(groupId),
    queryFn: () => enemiesApi.list(groupId),
    enabled: !!groupId,
  });
}

export function useEnemy(groupId: string, enemyId: string) {
  return useQuery({
    queryKey: enemyKey(groupId, enemyId),
    queryFn: () => enemiesApi.get(groupId, enemyId),
    enabled: !!groupId && !!enemyId,
  });
}

export function useCreateEnemy(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateEnemyInput) => enemiesApi.create(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: enemiesKey(groupId) }),
  });
}

export function useImportEnemy(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportEnemyInput) => enemiesApi.import(groupId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: enemiesKey(groupId) }),
  });
}

export function useImportEnemyMd(groupId: string, enemyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ImportEnemyMdInput) => enemiesApi.importMd(groupId, enemyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enemyKey(groupId, enemyId) });
      queryClient.invalidateQueries({ queryKey: enemiesKey(groupId) });
    },
  });
}

export function useUpdateEnemy(groupId: string, enemyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEnemyInput) => enemiesApi.update(groupId, enemyId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enemyKey(groupId, enemyId) });
      queryClient.invalidateQueries({ queryKey: enemiesKey(groupId) });
    },
  });
}

export function useDeleteEnemy(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enemyId: string) => enemiesApi.remove(groupId, enemyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: enemiesKey(groupId) }),
  });
}

export function useEnemyImages(groupId: string, enemyId: string) {
  return useQuery({
    queryKey: [...enemyKey(groupId, enemyId), "images"],
    queryFn: () => enemiesApi.listImages(groupId, enemyId),
    enabled: !!groupId && !!enemyId,
  });
}

export function useUploadEnemyImage(groupId: string, enemyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => enemiesApi.uploadImage(groupId, enemyId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enemyKey(groupId, enemyId) });
      queryClient.invalidateQueries({ queryKey: [...enemyKey(groupId, enemyId), "images"] });
      queryClient.invalidateQueries({ queryKey: enemiesKey(groupId) });
    },
  });
}

export function useDeleteEnemyImage(groupId: string, enemyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (assetId: string) => enemiesApi.deleteImage(groupId, enemyId, assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: enemyKey(groupId, enemyId) });
      queryClient.invalidateQueries({ queryKey: [...enemyKey(groupId, enemyId), "images"] });
    },
  });
}
