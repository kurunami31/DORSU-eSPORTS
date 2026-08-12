// Stroke-based SVG icon set (24×24, feather-style). Replaces emoji in the UI
// for a cleaner, more deliberate look.
const PATHS = {
  bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z" />,
  arrow: <><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>,
  chevron: <path d="m6 9 6 6 6-6" />,
  trophy: (
    <>
      <path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v7a5 5 0 0 1-10 0V4z" />
      <path d="M7 6H4a3 3 0 0 0 3 3" /><path d="M17 6h3a3 3 0 0 1-3 3" />
    </>
  ),
  dice: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <circle cx="9" cy="9" r="1.1" /><circle cx="15" cy="9" r="1.1" />
      <circle cx="9" cy="15" r="1.1" /><circle cx="15" cy="15" r="1.1" />
    </>
  ),
  clipboard: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />
      <path d="M8 12h8" /><path d="M8 16h5" />
    </>
  ),
  crown: <path d="M3 18h18M4.5 6.5l3.8 4.4L12 4l3.7 6.9 3.8-4.4L18 17H6z" />,
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  pencil: (
    <>
      <path d="M17 3a2.8 2.8 0 0 1 4 4L8 20l-5 1 1-5z" />
      <path d="m15 5 4 4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  lockOpen: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.8-1.3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  mapPin: (
    <>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
      <circle cx="12" cy="10" r="3" />
    </>
  ),
  facebook: (
    <>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </>
  ),
  users: (
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  sparkles: <path d="M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z" />,
  megaphone: (
    <>
      <path d="m3 11 15-6v14L3 13v-2z" />
      <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
    </>
  ),
  gamepad: (
    <>
      <path d="M6 12h4" /><path d="M8 10v4" />
      <path d="M7 6h10a5 5 0 0 1 4.9 6l-.4 3.2a2.5 2.5 0 0 1-4.9.2L16 13H8l-.6 2.4a2.5 2.5 0 0 1-4.9-.2L2.1 12A5 5 0 0 1 7 6z" />
    </>
  ),
  crosshair: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  flame: <path d="M12 3c1.2 3.5-4 5.5-4 10a4 4 0 0 0 8 0c0-1.5-.5-2.5-1-3.5 1.8 1 3 2.7 3 5a6 6 0 0 1-12 0c0-6 6-8 6-11.5z" />,
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  medal: (
    <>
      <path d="M7 21V8a5 5 0 0 1 10 0v13" />
      <path d="M7 8H4a0 0 0 0 0 0 0v3a2 2 0 0 0 2 2h1M17 8h3a0 0 0 0 1 0 0v3a2 2 0 0 1-2 2h-1" />
      <circle cx="12" cy="8" r="3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 18h6" /><path d="M10 22h4" />
      <path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8a10 10 0 0 1-10 10z" />
      <path d="M2 21c0-3 1.8-5.5 3.5-7" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" /><path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
    </>
  ),
  plus: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  x: (<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
};

export default function Icon({ name, size = 18, strokeWidth = 2, className = '', ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`icon ${className}`}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name] || null}
    </svg>
  );
}
