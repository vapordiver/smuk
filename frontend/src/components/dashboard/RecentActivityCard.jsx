import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';

export default function RecentActivityCard({ items = [] }) {
  return (
    <div className="bg-surface border border-outline rounded-xl p-6 shadow-soft">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold">Ostatnia aktywność</h3>
        <Link
          to="/my-tickets"
          className="text-primary font-semibold text-sm hover:underline cursor-pointer whitespace-nowrap ml-4"
        >
          Zobacz wszystkie
        </Link>
      </div>

      {/* Activity items */}
      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            // flex-col na mobilkach, sm:flex-row na komputerze. Dodany gap-3 dla mobile.
            className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-surface-variant border border-outline rounded-xl transition-all duration-200 hover:bg-surface-container hover:shadow-md cursor-pointer gap-3 sm:gap-0"
          >
            {/* Left: icon + info */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-12 h-12 bg-white border border-outline rounded-lg flex items-center justify-center flex-shrink-0">
                <span
                  className={`material-symbols-outlined ${item.iconColor || 'text-primary'}`}
                >
                  {item.icon}
                </span>
              </div>

              {/* flex-1 min-w-0 zmusza tekst do ucinania się (truncate) */}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate" title={item.title}>
                  {item.title}
                </h4>
                <p className="text-xs text-on-surface-variant truncate" title={item.location}>
                  {item.location}
                </p>
              </div>
            </div>

            {/* Right: status + time */}
            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center flex-shrink-0 sm:ml-4 sm:w-auto w-full mt-2 sm:mt-0">
              <StatusBadge status={item.status} />
              <p className="text-[10px] text-on-surface-variant sm:mt-1 whitespace-nowrap">
                {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}