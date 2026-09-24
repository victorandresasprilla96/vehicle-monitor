import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { User } from '../../api/types'
import { useDevices } from '../../hooks/useDevices'
import { useDocumentTitle } from '../../hooks/useDocumentTitle'
import { SIDE_BY_SIDE_QUERY, useMediaQuery } from '../../hooks/useMediaQuery'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'
import { usePosition } from '../../hooks/usePosition'
import { useSelectedDevice } from '../../hooks/useSelectedDevice'
import { useSlowFlag } from '../../hooks/useSlowFlag'
import { useLogout } from '../../hooks/useSession'
import { readFleetSize, storeFleetSize } from '../../utils/fleetSize'
import { STATUS_LABEL } from '../../utils/status'
import { knotsToKmh } from '../../utils/units'
import { AppShell, PANEL_ID } from '../AppShell/AppShell'
import { ConnectionBanner, type ConnectionState } from '../ConnectionBanner/ConnectionBanner'
import { DeviceSelector, DeviceSelectorSkeleton } from '../DeviceSelector/DeviceSelector'
import { VehicleCombobox } from '../DeviceSelector/VehicleCombobox'
import { VEHICLE_LIST_MAX, VehicleList, VehicleListSkeleton } from '../DeviceSelector/VehicleList'
import { ErrorState } from '../ErrorState/ErrorState'
import { MapSkeleton } from '../MapSkeleton/MapSkeleton'
import { Skeleton } from '../Skeleton/Skeleton'
import { StatusCard } from '../StatusCard/StatusCard'
import { UserMenu } from '../UserMenu/UserMenu'
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
  // With ?device= in the URL the position can load in parallel with the vehicle
  // list instead of after it (shorter critical chain to the first map paint).
  const positionQuery = usePosition(selectedDevice?.id ?? (devices ? null : selectedId))

  // Start downloading the map code now, in parallel with the API calls, rather
  // than when the first position arrives.
  useEffect(() => {
    void import('../VehicleMap/VehicleMap')
  }, [])
  // Follow-the-vehicle camera: shared by the card switch, the map pill, the
  // locate button and map dragging. Re-engages on every vehicle switch.
  const [following, setFollowing] = useState(true)
  const [followedId, setFollowedId] = useState(selectedDevice?.id ?? null)
  if (followedId !== (selectedDevice?.id ?? null)) {
    setFollowedId(selectedDevice?.id ?? null)
    setFollowing(true)
  }
  // Side panel + floating card hidden to give the map the whole width (desktop)
  const [collapsed, setCollapsed] = useState(false)

  useDocumentTitle(
    selectedDevice ? `${selectedDevice.name} · ${STATUS_LABEL[selectedDevice.status]}` : 'Flota',
  )

  // Remember the fleet size for next session's skeleton
  useEffect(() => {
    if (devices) storeFleetSize(devices.length)
  }, [devices])
  const [cachedFleetSize] = useState(readFleetSize)
  const showsList = (count: number | null) =>
    sideBySide && count !== null && count > 0 && count <= VEHICLE_LIST_MAX

  // The picker changes type with the layout (select ↔ list when the phone
  // rotates). If it had keyboard focus, hand focus to the new control.
  const pickerRef = useRef<HTMLDivElement>(null)
  const pickerHadFocus = useRef(false)
  const pickerKind = !devices
    ? 'none'
    : showsList(devices.length)
      ? 'list'
      : devices.length > VEHICLE_LIST_MAX
        ? 'combobox'
        : 'select'
  useLayoutEffect(() => {
    if (!pickerHadFocus.current || !pickerRef.current) return
    if (pickerRef.current.contains(document.activeElement)) return
    // querySelector with a selector list returns the first match in *document*
    // order, so ask for the checked radio explicitly before any fallback.
    const root = pickerRef.current
    ;(
      root.querySelector<HTMLElement>('input[type=radio]:checked') ??
      root.querySelector<HTMLElement>('select, input[role=combobox], input[type=radio]')
    )?.focus()
  }, [pickerKind])

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

  const onlineCount = devices?.filter((d) => d.status === 'online').length ?? 0
  // Rendered (as a placeholder) while the list loads, so the header doesn't shift
  const actions = devicesQuery.isPending ? (
    <p className={styles.fleetPill} aria-hidden="true">
      <span className={styles.fleetDot} />
      <Skeleton text="0 de 0 en línea" />
    </p>
  ) : (
    devices &&
    devices.length > 0 && (
      <p className={styles.fleetPill} data-all-online={onlineCount === devices.length || undefined}>
        <span className={styles.fleetDot} aria-hidden="true" />
        {onlineCount} de {devices.length} en línea
      </p>
    )
  )
  const account = (
    <UserMenu
      name={user.name}
      email={user.email}
      onLogout={() => logout.mutate()}
      loggingOut={logout.isPending}
    />
  )

  const selectedLive = positionQuery.data
    ? {
        speedKmh: knotsToKmh(positionQuery.data.speed),
        fixTime: positionQuery.data.fixTime,
      }
    : undefined

  const card = !devices ? (
    devicesQuery.isPending ? (
      <StatusCard
        device={null}
        position={undefined}
        isLoading
        slow={slow}
        onCollapse={sideBySide ? () => setCollapsed(true) : undefined}
        collapseControls={PANEL_ID}
      />
    ) : null
  ) : selectedDevice ? (
    <StatusCard
      device={selectedDevice}
      position={positionQuery.data}
      isLoading={positionLoading}
      slow={slow}
      error={positionQuery.error}
      onRetry={() => positionQuery.refetch()}
      retrying={positionQuery.isFetching}
      isStale={positionStale}
      following={following}
      onFollowingChange={setFollowing}
      onCollapse={sideBySide ? () => setCollapsed(true) : undefined}
      collapseControls={PANEL_ID}
    />
  ) : null

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
        {/* Beside the map the card floats over it (mapOverlay); on mobile it's here */}
        {!sideBySide && card}
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
        <div
          ref={pickerRef}
          className={styles.picker}
          onFocus={() => (pickerHadFocus.current = true)}
          onBlur={(e) => {
            // Removal of the focused control fires no blur, so "had focus" survives a swap
            if (!e.currentTarget.contains(e.relatedTarget as Node)) pickerHadFocus.current = false
          }}
        >
          {/* Picker by fleet size and layout:
            · ≤ 6 beside the map → list (every status visible at a glance)
            · > 6 anywhere        → searchable combobox
            · few, stacked/mobile → native select (native picker on touch) */}
          {showsList(devices.length) ? (
            <VehicleList
              devices={devices}
              selectedId={selectedDevice?.id ?? null}
              onChange={setSelectedId}
              selectedLive={selectedLive}
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
        </div>
        {selectedDevice ? (
          !sideBySide && card
        ) : (
          <p className={styles.muted}>Selecciona un vehículo para ver su posición y estado.</p>
        )}
      </>
    )
  }

  return (
    <AppShell
      actions={actions}
      account={account}
      panel={panel}
      mapOverlay={sideBySide ? card : null}
      collapsed={collapsed}
      onExpand={() => setCollapsed(false)}
      map={
        <>
          {selectedDevice && mapMounted ? (
            <Suspense fallback={<MapSkeleton />}>
              <VehicleMap
                device={selectedDevice}
                position={positionQuery.data}
                stale={positionStale}
                following={following}
                onFollowingChange={setFollowing}
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
