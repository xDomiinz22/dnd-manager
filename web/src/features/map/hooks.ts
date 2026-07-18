import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateMapPinInput,
  GroupMap,
  MapSummary,
  UpdateMapMetaInput,
  UpdateMapPinInput,
} from "@dnd-manager/shared";
import { mapApi } from "./api";

const mapsListKey = (groupId: string) => ["groups", groupId, "maps"] as const;
const mapKey = (groupId: string, mapId: string) => ["groups", groupId, "maps", mapId] as const;

export function useGroupMaps(groupId: string) {
  return useQuery({
    queryKey: mapsListKey(groupId),
    queryFn: () => mapApi.list(groupId),
    enabled: !!groupId,
  });
}

export function useGroupMap(groupId: string, mapId: string | null) {
  return useQuery({
    queryKey: mapKey(groupId, mapId ?? ""),
    queryFn: () => mapApi.get(groupId, mapId!),
    enabled: !!groupId && !!mapId,
  });
}

export function useCreateMap(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      file,
      title,
      continent,
    }: {
      file: File;
      title: string;
      continent: string | null;
    }) => mapApi.create(groupId, file, title, continent),
    onSuccess: (map) => {
      queryClient.setQueryData(mapKey(groupId, map.id), map);
      queryClient.invalidateQueries({ queryKey: mapsListKey(groupId) });
    },
  });
}

export function useUpdateMapMeta(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, input }: { mapId: string; input: UpdateMapMetaInput }) =>
      mapApi.updateMeta(groupId, mapId, input),
    onSuccess: (summary) => {
      queryClient.setQueryData<MapSummary[]>(mapsListKey(groupId), (list) =>
        list?.map((m) => (m.id === summary.id ? summary : m)),
      );
      queryClient.setQueryData<GroupMap>(mapKey(groupId, summary.id), (map) =>
        map ? { ...map, title: summary.title, continent: summary.continent } : map,
      );
    },
  });
}

export function useReplaceMapImage(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, file }: { mapId: string; file: File }) =>
      mapApi.replaceImage(groupId, mapId, file),
    onSuccess: (map) => queryClient.setQueryData(mapKey(groupId, map.id), map),
  });
}

export function useDeleteMap(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mapId: string) => mapApi.delete(groupId, mapId),
    onSuccess: (_data, mapId) => {
      queryClient.removeQueries({ queryKey: mapKey(groupId, mapId) });
      queryClient.invalidateQueries({ queryKey: mapsListKey(groupId) });
    },
  });
}

export function useCreateMapPin(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, input }: { mapId: string; input: CreateMapPinInput }) =>
      mapApi.createPin(groupId, mapId, input),
    onSuccess: (map) => queryClient.setQueryData(mapKey(groupId, map.id), map),
  });
}

export function useUpdateMapPin(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      mapId,
      pinId,
      input,
    }: {
      mapId: string;
      pinId: string;
      input: UpdateMapPinInput;
    }) => mapApi.updatePin(groupId, mapId, pinId, input),
    onSuccess: (map) => queryClient.setQueryData(mapKey(groupId, map.id), map),
  });
}

export function useDeleteMapPin(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ mapId, pinId }: { mapId: string; pinId: string }) =>
      mapApi.deletePin(groupId, mapId, pinId),
    onSuccess: (map) => queryClient.setQueryData(mapKey(groupId, map.id), map),
  });
}
