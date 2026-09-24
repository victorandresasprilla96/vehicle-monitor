/** App mark: a heading arrow on an ink tile (inverts in dark theme). Same shape as the vehicle marker. */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="40" height="40" rx="10" fill="var(--color-text)" />
      <path
        d="M20 9.5 28.5 29.5 20 25.2 11.5 29.5Z"
        fill="none"
        stroke="var(--color-surface)"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />
    </svg>
  )
}
