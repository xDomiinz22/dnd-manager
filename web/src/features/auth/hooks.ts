import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { GoogleAuthInput, LoginInput, RegisterInput } from "@dnd-manager/shared";
import { authApi } from "./api";
import { setAccessToken } from "../../lib/tokenStore";

export const ME_QUERY_KEY = ["me"] as const;

export function useMe() {
  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authApi.me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (res) => {
      setAccessToken(res.accessToken);
      queryClient.setQueryData(ME_QUERY_KEY, res.user);
    },
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (res) => {
      setAccessToken(res.accessToken);
      queryClient.setQueryData(ME_QUERY_KEY, res.user);
    },
  });
}

export function useGoogleLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GoogleAuthInput) => authApi.google(input),
    onSuccess: (res) => {
      setAccessToken(res.accessToken);
      queryClient.setQueryData(ME_QUERY_KEY, res.user);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      setAccessToken(null);
      queryClient.setQueryData(ME_QUERY_KEY, null);
    },
  });
}
