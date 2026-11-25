import React from 'react';
import { ArrowLeftRight, BookOpenCheck, HelpCircle } from 'lucide-react';
import type { FactorConfidence, FactorKind } from '../types';

interface FactorBadgeProps {
  kind: FactorKind;
  confidence?: FactorConfidence;
  compact?: boolean;
}

const KIND_CONFIG: Record<
  FactorKind,
  {
    label: string;
    classes: string;
    Icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  }
> = {
  sourced: {
    label: 'Sourced',
    classes:
      'bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
    Icon: BookOpenCheck,
  },
  proxy: {
    label: 'Proxy',
    classes:
      'bg-sky-100 text-sky-900 border-sky-200 dark:bg-sky-950/60 dark:text-sky-200 dark:border-sky-800',
    Icon: ArrowLeftRight,
  },
  assumption: {
    label: 'Assumption',
    classes:
      'bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
    Icon: HelpCircle,
  },
};

export const FactorBadge: React.FC<FactorBadgeProps> = ({
  kind,
  confidence,
  compact = false,
}) => {
  const { label, classes, Icon } = KIND_CONFIG[kind];

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold border rounded-md ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'
      } ${classes}`}
    >
      <Icon className={compact ? 'w-3 h-3 shrink-0' : 'w-3.5 h-3.5 shrink-0'} aria-hidden={true} />
      <span>{label}</span>
      {confidence && (
        <span className="font-normal capitalize">· {confidence} conf.</span>
      )}
    </span>
  );
};
