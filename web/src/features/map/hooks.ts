import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMapPinInput, UpdateMapPinInput } from "@dnd-manager/shared";
import { mapApi } from "./api";

const groupMapKey = (groupId: string) => ["groups", groupId, "map"] as const;

export function useGroupMap(groupId: string) {
  return useQuery({
    queryKey: groupMapKey(groupId),
    queryFn: () => mapApi.get(groupId),
    enabled: !!groupId,
  });
}

export function useUploadGroupMap(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => mapApi.upload(groupId, file),
    onSuccess: (map) => queryClient.setQueryData(groupMapKey(groupId), map),
  });
}

export function useCreateMapPin(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMapPinInput) => mapApi.createPin(groupId, input),
    onSuccess: (map) => queryClient.setQueryData(groupMapKey(groupId), map),
  });
}

export function useUpdateMapPin(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pinId, input }: { pinId: string; input: UpdateMapPinInput }) =>
      mapApi.updatePin(groupId, pinId, input),
    onSuccess: (map) => queryClient.setQueryData(groupMapKey(groupId), map),
  });
}

export function useDeleteMapPin(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pinId: string) => mapApi.deletePin(groupId, pinId),
    onSuccess: (map) => queryClient.setQueryData(groupMapKey(groupId), map),
  });
}
