/**
 * StatCard – Metric card from Indigo Scholar
 * Dual-column layout: numerical value at Display scale (3xl/4xl) with descriptive icon.
 * Uses outline border, shadow-sm, rounded-xl per code.html.
 *
 * @param {{
 *   icon: string,
 *   iconColor?: string,
 *   badge: string,
 *   badgeColor?: string,
 *   value: number|string,
 *   unit: string,
 *   description: string
 * }} props
 */
export default function StatCard({
  icon,
  iconColor = 'text-primary',
  badge,
  badgeColor = 'bg-primary/10 text-primary',
  value,
  unit,
  description,
  loading = false,
}) {
  if(loading){
    return (
      <div className="bg-surface border border-outline rounded-xl p-6 shadow-soft h-full flex flex-col justify-between animate-pulse">
        <div className="flex justify-between items-start mb-4">
          <div className="w-8 h-8 bg-surface-variant rounded-full"></div>
          <div className="w-20 h-5 bg-surface-variant rounded"></div>
        </div>
        <div>
          <div className="w-16 h-10 bg-surface-variant rounded mb-2"></div>
          <div className="w-3/4 h-4 bg-surface-variant rounded"></div>
        </div>
      </div>
    );
  }
  return (
    <div className="bg-surface border border-outline rounded-xl p-6 shadow-soft transition-all duration-200 hover:shadow-lg hover:bg-surface-container-low hover:border-outline-variant h-full">
      {/* Top row: icon + badge */}
      <div className="flex justify-between items-start mb-4">
        <span className={`material-symbols-outlined text-3xl ${iconColor}`}>
          {icon}
        </span>
        <span
          className={`text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded ${badgeColor}`}
        >
          {badge}
        </span>
      </div>

      {/* Value row */}
      <div className="flex items-baseline gap-2">
        <span className="text-4xl font-bold">{value}</span>
        <span className="text-on-surface-variant text-sm font-medium">
          {unit}
        </span>
      </div>

      {/* Description */}
      <p className="text-on-surface-variant text-xs mt-2">{description}</p>
    </div>
  );
}
