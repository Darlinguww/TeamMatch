import type { LucideIcon } from 'lucide-react';
import { AffinityScoreBar } from './AffinityScore';
import { scoreColor } from '../lib/affinityScore';

export interface TeamMetricItem {
  label: string;
  value: number;
  icon: LucideIcon;
  /** Texto corto para layouts estrechos (tooltip con `label` completo). */
  shortLabel?: string;
}

interface TeamMetricsGridProps {
  metrics: TeamMetricItem[];
  /**
   * stacked — una métrica por fila (modales, tarjetas estrechas).
   * compact — hasta 3 columnas con etiquetas truncadas.
   */
  layout?: 'stacked' | 'compact';
  className?: string;
}

function MetricCell({
  metric,
  compact,
}: {
  metric: TeamMetricItem;
  compact: boolean;
}) {
  const displayLabel = compact
    ? metric.shortLabel ?? metric.label
    : metric.label;

  return (
    <div className="min-w-0 space-y-1.5">
      <div className="flex items-center gap-1.5 min-w-0">
        <metric.icon
          className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
          aria-hidden
        />
        <span
          className="text-xs text-muted-foreground truncate flex-1 min-w-0 leading-snug"
          title={metric.label}
        >
          {displayLabel}
        </span>
        <span
          className={`text-xs font-bold shrink-0 tabular-nums ${scoreColor(metric.value)}`}
        >
          {metric.value}%
        </span>
      </div>
      <AffinityScoreBar value={metric.value} />
    </div>
  );
}

export function TeamMetricsGrid({
  metrics,
  layout = 'stacked',
  className = '',
}: TeamMetricsGridProps) {
  const isCompact = layout === 'compact';

  return (
    <div
      className={
        isCompact
          ? `grid grid-cols-1 gap-4 min-[520px]:grid-cols-3 min-[520px]:gap-3 ${className}`.trim()
          : `grid grid-cols-1 gap-3 ${className}`.trim()
      }
    >
      {metrics.map((m) => (
        <MetricCell key={m.label} metric={m} compact={isCompact} />
      ))}
    </div>
  );
}
