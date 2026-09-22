import { useEffect } from 'react'
import type { User } from '../../api/types'
import { useDevices } from '../../hooks/useDevices'
import { usePosition } from '../../hooks/usePosition'
import { useSelectedDevice } from '../../hooks/useSelectedDevice'
import { useLogout } from '../../hooks/useSession'
import { AppShell } from '../AppShell/AppShell'
import { Button } from '../Button/Button'
import { DeviceSelector } from '../DeviceSelector/DeviceSelector'
import { ErrorState } from '../ErrorState/ErrorState'
import { StatusCard } from '../StatusCard/StatusCard'
import styles from './Dashboard.module.css'

export function Dashboard({ user }: { user: User }) {
  const devicesQuery = useDevices()
  const [selectedId, setSelectedId] = useSelectedDevice()
  const logout = useLogout()

  const devices = devicesQuery.data
  const selectedDevice = devices?.find((d) => d.id === selectedId) ?? null
  const positionQuery = usePosition(selectedDevice?.id ?? null)

  // Keep the URL selection valid: auto-pick the only vehicle, drop ids that don't exist.
  useEffect(() => {
    if (!devices) return
    if (selectedId === null && devices.length === 1) setSelectedId(devices[0].id)
    else if (selectedId !== null && !devices.some((d) => d.id === selectedId)) setSelectedId(null)
  }, [devices, selectedId, setSelectedId])

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
    panel = <p className={styles.muted}>Cargando vehículos…</p>
  } else if (devicesQuery.isError && !devices) {
    panel = (
      <ErrorState
        error={devicesQuery.error}
        onRetry={() => devicesQuery.refetch()}
        retrying={devicesQuery.isFetching}
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
        <DeviceSelector devices={devices} selectedId={selectedId} onChange={setSelectedId} />
        {selectedDevice ? (
          <StatusCard
            device={selectedDevice}
            position={positionQuery.data}
            isLoading={positionQuery.isPending}
            isStale={positionQuery.isError && positionQuery.data !== undefined}
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
        <div className={styles.mapPlaceholder}>
          <p className="sr-only">El mapa se mostrará en la siguiente fase.</p>
        </div>
      }
    />
  )
}
