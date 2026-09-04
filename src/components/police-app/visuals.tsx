"use client";

// ── Shared visual identity for the standalone Police App ──
// The signature artwork: a police shield badge STANDING IN FRONT of a
// guesthouse — used on the login screen and as the Room Availability hero.

import { ROOM_STATUS_STYLES, type RoomStatus } from "@/lib/police-app-status";

/**
 * Full hero illustration: night scene, city skyline, a lit guesthouse,
 * and a gold police shield standing guard right in front of the house.
 */
export function PoliceHouseHero({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 420 240"
      className={className}
      role="img"
      aria-label="Police badge standing in front of a guesthouse"
    >
      <defs>
        <linearGradient id="phh-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B1D3A" />
          <stop offset="1" stopColor="#173B6B" />
        </linearGradient>
        <linearGradient id="phh-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="0.5" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#D97706" />
        </linearGradient>
        <linearGradient id="phh-window" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FDE68A" />
          <stop offset="1" stopColor="#F59E0B" />
        </linearGradient>
        <radialGradient id="phh-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FBBF24" stopOpacity="0.45" />
          <stop offset="1" stopColor="#FBBF24" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Night sky */}
      <rect width="420" height="240" fill="url(#phh-sky)" />

      {/* Stars */}
      <g fill="#E2E8F0">
        <circle cx="36" cy="34" r="1.4" opacity="0.8" />
        <circle cx="90" cy="22" r="1" opacity="0.55" />
        <circle cx="150" cy="44" r="1.2" opacity="0.7" />
        <circle cx="210" cy="20" r="1" opacity="0.5" />
        <circle cx="268" cy="38" r="1.3" opacity="0.65" />
        <circle cx="330" cy="24" r="1" opacity="0.55" />
        <circle cx="384" cy="44" r="1.4" opacity="0.75" />
        <circle cx="404" cy="16" r="1" opacity="0.5" />
        <circle cx="60" cy="66" r="1" opacity="0.4" />
        <circle cx="360" cy="70" r="1.1" opacity="0.45" />
      </g>

      {/* Crescent moon */}
      <path
        d="M372 84a16 16 0 1 1-14-23 13 13 0 1 0 14 23Z"
        fill="#E2E8F0"
        opacity="0.85"
      />

      {/* City skyline silhouette (behind the house) */}
      <g fill="#0D2244" opacity="0.85">
        <rect x="0" y="150" width="42" height="54" />
        <rect x="48" y="132" width="34" height="72" />
        <rect x="88" y="158" width="30" height="46" />
        <rect x="124" y="142" width="26" height="62" />
        <rect x="156" y="164" width="24" height="40" />
        <rect x="356" y="160" width="30" height="44" />
        <rect x="392" y="146" width="28" height="58" />
        {/* tiny lit windows on skyline */}
        <rect x="56" y="142" width="5" height="6" fill="#F5B301" opacity="0.55" />
        <rect x="68" y="154" width="5" height="6" fill="#F5B301" opacity="0.4" />
        <rect x="130" y="152" width="4" height="5" fill="#F5B301" opacity="0.45" />
      </g>

      {/* Ground */}
      <rect x="0" y="204" width="420" height="36" fill="#0A1A33" />
      <line x1="0" y1="204.5" x2="420" y2="204.5" stroke="#1E3A66" strokeWidth="1.5" />

      {/* ── The guesthouse ── */}
      <g>
        {/* chimney */}
        <rect x="326" y="78" width="16" height="34" fill="#16305A" />
        <rect x="323" y="74" width="22" height="8" rx="2" fill="#1B3A6B" />
        {/* walls */}
        <rect x="210" y="118" width="160" height="86" rx="3" fill="#F1F5F9" />
        <rect x="210" y="118" width="160" height="86" rx="3" fill="none" stroke="#0F2A4A" strokeWidth="2" />
        {/* roof */}
        <polygon points="196,120 290,62 384,120" fill="#16305A" />
        <polygon points="196,120 290,62 384,120" fill="none" stroke="#0F2A4A" strokeWidth="2" />
        <line x1="206" y1="113" x2="374" y2="113" stroke="#24477F" strokeWidth="2" opacity="0.8" />
        {/* windows */}
        <g stroke="#0F2A4A" strokeWidth="2">
          <rect x="226" y="138" width="36" height="32" rx="2" fill="url(#phh-window)" />
          <line x1="244" y1="138" x2="244" y2="170" />
          <line x1="226" y1="154" x2="262" y2="154" />
          <rect x="318" y="138" width="36" height="32" rx="2" fill="url(#phh-window)" />
          <line x1="336" y1="138" x2="336" y2="170" />
          <line x1="318" y1="154" x2="354" y2="154" />
        </g>
        {/* sign board above the door */}
        <rect x="260" y="122" width="60" height="15" rx="3" fill="#16305A" stroke="#D97706" strokeWidth="1.5" />
        <circle cx="274" cy="129.5" r="2" fill="#FBBF24" />
        <circle cx="290" cy="129.5" r="2" fill="#FBBF24" />
        <circle cx="306" cy="129.5" r="2" fill="#FBBF24" />
        {/* door with warm light spilling out */}
        <path d="M272 204v-48a18 18 0 0 1 36 0v48Z" fill="#0F2A4A" />
        <path d="M276 204v-46a14 14 0 0 1 28 0v46Z" fill="#1B3A6B" />
        <circle cx="299" cy="180" r="2.2" fill="#FBBF24" />
        {/* steps */}
        <rect x="264" y="204" width="52" height="5" rx="1.5" fill="#12294D" />
        <rect x="260" y="209" width="60" height="5" rx="1.5" fill="#0E2244" />
      </g>

      {/* ── Police badge standing in front of the house ── */}
      <g>
        {/* protective glow */}
        <circle cx="120" cy="146" r="62" fill="url(#phh-glow)" />
        {/* ground shadow */}
        <ellipse cx="120" cy="209" rx="34" ry="5" fill="#050D1C" opacity="0.7" />
        {/* pole (what the badge stands on) */}
        <rect x="115" y="172" width="10" height="34" fill="#12294D" />
        <rect x="103" y="200" width="34" height="7" rx="2" fill="#1B3A6B" stroke="#0F2A4A" strokeWidth="1.5" />
        {/* shield */}
        <g transform="translate(120 132)">
          <path
            d="M-33 -38 L33 -38 L33 -6 C33 17 19 32 0 42 C-19 32 -33 17 -33 -6 Z"
            fill="url(#phh-gold)"
            stroke="#92400E"
            strokeWidth="2.5"
          />
          <path
            d="M-26 -31 L26 -31 L26 -7 C26 12 14 25 0 34 C-14 25 -26 12 -26 -7 Z"
            fill="none"
            stroke="#92400E"
            strokeWidth="1.6"
            opacity="0.65"
          />
          {/* star */}
          <polygon
            points="0,-19 3.41,-4.69 13.31,-4.33 5.52,1.79 8.23,11.33 0,5.8 -8.23,11.33 -5.52,1.79 -13.31,-4.33 -3.41,-4.69"
            fill="#0F2A4A"
            transform="translate(0 -3)"
          />
          {/* banner chevron */}
          <path d="M-14 18 L0 24 L14 18 L14 24 L0 30 L-14 24 Z" fill="#0F2A4A" opacity="0.9" />
        </g>
        {/* cap connecting shield to pole */}
        <rect x="112" y="168" width="16" height="7" rx="2" fill="#D97706" />
      </g>
    </svg>
  );
}

/** Compact shield mark for the header / tab bar / login card. */
export function PoliceBadgeMark({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 1.6 21.4 5v6.4c0 5.4-3.8 9.7-9.4 11.4C6.4 21.1 2.6 16.8 2.6 11.4V5L12 1.6Z" opacity=".3" />
      <path d="M12 4.4 19 7v4.5c0 4-2.8 7.2-7 8.5-4.2-1.3-7-4.5-7-8.5V7l7-2.6Z" />
      <path
        d="m12 7.2.9 2.9 3 .1-2.4 1.8.9 2.9-2.4-1.8-2.4 1.8.9-2.9-2.4-1.8 3-.1.9-2.9Z"
        fill="#FBBF24"
      />
    </svg>
  );
}

/** Small circular utilization indicator (0-100). */
export function UtilizationRing({ value, size = 56 }: { value: number; size?: number }) {
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const color = clamped >= 80 ? "#FB7185" : clamped >= 50 ? "#FBBF24" : "#34D399";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${(clamped / 100) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="52%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size * 0.26}
        fontWeight="700"
        fill="#F8FAFC"
      >
        {clamped}%
      </text>
    </svg>
  );
}

/** Colored dot for a room status. */
export function StatusDot({ status, className = "h-2 w-2" }: { status: RoomStatus; className?: string }) {
  return <span aria-hidden="true" className={`inline-block rounded-full ${ROOM_STATUS_STYLES[status].dot} ${className}`} />;
}
