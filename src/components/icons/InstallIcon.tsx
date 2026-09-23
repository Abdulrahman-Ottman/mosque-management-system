/**
 * "Install to device" mark: a phone with an arrow coming down into it.
 *
 * Drawn with `currentColor` and no fills, so it takes the colour of whatever it sits
 * in — gold on the login card, gold on the dark navbar, white on hover.
 */
export function InstallIcon({
  className,
  ...rest
}: { className?: string } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...rest}
    >
      {/* Device outline, open at the top so the arrow reads as entering it. */}
      <path d="M8 3.5H6.8A1.8 1.8 0 0 0 5 5.3v13.4a1.8 1.8 0 0 0 1.8 1.8h10.4a1.8 1.8 0 0 0 1.8-1.8V5.3a1.8 1.8 0 0 0-1.8-1.8H16" />
      {/* Home indicator. */}
      <path d="M10.5 17.6h3" />
      {/* Arrow shaft and head. */}
      <path d="M12 3.2v7.6" />
      <path d="m9.1 8.2 2.9 2.9 2.9-2.9" />
    </svg>
  );
}
