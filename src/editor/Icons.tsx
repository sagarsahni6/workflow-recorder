/**
 * Inline SVG Icon Library.
 *
 * Replaces all emoji usage across the UI with crisp, scalable SVG icons.
 * Uses a Lucide-inspired design language: 24×24 viewBox, 1.75px stroke,
 * round caps and joins.
 */

/* eslint-disable react-refresh/only-export-components */
import React from 'react';

interface IconProps {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

const defaults = {
  size: 16,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

function wrap(size: number, className: string | undefined, style: React.CSSProperties | undefined, children: React.ReactNode) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={defaults.viewBox}
      fill={defaults.fill}
      stroke={defaults.stroke}
      strokeWidth={defaults.strokeWidth}
      strokeLinecap={defaults.strokeLinecap}
      strokeLinejoin={defaults.strokeLinejoin}
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
    >
      {children}
    </svg>
  );
}

// ─── Navigation / Globe ───────────────────────────────────────────────
export const IconGlobe = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </>);

// ─── Click / Pointer ──────────────────────────────────────────────────
export const IconPointer = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
    <path d="M13 13l6 6" />
  </>);

// ─── Input / Keyboard ─────────────────────────────────────────────────
export const IconKeyboard = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M8 16h8" />
  </>);

// ─── Select / List ────────────────────────────────────────────────────
export const IconList = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
  </>);

// ─── Checkbox / Check Square ──────────────────────────────────────────
export const IconCheckSquare = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="9 11 12 14 22 4" />
    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
  </>);

// ─── Radio / Circle Dot ──────────────────────────────────────────────
export const IconCircleDot = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
  </>);

// ─── Scroll ───────────────────────────────────────────────────────────
export const IconScroll = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
    <path d="M19 3H8a2 2 0 0 0-2 2v12" />
  </>);

// ─── Hover / Crosshair ───────────────────────────────────────────────
export const IconCrosshair = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <circle cx="12" cy="12" r="10" />
    <line x1="22" y1="12" x2="18" y2="12" />
    <line x1="6" y1="12" x2="2" y2="12" />
    <line x1="12" y1="6" x2="12" y2="2" />
    <line x1="12" y1="22" x2="12" y2="18" />
  </>);

// ─── Key Press / Zap ─────────────────────────────────────────────────
export const IconZap = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </>);

// ─── Upload ───────────────────────────────────────────────────────────
export const IconUpload = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </>);

// ─── Download ─────────────────────────────────────────────────────────
export const IconDownload = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </>);

// ─── Wait / Clock ─────────────────────────────────────────────────────
export const IconClock = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </>);

// ─── Assert / Shield ─────────────────────────────────────────────────
export const IconShield = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <polyline points="9 12 11 14 15 10" />
  </>);

// ─── Condition / Git Branch ──────────────────────────────────────────
export const IconGitBranch = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <line x1="6" y1="3" x2="6" y2="15" />
    <circle cx="18" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <path d="M18 9a9 9 0 0 1-9 9" />
  </>);

// ─── Loop / Repeat ───────────────────────────────────────────────────
export const IconRepeat = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="17 1 21 5 17 9" />
    <path d="M3 11V9a4 4 0 0 1 4-4h14" />
    <polyline points="7 23 3 19 7 15" />
    <path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </>);

// ─── Screenshot / Camera ─────────────────────────────────────────────
export const IconCamera = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </>);

// ─── Clipboard / Copy ────────────────────────────────────────────────
export const IconClipboard = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
  </>);

// ─── Trash / Delete ──────────────────────────────────────────────────
export const IconTrash = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </>);

// ─── Settings / Gear ─────────────────────────────────────────────────
export const IconSettings = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </>);

// ─── Search / Magnifying Glass ───────────────────────────────────────
export const IconSearch = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>);

// ─── Edit / Pencil ───────────────────────────────────────────────────
export const IconEdit = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </>);

// ─── Sparkle / Stars ─────────────────────────────────────────────────
export const IconSparkles = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" fill="currentColor" stroke="none" />
    <path d="M19 13l.75 2.25L22 16l-2.25.75L19 19l-.75-2.25L16 16l2.25-.75L19 13z" fill="currentColor" stroke="none" />
    <path d="M5 17l.5 1.5L7 19l-1.5.5L5 21l-.5-1.5L3 19l1.5-.5L5 17z" fill="currentColor" stroke="none" />
  </>);

// ─── Eye / Preview ───────────────────────────────────────────────────
export const IconEye = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </>);

// ─── Folder ──────────────────────────────────────────────────────────
export const IconFolder = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </>);

// ─── Book / Library ──────────────────────────────────────────────────
export const IconBook = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </>);

// ─── File / Document ─────────────────────────────────────────────────
export const IconFile = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
  </>);

// ─── FileText / Markdown ─────────────────────────────────────────────
export const IconFileText = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
    <polyline points="13 2 13 9 20 9" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </>);

// ─── BarChart / CSV ──────────────────────────────────────────────────
export const IconBarChart = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <line x1="12" y1="20" x2="12" y2="10" />
    <line x1="18" y1="20" x2="18" y2="4" />
    <line x1="6" y1="20" x2="6" y2="16" />
  </>);

// ─── Pause ────────────────────────────────────────────────────────────
export const IconPause = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
    <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" stroke="none" />
  </>);

// ─── Stop / Square ───────────────────────────────────────────────────
export const IconStop = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <rect x="4" y="4" width="16" height="16" rx="2" fill="currentColor" stroke="none" />
  </>);

// ─── Play / Resume ───────────────────────────────────────────────────
export const IconPlay = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polygon points="5 3 19 12 5 21 5 3" fill="currentColor" stroke="none" />
  </>);

// ─── X / Close ───────────────────────────────────────────────────────
export const IconX = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </>);

// ─── Check / Checkmark ──────────────────────────────────────────────
export const IconCheck = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="20 6 9 17 4 12" />
  </>);

// ─── Chevron Up ──────────────────────────────────────────────────────
export const IconChevronUp = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="18 15 12 9 6 15" />
  </>);

// ─── Chevron Down ────────────────────────────────────────────────────
export const IconChevronDown = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="6 9 12 15 18 9" />
  </>);

// ─── Code / Braces ───────────────────────────────────────────────────
export const IconCode = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </>);

// ─── Theater / Playwright ────────────────────────────────────────────
export const IconTheater = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M2 10s3-3 5-3 5 3 5 3 3-3 5-3 5 3 5 3" />
    <path d="M2 17s3-3 5-3 5 3 5 3 3-3 5-3 5 3 5 3" />
    <line x1="2" y1="3" x2="22" y2="3" />
  </>);

// ─── Tent / Puppeteer ────────────────────────────────────────────────
export const IconTent = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <path d="M3.5 21L12 3l8.5 18" />
    <path d="M12 3v18" />
  </>);

// ─── Terminal / Selenium ─────────────────────────────────────────────
export const IconTerminal = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polyline points="4 17 10 11 4 5" />
    <line x1="12" y1="19" x2="20" y2="19" />
  </>);

// ─── Loader / Saving ────────────────────────────────────────────────
export const IconLoader = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <line x1="12" y1="2" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" />
    <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="7.76" y2="16.24" />
    <line x1="16.24" y1="7.76" x2="19.07" y2="4.93" />
  </>);

// ─── Star ────────────────────────────────────────────────────────────
export const IconStar = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </>);

// ─── Arrow Up ────────────────────────────────────────────────────────
export const IconArrowUp = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <line x1="12" y1="19" x2="12" y2="5" />
    <polyline points="5 12 12 5 19 12" />
  </>);

// ─── Arrow Down ──────────────────────────────────────────────────────
export const IconArrowDown = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </>);

// ─── Plus ────────────────────────────────────────────────────────────
export const IconPlus = ({ size = defaults.size, className, style }: IconProps) =>
  wrap(size, className, style, <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>);

// ─── STEP_ICONS Map (JSX equivalents of the emoji map) ───────────────
export const STEP_ICON_COMPONENTS: Record<string, React.FC<IconProps>> = {
  navigate: IconGlobe,
  click: IconPointer,
  input: IconKeyboard,
  select: IconList,
  checkbox: IconCheckSquare,
  radio: IconCircleDot,
  scroll: IconScroll,
  hover: IconCrosshair,
  keyPress: IconZap,
  upload: IconUpload,
  download: IconDownload,
  wait: IconClock,
  waitForElement: IconClock,
  waitForVisible: IconClock,
  waitForEnabled: IconClock,
  waitForText: IconClock,
  waitForURL: IconClock,
  waitForDownload: IconClock,
  waitForNavigation: IconClock,
  assert: IconShield,
  condition: IconGitBranch,
  loop: IconRepeat,
  screenshot: IconCamera,
};

export function StepIcon({ type, size = 14, className, style }: { type: string } & IconProps) {
  const Component = STEP_ICON_COMPONENTS[type] || IconZap;
  return <Component size={size} className={className} style={style} />;
}
