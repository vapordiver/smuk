/**
 * StatusBadge – Pill-shaped status indicator
 * Following Indigo Scholar: 10% opacity bg, bold uppercase micro-labels (10px), wide tracking
 *
 * @param {{ status: 'new'|'in-progress'|'resolved'|'rejected' }} props
 */
const STATUS_CONFIG = {
  'new': {
    label: 'NOWE',
    classes: 'bg-primary/10 text-primary',
  },
  'in-progress': {
    label: 'W TRAKCIE',
    classes: 'bg-primary/10 text-primary',
  },
  'resolved': {
    label: 'ROZWIĄZANE',
    classes: 'bg-secondary/10 text-secondary',
  },
  'rejected': {
    label: 'ODRZUCONE',
    classes: 'bg-error/10 text-error',
  },
};

export default function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['new'];

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
