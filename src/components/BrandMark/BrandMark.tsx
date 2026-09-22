/** App mark: a heading arrow, the same shape language as the vehicle marker. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      <rect width="32" height="32" rx="9" fill="var(--color-accent)" />
      <path d="M16 7 23 24l-7-3.6L9 24Z" fill="var(--color-on-accent)" />
    </svg>
  )
}
