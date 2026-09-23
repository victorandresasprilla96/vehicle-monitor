import { Dashboard } from './components/Dashboard/Dashboard'
import { ErrorState } from './components/ErrorState/ErrorState'
import { LoginScreen } from './components/LoginScreen/LoginScreen'
import { SplashScreen } from './components/SplashScreen/SplashScreen'
import { useSession, useSessionNotice } from './hooks/useSession'
import styles from './App.module.css'

export default function App() {
  const session = useSession()
  const notice = useSessionNotice()

  if (session.isPending) return <SplashScreen />

  // Couldn't even check the session (server down / CORS): the login form would fail too.
  if (session.isError) {
    return (
      <main className={styles.fullscreen}>
        <ErrorState
          error={session.error}
          onRetry={() => session.refetch()}
          retrying={session.isFetching}
          autoRetrySeconds={15}
          headingLevel={1} // the error is the whole page
        />
      </main>
    )
  }

  return session.data ? <Dashboard user={session.data} /> : <LoginScreen notice={notice} />
}
