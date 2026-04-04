'use client'

import type { LucideIcon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

type IllustrationType = 'no-data' | 'no-results' | 'no-connection' | 'success'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  illustration?: IllustrationType
}

function NoDataIllustration({ color }: { color: string }) {
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Database body */}
      <ellipse cx={40} cy={22} rx={24} ry={8} stroke={color} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
      <path d="M16 22v12c0 4.4 10.7 8 24 8s24-3.6 24-8V22" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
      <path d="M16 34v12c0 4.4 10.7 8 24 8s24-3.6 24-8V34" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
      <path d="M16 46v12c0 4.4 10.7 8 24 8s24-3.6 24-8V46" stroke={color} strokeWidth={1.5} strokeDasharray="4 3" fill="none" />
      {/* Dotted lines suggesting no data */}
      <line x1={28} y1={38} x2={52} y2={38} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
      <line x1={30} y1={50} x2={50} y2={50} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
    </svg>
  )
}

function NoResultsIllustration({ color }: { color: string }) {
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Magnifying glass */}
      <circle cx={34} cy={34} r={18} stroke={color} strokeWidth={2} fill="none" />
      <line x1={47} y1={47} x2={62} y2={62} stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      {/* Question mark inside */}
      <text x={34} y={40} textAnchor="middle" fill={color} fontSize={16} fontWeight={500} opacity={0.6}>?</text>
      {/* Subtle scan lines */}
      <line x1={22} y1={28} x2={46} y2={28} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.3} />
      <line x1={26} y1={34} x2={42} y2={34} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.3} />
      <line x1={24} y1={40} x2={44} y2={40} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.3} />
    </svg>
  )
}

function NoConnectionIllustration({ color }: { color: string }) {
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Wifi arcs */}
      <path d="M40 56v-4" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
      <path d="M28 42c6.6-6.6 17.4-6.6 24 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.4} />
      <path d="M20 34c10.5-10.5 29.5-10.5 40 0" stroke={color} strokeWidth={1.5} strokeLinecap="round" fill="none" opacity={0.3} />
      {/* X mark */}
      <circle cx={56} cy={24} r={10} fill="white" stroke={color} strokeWidth={1.5} />
      <line x1={51} y1={19} x2={61} y2={29} stroke={color} strokeWidth={2} strokeLinecap="round" />
      <line x1={61} y1={19} x2={51} y2={29} stroke={color} strokeWidth={2} strokeLinecap="round" />
    </svg>
  )
}

function SuccessIllustration({ color }: { color: string }) {
  return (
    <svg width={80} height={80} viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer ring */}
      <circle cx={40} cy={40} r={30} stroke={color} strokeWidth={2} fill="none" opacity={0.3} />
      {/* Inner circle */}
      <circle cx={40} cy={40} r={22} stroke={color} strokeWidth={2.5} fill="none" />
      {/* Checkmark */}
      <path
        d="M29 40l7 7 15-15"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Subtle sparkle dots */}
      <circle cx={16} cy={18} r={2} fill={color} opacity={0.3} />
      <circle cx={66} cy={14} r={1.5} fill={color} opacity={0.25} />
      <circle cx={68} cy={56} r={2} fill={color} opacity={0.2} />
    </svg>
  )
}

const ILLUSTRATIONS: Record<IllustrationType, React.FC<{ color: string }>> = {
  'no-data': NoDataIllustration,
  'no-results': NoResultsIllustration,
  'no-connection': NoConnectionIllustration,
  'success': SuccessIllustration,
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  illustration,
}: EmptyStateProps) {
  const { colors } = useTheme()
  const alpha = (color: string, opacity: number) =>
    `color-mix(in srgb, ${color} ${opacity}%, transparent)`

  const mutedColor = colors.textMuted
  const IllustrationComponent = illustration ? ILLUSTRATIONS[illustration] : null

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {/* Illustration or Icon */}
      {IllustrationComponent ? (
        <div
          className="flex items-center justify-center w-16 h-16 rounded-full mb-4"
          style={{
            backgroundColor: alpha(mutedColor, 10),
            border: `1px solid ${alpha(mutedColor, 15)}`,
          }}
        >
          <IllustrationComponent color={mutedColor} />
        </div>
      ) : Icon ? (
        <div
          className="flex items-center justify-center w-12 h-12 rounded-full mb-4"
          style={{
            backgroundColor: alpha(colors.primary, 12),
          }}
        >
          <Icon size={24} style={{ color: colors.primary }} />
        </div>
      ) : null}

      {/* Title */}
      <h3
        className="text-base font-semibold mb-1"
        style={{ color: colors.text }}
      >
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p
          className="text-sm max-w-sm mb-6 leading-relaxed"
          style={{ color: colors.textMuted }}
        >
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 hover:opacity-90 active:scale-[0.98]"
          style={{
            backgroundColor: colors.primary,
            color: '#ffffff',
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
