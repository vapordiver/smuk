import StatusBadge from '../common/StatusBadge';

/**
 * RecentActivityCard – Activity list card from Indigo Scholar
 * Cards with outline borders, 12px rounded corners, fixed-size icon slot.
 *
 * @param {{
 *   items: Array<{
 *     id: string|number,
 *     icon: string,
 *     iconColor?: string,
 *     title: string,
 *     location: string,
 *     status: 'new'|'in-progress'|'resolved'|'rejected',
 *     time: string
 *   }>
 * }} props
 */
export default function RecentActivityCard({ items = [] }) {
  return (
    <div className="bg-surface border border-outline rounded-xl p-6 shadow-soft">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Ostatnia aktywność</h3>
        <button className="text-primary font-semibold text-sm hover:underline">
          Zobacz wszystkie
        </button>
      </div>

      {/* Activity items */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-4 bg-surface-variant border border-outline rounded-xl transition-all duration-200 hover:bg-surface-container-low"
          >
            {/* Left: icon + info */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white border border-outline rounded-lg flex items-center justify-center flex-shrink-0">
                <span
                  className={`material-symbols-outlined ${item.iconColor || 'text-primary'}`}
                >
                  {item.icon}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm">{item.title}</h4>
                <p className="text-xs text-on-surface-variant">
                  {item.location}
                </p>
              </div>
            </div>

            {/* Right: status + time */}
            <div className="text-right flex-shrink-0 ml-4">
              <StatusBadge status={item.status} />
              <p className="text-[10px] text-on-surface-variant mt-1">
                {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
