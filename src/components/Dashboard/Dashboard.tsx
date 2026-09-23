import { lazy, Suspense, useEffect, useState } from 'react'
import type { User } from '../../api/types'
import { useDevices } from '../../hooks/useDevices'
import { SIDE_BY_SIDE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { usePosition } from '../../hooks/usePosition'
import { useSelectedDevice } from '../../hooks/useSelectedDevice'
import { useSlowFlag } from '../../hooks/useSlowFlag'
import { useLogout } from '../../hooks/useSession'
import { readFleetSize, storeFleetSize } from '../../utils/fleetSize'
import { AppShell } from '../AppShell/AppShell'
import { Button } from '../Button/Button'
import { ConnectionBanner, type ConnectionState } from '../ConnectionBanner/ConnectionBanner'
import { DeviceSelector, DeviceSelectorSkeleton } from '../DeviceSelector/DeviceSelector'
import { VehicleCombobox } from '../DeviceSelector/VehicleCombobox'
import { VEHICLE_LIST_MAX, VehicleList, VehicleListSkeleton } from '../DeviceSelector/VehicleList'
import { ErrorState } from '../ErrorState/ErrorState'
import { MapSkeleton } from '../MapSkeleton/MapSkeleton'
import { StatusCard } from '../StatusCard/StatusCard'
import styles from './Dashboard.module.css'

// Leaflet (~150 kB) is only downloaded once there is something to put on a map.
const VehicleMap = lazy(() => import('../VehicleMap/VehicleMap'))

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
  const sideBySide = useMediaQuery(SIDE_BY_SIDE_QUERY)

  const devices = devicesQuery.data
  // A single vehicle is used right away (not one render later via the effect
  // below), so the card appears directly instead of flashing the empty prompt.
  const selectedDevice =
    devices?.find((d) => d.id === selectedId) ?? (devices?.length === 1 ? devices[0] : null)
  const positionQuery = usePosition(selectedDevice?.id ?? null)

  // Remember the fleet size for next session's skeleton
  useEffect(() => {
    if (devices) storeFleetSize(devices.length)
  }, [devices])
  const [cachedFleetSize] = useState(readFleetSize)
  const showsList = (count: number | null) =>
    sideBySide && count !== null && count > 0 && count <= VEHICLE_LIST_MAX

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

  // Mount the map with the first answer about a vehicle, then keep it mounted
  // across vehicle switches (no tile reload; the camera just jumps).
  const [mapMounted, setMapMounted] = useState(false)
  if (!mapMounted && selectedDevice && positionQuery.data !== undefined) setMapMounted(true)

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
        icon={<LogoutIcon />}
        className={styles.logout}
      >
        {/* Visually hidden on very narrow screens; stays the accessible name */}
        <span className={styles.logoutLabel}>Cerrar sesión</span>
      </Button>
    </>
  )

  let panel
  if (devicesQuery.isPending) {
    // Final layout from the first frame: selector + card, in skeleton form
    panel = (
      <>
        {showsList(cachedFleetSize) ? (
          <VehicleListSkeleton rows={cachedFleetSize!} />
        ) : (
          <DeviceSelectorSkeleton />
        )}
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
        {/* Picker by fleet size and layout:
            · ≤ 6 beside the map → list (every status visible at a glance)
            · > 6 anywhere        → searchable combobox
            · few, stacked/mobile → native select (native picker on touch) */}
        {showsList(devices.length) ? (
          <VehicleList
            devices={devices}
            selectedId={selectedDevice?.id ?? null}
            onChange={setSelectedId}
          />
        ) : devices.length > VEHICLE_LIST_MAX ? (
          <VehicleCombobox
            devices={devices}
            selectedId={selectedDevice?.id ?? null}
            onChange={setSelectedId}
          />
        ) : (
          <DeviceSelector
            devices={devices}
            selectedId={selectedDevice?.id ?? null}
            onChange={setSelectedId}
          />
        )}
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
          {selectedDevice && mapMounted ? (
            <Suspense fallback={<MapSkeleton />}>
              <VehicleMap
                device={selectedDevice}
                position={positionQuery.data}
                stale={positionStale}
              />
            </Suspense>
          ) : mapLoading ? (
            <MapSkeleton slow={slow} />
          ) : (
            <div className={styles.mapPlaceholder}>
              <p className={styles.mapHint}>
                {devices && devices.length > 0
                  ? 'Selecciona un vehículo para verlo en el mapa.'
                  : 'No hay vehículos que mostrar en el mapa.'}
              </p>
            </div>
          )}
          <ConnectionBanner state={connection} />
        </>
      }
    />
  )
}

function LogoutIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 3.5H5A1.5 1.5 0 0 0 3.5 5v10A1.5 1.5 0 0 0 5 16.5h3M13 13.5 16.5 10 13 6.5M16.5 10H8" />
    </svg>
  )
}
