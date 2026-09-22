import { useEffect } from 'react'
import type { User } from '../../api/types'
import { useDevices } from '../../hooks/useDevices'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { usePosition } from '../../hooks/usePosition'
import { useSelectedDevice } from '../../hooks/useSelectedDevice'
import { useSlowFlag } from '../../hooks/useSlowFlag'
import { useLogout } from '../../hooks/useSession'
import { AppShell } from '../AppShell/AppShell'
import { Button } from '../Button/Button'
import { ConnectionBanner, type ConnectionState } from '../ConnectionBanner/ConnectionBanner'
import { DeviceSelector, DeviceSelectorSkeleton } from '../DeviceSelector/DeviceSelector'
import { ErrorState } from '../ErrorState/ErrorState'
import { MapSkeleton } from '../MapSkeleton/MapSkeleton'
import { StatusCard } from '../StatusCard/StatusCard'
import styles from './Dashboard.module.css'

/**
 * Has data on screen, but the latest refresh failed or is paused (offline).
 * Uses failureCount, not isError: isError only flips after all retries are
 * exhausted (~7 s+), and frozen data must be flagged from the first failure.
 */
function isStale(query: {
  data: unknown
  isError: boolean
  failureCount: number
  fetchStatus: string
}) {
  return (
    query.data !== undefined &&
    (query.isError || query.failureCount > 0 || query.fetchStatus === 'paused')
  )
}

export function Dashboard({ user }: { user: User }) {
  const devicesQuery = useDevices()
  const [selectedId, setSelectedId] = useSelectedDevice()
  const logout = useLogout()
  const online = useOnlineStatus()

  const devices = devicesQuery.data
  // A single vehicle is used right away (not one render later via the effect
  // below), so the card appears directly instead of flashing the empty prompt.
  const selectedDevice =
    devices?.find((d) => d.id === selectedId) ?? (devices?.length === 1 ? devices[0] : null)
  const positionQuery = usePosition(selectedDevice?.id ?? null)

  // Keep the URL in sync: record the auto-picked vehicle, drop ids that don't exist.
  useEffect(() => {
    if (!devices) return
    if (selectedId === null && devices.length === 1) setSelectedId(devices[0].id)
    else if (selectedId !== null && !devices.some((d) => d.id === selectedId)) setSelectedId(null)
  }, [devices, selectedId, setSelectedId])

  const positionStale = isStale(positionQuery)
  const connection: ConnectionState = !online
    ? 'offline'
    : positionStale || isStale(devicesQuery)
      ? 'unstable'
      : 'ok'

  const positionLoading = positionQuery.isPending && positionQuery.fetchStatus !== 'idle'
  const mapLoading =
    devicesQuery.isPending || (selectedDevice !== null && positionQuery.data === undefined)
  // Retries of a failing first load can keep the skeleton up for 7 s+: explain the wait.
  const slow = useSlowFlag(devicesQuery.isPending || positionLoading)

  const actions = (
    <>
      <span className={styles.user}>{user.name}</span>
      <Button
        variant="ghost"
        onClick={() => logout.mutate()}
        loading={logout.isPending}
        loadingLabel="Saliendo…"
      >
        Cerrar sesión
      </Button>
    </>
  )

  let panel
  if (devicesQuery.isPending) {
    // Final layout from the first frame: selector + card, in skeleton form
    panel = (
      <>
        <DeviceSelectorSkeleton />
        <StatusCard device={null} position={undefined} isLoading slow={slow} />
      </>
    )
  } else if (devicesQuery.isError && !devices) {
    panel = (
      <ErrorState
        compact
        error={devicesQuery.error}
        context="la lista de vehículos"
        onRetry={() => devicesQuery.refetch()}
        retrying={devicesQuery.isFetching}
        // A way out if the problem is the account/server, not a blip
        secondaryAction={{ label: 'Cerrar sesión', onClick: () => logout.mutate() }}
      />
    )
  } else if (devices && devices.length === 0) {
    panel = (
      <div className={styles.empty}>
        <h2 className={styles.emptyTitle}>Aún no hay vehículos</h2>
        <p className={styles.muted}>
          Esta cuenta no tiene dispositivos asignados. Añádelos desde el panel de Traccar y
          aparecerán aquí automáticamente.
        </p>
      </div>
    )
  } else if (devices) {
    panel = (
      <>
        <DeviceSelector
          devices={devices}
          selectedId={selectedDevice?.id ?? null}
          onChange={setSelectedId}
        />
        {selectedDevice ? (
          <StatusCard
            device={selectedDevice}
            position={positionQuery.data}
            isLoading={positionLoading}
            slow={slow}
            error={positionQuery.error}
            onRetry={() => positionQuery.refetch()}
            retrying={positionQuery.isFetching}
            isStale={positionStale}
          />
        ) : (
          <p className={styles.muted}>Selecciona un vehículo para ver su posición y estado.</p>
        )}
      </>
    )
  }

  return (
    <AppShell
      actions={actions}
      panel={panel}
      map={
        <>
          {mapLoading ? (
            <MapSkeleton slow={slow} />
          ) : (
            <div className={styles.mapPlaceholder}>
              <p className="sr-only">El mapa se mostrará en la siguiente fase.</p>
            </div>
          )}
          <ConnectionBanner state={connection} />
        </>
      }
    />
  )
}
