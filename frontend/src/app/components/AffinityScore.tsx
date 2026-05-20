import { useState } from 'react';
import {
  Brain,
  Calendar,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Star,
  Target,
  TrendingUp,
} from 'lucide-react';
import { cn } from './ui/utils';
import {
  type AffinityBreakdown,
  SCORE_CRITERIA,
  scoreBarColor,
  scoreBadgeColor,
  scoreColor,
} from '../lib/affinityScore';

const CRITERIA_ICONS = {
  skills: Target,
  availability: Calendar,
  experience: TrendingUp,
  feedback: Star,
} as const;

interface AffinityScoreBarProps {
  value: number;
  className?: string;
  height?: 'sm' | 'md';
  showLabel?: boolean;
}

export function AffinityScoreBar({
  value,
  className,
  height = 'sm',
  showLabel = false,
}: AffinityScoreBarProps) {
  return (
    <div className={cn('space-y-1', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Afinidad</span>
          <span className={cn('font-bold', scoreColor(value))}>{value}%</span>
        </div>
      )}
      <div
        className={cn(
          'rounded-full bg-muted overflow-hidden',
          height === 'sm' ? 'h-1.5' : 'h-2.5'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            scoreBarColor(value)
          )}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

interface AffinityScoreRingProps {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const RING_SIZES = {
  sm: { box: 'h-12 w-12', text: 'text-xs', sub: 'text-[8px]' },
  md: { box: 'h-16 w-16', text: 'text-sm', sub: 'text-[9px]' },
  lg: { box: 'h-20 w-20', text: 'text-base', sub: 'text-[10px]' },
};

export function AffinityScoreRing({
  value,
  size = 'md',
  label = 'score',
}: AffinityScoreRingProps) {
  const s = RING_SIZES[size];
  return (
    <div className={cn('relative shrink-0', s.box)}>
      <svg className={cn(s.box, '-rotate-90')} viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-muted/30"
        />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeDasharray={`${value} 100`}
          strokeLinecap="round"
          className={scoreColor(value)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold leading-none', scoreColor(value), s.text)}>
          {value}
        </span>
        <span className={cn('text-muted-foreground leading-none mt-0.5', s.sub)}>
          {label}
        </span>
      </div>
    </div>
  );
}

interface AiJustificationProps {
  text: string;
  title?: string;
  compact?: boolean;
}

export function AiJustification({
  text,
  title = 'Justificación de IA',
  compact = false,
}: AiJustificationProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-gradient-to-r from-primary/5 to-cyan-500/5',
        compact ? 'p-3' : 'p-4'
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="h-7 w-7 rounded-md bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center shrink-0">
          <Brain className="h-3.5 w-3.5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-primary flex items-center gap-1 mb-1">
            <Sparkles className="h-3 w-3" />
            {title}
          </p>
          <p
            className={cn(
              'text-muted-foreground leading-relaxed',
              compact ? 'text-xs' : 'text-sm'
            )}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

interface AffinityCriteriaBreakdownProps {
  breakdown: AffinityBreakdown;
  defaultExpanded?: boolean;
  collapsible?: boolean;
}

export function AffinityCriteriaBreakdown({
  breakdown,
  defaultExpanded = false,
  collapsible = true,
}: AffinityCriteriaBreakdownProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const content = (
    <div className="space-y-2.5">
      {SCORE_CRITERIA.map((c) => {
        const Icon = CRITERIA_ICONS[c.key];
        const value = breakdown[c.key];
        return (
          <div key={c.key}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3 w-3" />
                {c.label}
                <span className="text-[10px] opacity-70">({c.weight})</span>
              </div>
              <span className={cn('text-xs font-bold', scoreColor(value))}>
                {value}%
              </span>
            </div>
            <AffinityScoreBar value={value} />
          </div>
        );
      })}
    </div>
  );

  if (!collapsible) return content;

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-muted/40 hover:bg-muted/70 transition-colors text-xs font-medium text-muted-foreground"
      >
        <span>Desglose por criterio</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>
      {expanded && (
        <div className="px-3 py-3 border-t bg-muted/20">{content}</div>
      )}
    </div>
  );
}

interface AffinityScoreBadgeProps {
  score: number;
  showIcon?: boolean;
}

export function AffinityScoreBadge({ score, showIcon = true }: AffinityScoreBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-sm font-bold',
        scoreBadgeColor(score)
      )}
    >
      {showIcon && <Sparkles className="h-3 w-3" />}
      {score}%
    </div>
  );
}

interface AffinityScorePanelProps {
  score: number;
  breakdown: AffinityBreakdown;
  justification?: string;
  aiJustification: string;
  matchedSkills?: string[];
  title?: string;
  subtitle?: string;
}

export function AffinityScorePanel({
  score,
  breakdown,
  justification,
  aiJustification,
  matchedSkills = [],
  title,
  subtitle,
}: AffinityScorePanelProps) {
  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div>
          {title && <p className="font-semibold text-sm">{title}</p>}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      )}
      <div className="flex items-center gap-3">
        <AffinityScoreRing value={score} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="text-xs text-muted-foreground">Score de afinidad</span>
            <AffinityScoreBadge score={score} />
          </div>
          <AffinityScoreBar value={score} height="md" />
          {justification && (
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              {justification}
            </p>
          )}
        </div>
      </div>
      {matchedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {matchedSkills.slice(0, 4).map((s) => (
            <span
              key={s}
              className="inline-flex rounded-full bg-primary/10 text-primary px-2 py-0.5 text-xs font-medium"
            >
              {s}
            </span>
          ))}
        </div>
      )}
      <AiJustification text={aiJustification} compact />
      <AffinityCriteriaBreakdown breakdown={breakdown} />
    </div>
  );
}
