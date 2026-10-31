/**
 * The JVM Atlas mark: a block of the machine with its lid lifted, an exploded
 * view of one component revealing the live core inside. The mark keeps its own
 * colours on every surface; see docs/BRAND_GUIDELINES.md.
 */
export function LogoMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable="false">
      <rect x="0.5" y="0.5" width="31" height="31" rx="7.5" fill="#0f1218" stroke="#2a303b" />
      <path d="M7 14.4 16 19.6v8L7 22.4Z" fill="#4a5466" />
      <path d="M25 14.4 16 19.6v8l9-5.2Z" fill="#2b313d" />
      <path d="M7 14.4 16 9.2l9 5.2-9 5.2Z" fill="#171b23" />
      <circle cx="16" cy="16.2" r="1.8" fill="#9fd0ff" />
      <path d="M7 8.8 16 3.6l9 5.2-9 5.2Z" fill="#5c93ec" />
      <path
        d="M7 8.8 16 3.6l9 5.2"
        fill="none"
        stroke="#cfe2ff"
        strokeWidth="0.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** "JVM Atlas" set as the wordmark: an engineered sans and an editorial serif. */
export function Wordmark({ className = 'text-[19px]' }: { className?: string }) {
  return (
    <span className={`leading-none whitespace-nowrap ${className}`}>
      <span className="font-sans font-semibold tracking-[-0.015em]">JVM</span>{' '}
      <span className="font-serif tracking-[-0.01em]">Atlas</span>
    </span>
  );
}
