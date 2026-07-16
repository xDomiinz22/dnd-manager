import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CreateGroupInput,
  JoinGroupInput,
  UpdateMemberMusicPermissionInput,
  UpdateMemberRoleInput,
} from "@dnd-manager/shared";
import { groupsApi } from "./api";

export const GROUPS_QUERY_KEY = ["groups"] as const;
export const groupDetailKey = (id: string) => ["groups", id] as const;

export function useGroups() {
  return useQuery({ queryKey: GROUPS_QUERY_KEY, queryFn: groupsApi.list });
}

export function useGroupDetail(id: string) {
  return useQuery({
    queryKey: groupDetailKey(id),
    queryFn: () => groupsApi.detail(id),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateGroupInput) => groupsApi.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY }),
  });
}

export function useJoinGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: JoinGroupInput) => groupsApi.join(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: GROUPS_QUERY_KEY }),
  });
}

export function useRegenerateInviteCode(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => groupsApi.regenerateCode(groupId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) }),
  });
}

export function useRemoveMember(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(groupId, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) }),
  });
}

export function useSetMemberMusicPermission(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateMemberMusicPermissionInput }) =>
      groupsApi.setMemberMusicPermission(groupId, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) }),
  });
}

export function useSetMemberRole(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: string; input: UpdateMemberRoleInput }) =>
      groupsApi.setMemberRole(groupId, userId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupDetailKey(groupId) }),
  });
}
