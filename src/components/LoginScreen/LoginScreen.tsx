import { useId, useRef, useState, type FormEvent } from 'react'
import { isApiError } from '../../api/errors'
import type { SessionNotice } from '../../api/queryClient'
import { useLogin } from '../../hooks/useSession'
import { errorCopy } from '../../utils/errorCopy'
import { BrandMark } from '../BrandMark/BrandMark'
import { Button } from '../Button/Button'
import { ThemeToggle } from '../ThemeToggle/ThemeToggle'
import styles from './LoginScreen.module.css'

const SERVER_HOST = (() => {
  try {
    return new URL(import.meta.env.VITE_TRACCAR_TARGET || 'https://demo4.traccar.org').host
  } catch {
    return 'Traccar'
  }
})()

const NOTICE_COPY: Record<Exclude<SessionNotice, null>, string> = {
  expired: 'Tu sesión ha caducado. Vuelve a iniciar sesión para seguir monitorizando.',
  'logged-out': 'Has cerrado sesión correctamente.',
}

type FieldErrors = Partial<Record<'email' | 'password', string>>

export function LoginScreen({ notice }: { notice: SessionNotice }) {
  const loginMutation = useLogin()
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const ids = {
    heading: useId(),
    email: useId(),
    emailError: useId(),
    password: useId(),
    passwordError: useId(),
    formError: useId(),
  }

  const serverError = loginMutation.error
  const isAuthFailure = isApiError(serverError) && serverError.kind === 'auth'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loginMutation.isPending) return

    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') ?? '').trim()
    const password = String(data.get('password') ?? '')

    const errors: FieldErrors = {}
    if (!email) errors.email = 'Introduce tu usuario o email.'
    if (!password) errors.password = 'Introduce tu contraseña.'
    setFieldErrors(errors)

    // Move focus to the first invalid field so the error is announced in context.
    if (errors.email) return emailRef.current?.focus()
    if (errors.password) return passwordRef.current?.focus()

    loginMutation.mutate(
      { email, password },
      {
        onError: (error) => {
          // Wrong credentials: put the operator back in the password field, selected.
          if (isApiError(error) && error.kind === 'auth') passwordRef.current?.select()
        },
      },
    )
  }

  const describedBy = (fieldErrorId: string, hasFieldError: boolean) =>
    [hasFieldError && fieldErrorId, isAuthFailure && ids.formError].filter(Boolean).join(' ') ||
    undefined

  return (
    <div className={styles.screen}>
      <div className={styles.topBar}>
        <ThemeToggle />
      </div>

      <main className={styles.main}>
        <section className={styles.card} aria-labelledby={ids.heading}>
          <header className={styles.header}>
            <BrandMark size={40} />
            <h1 id={ids.heading} className={styles.title}>
              Monitor de flota
            </h1>
            <p className={styles.subtitle}>Inicia sesión para ver tus vehículos en tiempo real.</p>
          </header>

          {notice && !serverError && (
            <p className={styles.notice} role="status" data-tone={notice}>
              {NOTICE_COPY[notice]}
            </p>
          )}

          {serverError && (
            <div id={ids.formError} className={styles.formError} role="alert">
              <strong className={styles.formErrorTitle}>{errorCopy(serverError).title}</strong>
              <span>{errorCopy(serverError).description}</span>
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor={ids.email} className={styles.label}>
                Usuario o email
              </label>
              <input
                ref={emailRef}
                id={ids.email}
                name="email"
                type="text"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className={styles.input}
                aria-invalid={Boolean(fieldErrors.email) || isAuthFailure || undefined}
                aria-describedby={describedBy(ids.emailError, Boolean(fieldErrors.email))}
                onChange={() =>
                  fieldErrors.email && setFieldErrors((e) => ({ ...e, email: undefined }))
                }
              />
              {fieldErrors.email && (
                <p id={ids.emailError} className={styles.fieldError}>
                  {fieldErrors.email}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor={ids.password} className={styles.label}>
                Contraseña
              </label>
              <div className={styles.passwordWrap}>
                <input
                  ref={passwordRef}
                  id={ids.password}
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  className={styles.input}
                  aria-invalid={Boolean(fieldErrors.password) || isAuthFailure || undefined}
                  aria-describedby={describedBy(ids.passwordError, Boolean(fieldErrors.password))}
                  onChange={() =>
                    fieldErrors.password && setFieldErrors((e) => ({ ...e, password: undefined }))
                  }
                />
                <button
                  type="button"
                  className={styles.reveal}
                  aria-pressed={showPassword}
                  aria-controls={ids.password}
                  onClick={() => setShowPassword((v) => !v)}
                >
                  <span className="sr-only">Mostrar contraseña</span>
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id={ids.passwordError} className={styles.fieldError}>
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              loading={loginMutation.isPending}
              loadingLabel="Conectando…"
              className={styles.submit}
            >
              Entrar
            </Button>
          </form>

          <p className={styles.server}>
            <ServerIcon />
            <span>
              Servidor: <span className={styles.serverHost}>{SERVER_HOST}</span>
            </span>
          </p>
        </section>
      </main>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M1.7 10s3-5.8 8.3-5.8 8.3 5.8 8.3 5.8-3 5.8-8.3 5.8S1.7 10 1.7 10Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 4.5a8 8 0 0 1 2-.3c5.3 0 8.3 5.8 8.3 5.8a14 14 0 0 1-2.2 2.9M5.3 5.8C3 7.4 1.7 10 1.7 10s3 5.8 8.3 5.8c1.6 0 3-.5 4.2-1.2M8.2 8.2a2.5 2.5 0 0 0 3.6 3.6M2.5 2.5l15 15" />
    </svg>
  )
}

function ServerIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      <rect x="2" y="2.5" width="12" height="4.5" rx="1.2" />
      <rect x="2" y="9" width="12" height="4.5" rx="1.2" />
      <path d="M4.5 4.75h.01M4.5 11.25h.01" strokeLinecap="round" strokeWidth="2" />
    </svg>
  )
}
