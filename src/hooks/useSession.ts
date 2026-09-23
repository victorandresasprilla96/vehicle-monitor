import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys, type SessionNotice } from '../api/queryClient'
import { getSession, login, logout } from '../api/traccar'
import type { User } from '../api/types'
import { hasSessionHint, setSessionHint } from '../utils/sessionHint'

/** Current user restored from the session cookie; null when logged out. */
export function useSession() {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: async ({ signal }) => {
      if (!hasSessionHint()) return null // never logged in here: skip the certain 404
      const user = await getSession(signal)
      if (!user) setSessionHint(false)
      return user
    },
    staleTime: Infinity,
  })
}

/** Why we're on the login screen (session expired, explicit logout…). */
export function useSessionNotice(): SessionNotice {
  const { data } = useQuery<SessionNotice>({
    queryKey: queryKeys.sessionNotice,
    queryFn: () => null,
    staleTime: Infinity,
    initialData: null,
  })
  return data
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      login(email, password),
    onSuccess: (user) => {
      setSessionHint(true)
      queryClient.setQueryData<SessionNotice>(queryKeys.sessionNotice, null)
      queryClient.setQueryData<User | null>(queryKeys.session, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logout,
    // Even if the server call fails, the operator asked to leave: clear local state.
    onSettled: () => {
      setSessionHint(false)
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== queryKeys.session[0] })
      queryClient.setQueryData<SessionNotice>(queryKeys.sessionNotice, 'logged-out')
      queryClient.setQueryData<User | null>(queryKeys.session, null)
    },
  })
}
