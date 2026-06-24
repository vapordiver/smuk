import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/**
 * CoordinatorPanel – Analiza Zgłoszeń view for coordinator role.
 * Based on code.html mockup and the Indigo Scholar Design System (DESIGN.md).
 */

/* ── Chart helpers ── */
// Category colors map
const getCategoryColorsMap = (tickets) => {
  const colorMap = new Map();
  colorMap.set('Inne', '#94a3b8'); // Default fallback color

  tickets.forEach((ticket) => {
    const catName = ticket.category?.name || 'Inne';
    const catColor = ticket.category?.color;
    if (catColor && catName !== 'Inne') {
      colorMap.set(catName, catColor);
    }
  });
  return colorMap;
};

// Helper functions for date operations
const getMonthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const getFirstDayOfMonth = (year, month) => {
  return `${year}-${String(month).padStart(2, '0')}-01`;
};

const getLastDayOfMonth = (year, month) => {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
};

const MONTH_LABELS_PL = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];

//mockup - delete later
const REPORTS_LIST = [
  {
    id: 1,
    icon: 'picture_as_pdf',
    iconColor: 'text-primary-fixed-dim',
    title: 'Raport Miesięczny - Luty 2024',
    description: 'Wszystkie kategorie, Wszystkie statusy',
    generatedAt: 'Dzisiaj, 09:41',
    generatedOn: '2024-02-15',
  },
  {
    id: 2,
    icon: 'analytics',
    iconColor: 'text-secondary',
    title: 'Usterki IT - Semestr Zimowy',
    description: 'Infrastruktura IT, Tylko zakończone',
    generatedAt: 'Wczoraj, 14:20',
    generatedOn: '2024-01-18',
  },
];

const STATUS_MAP = {
  NEW: { label: 'Nowe', color: 'bg-primary/10 text-primary' },
  IN_PROGRESS: { label: 'W trakcie', color: 'bg-tertiary/10 text-tertiary' },
  RESOLVED: { label: 'Rozwiązane', color: 'bg-secondary/10 text-secondary' },
  CLOSED: { label: 'Zamknięte', color: 'bg-outline-variant/30 text-on-surface-variant' }
};

const PRIORITY_MAP = {
  LOW: { label: 'Niski', color: 'text-secondary' },
  MEDIUM: { label: 'Średni', color: 'text-primary' },
  HIGH: { label: 'Wysoki', color: 'text-tertiary' },
  CRITICAL: { label: 'Krytyczny', color: 'text-error font-bold' }
};

const formatDate = (isoString) => {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleDateString('pl-PL', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getMonthLabel = (date) => {
  const month = MONTH_LABELS_PL[date.getMonth()] || '';
  return month ? month.charAt(0).toUpperCase() + month.slice(1) : '';
};

const buildTrendData = (tickets, dateFromStr, dateToStr, endDate = new Date()) => {
  const months = Array.from({ length: 6 }, (_, index) => {
    const monthDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5 + index, 1);
    return {
      key: getMonthKey(monthDate),
      label: getMonthLabel(monthDate),
    };
  });

  const catColorMap = getCategoryColorsMap(tickets);
  // Collect per-month category counts
  const monthCatCounts = new Map(months.map((m) => [m.key, new Map()]));

  tickets.forEach((ticket) => {
    if (!ticket.created_at) return;
    const ticketDate = new Date(ticket.created_at);
    if (Number.isNaN(ticketDate.getTime())) return;
    const monthKey = getMonthKey(ticketDate);
    if (!monthCatCounts.has(monthKey)) return;
    const catLabel = ticket.category?.name || 'Inne';
    const catMap = monthCatCounts.get(monthKey);
    catMap.set(catLabel, (catMap.get(catLabel) || 0) + 1);
  });

  // Build global ordered category list alphabetically
  const globalCatTotals = new Map();
  monthCatCounts.forEach((catMap) => {
    catMap.forEach((count, cat) => {
      globalCatTotals.set(cat, (globalCatTotals.get(cat) || 0) + count);
    });
  });
  const orderedCats = [...globalCatTotals.entries()]
    .map(([cat]) => ({
      cat,
      color: catColorMap.get(cat) || '#94a3b8'
    }))
    .sort((a, b) => a.cat.localeCompare(b.cat));

  const totals = months.map((m) => {
    const catMap = monthCatCounts.get(m.key) || new Map();
    return [...catMap.values()].reduce((s, v) => s + v, 0);
  });
  const maxValue = Math.max(...totals, 1);

  const startLimit = dateFromStr ? dateFromStr.slice(0, 7) : '';
  const endLimit = dateToStr ? dateToStr.slice(0, 7) : '';

  return months.map((month, index) => {
    const catMap = monthCatCounts.get(month.key) || new Map();
    const total = totals[index];
    const segments = orderedCats
      .map(({ cat, color }) => ({ cat, count: catMap.get(cat) || 0, color }))
      .filter((s) => s.count > 0);

    const isActive = (!startLimit || month.key >= startLimit) && (!endLimit || month.key <= endLimit);

    return {
      key: month.key,
      label: month.label,
      value: total,
      heightPct: total === 0 ? 8 : Math.max(12, Math.round((total / maxValue) * 100)),
      active: isActive,
      segments,
      orderedCats,
    };
  });
};

const buildCategoryDist = (tickets) => {
  const counts = new Map();
  const catColorMap = getCategoryColorsMap(tickets);

  tickets.forEach((ticket) => {
    const label = ticket.category?.name || 'Inne';
    counts.set(label, (counts.get(label) || 0) + 1);
  });

  const sortedByCount = [...counts.entries()]
    .filter(([label]) => label !== 'Inne')
    .sort((a, b) => b[1] - a[1]);

  if (sortedByCount.length === 0) {
    const inneCount = counts.get('Inne') || 0;
    return inneCount > 0 ? [{ label: 'Inne', pct: 100, color: '#94a3b8' }] : [];
  }

  const top3 = sortedByCount.slice(0, 3);
  const remainingCount = sortedByCount.slice(3).reduce((sum, [, count]) => sum + count, 0) + (counts.get('Inne') || 0);
  const stableTop3 = top3.sort((a, b) => a[0].localeCompare(b[0]));
  const finalEntries = [...stableTop3];
  if (remainingCount > 0) {
    finalEntries.push(['Inne', remainingCount]);
  }

  const total = tickets.length || 1;

  return finalEntries.map(([label, count]) => ({
    label,
    pct: Math.round((count / total) * 100),
    color: catColorMap.get(label) || '#94a3b8',
  }));
};

const createBaseTicketParams = ({ statusFilter, priorityFilter, dateFrom, dateTo }) => {
  const params = new URLSearchParams();

  if (statusFilter) params.append('status', statusFilter);
  if (priorityFilter) params.append('priority', priorityFilter);
  if (dateFrom) params.append('date_from', dateFrom);
  if (dateTo) params.append('date_to', dateTo);

  return params;
};

/* ── Sub-components ── */

function BarChart({ data, onBarClick }) {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Chart area */}
      <div className="flex-1 flex items-end justify-between gap-2 md:gap-6 border-b border-outline-variant relative">
        {/* Dashed guide lines */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none z-0">
          <div className="border-b border-dashed border-outline-variant w-full h-0" />
          <div className="border-b border-dashed border-outline-variant w-full h-0" />
          <div className="border-b border-dashed border-outline-variant w-full h-0" />
        </div>

        {data.map((bar) => (
          <div
            key={bar.label}
            className="flex flex-col items-center justify-end w-full h-full z-10 cursor-pointer group/bar"
            onClick={() => onBarClick && onBarClick(bar)}
          >
            {/* Stacked bar with border */}
            <div
              className={`w-full rounded-t-md relative flex flex-col-reverse transition-all duration-200 group-hover/bar:scale-[1.02] ${
                bar.value > 0
                  ? bar.active
                    ? 'border-2 border-slate-800'
                    : 'border-2 border-slate-800/30'
                  : 'border border-outline-variant/30'
              }`}
              style={{ height: `${bar.heightPct}%` }}
              title={[...bar.segments].reverse().map((s) => `${s.cat}: ${s.count}`).join('\n') || bar.label}
            >
              {bar.value === 0 ? (
                <div className="w-full h-full bg-outline-variant/10 rounded-t-sm" />
              ) : (
                bar.segments.map((seg, index) => (
                  <div
                    key={seg.cat}
                    className={`w-full ${
                      index === bar.segments.length - 1 ? 'rounded-t-sm' : ''
                    } ${index > 0 ? 'border-b-2 border-slate-800' : ''}`}
                    style={{
                      flex: `${seg.count} 1 auto`,
                      minHeight: seg.count > 0 ? '5px' : '0',
                      backgroundColor: seg.color,
                      opacity: bar.active ? 1 : 0.55,
                    }}
                  />
                ))
              )}
              {/* Total label */}
              {bar.value > 0 && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <span className="block bg-black/80 text-white text-[11px] font-bold leading-none px-1.5 py-1 rounded-md shadow-sm">
                    {bar.value}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* bar Labels */}
      <div className="flex justify-between gap-2 md:gap-6 mt-3 shrink-0">
        {data.map((bar) => (
          <span
            key={bar.label}
            className={`text-xs font-medium w-full text-center transition-colors duration-200 ${
              bar.active ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
          >
            {bar.label}
          </span>
        ))}
      </div>
    </div>
  );
}

function CategoryRow({ label, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="flex-1 text-sm font-medium text-on-surface">{label}</span>
      <span className="text-sm font-bold text-on-surface">{pct}%</span>
    </div>
  );
}

function ReportRow({ report, dateFrom, dateTo }) {
  return (
    <div className="bg-surface rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 outline outline-1 outline-outline hover:shadow-sm transition-shadow group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-surface-container flex items-center justify-center shrink-0">
          <span
            className={`material-symbols-outlined ${report.iconColor}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {report.icon}
          </span>
        </div>
        <div>
          <h3 className="font-bold text-on-surface">{report.title}</h3>
          <div className="flex items-center gap-2 text-sm text-on-surface-variant mt-1 flex-wrap">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            <span>{report.generatedAt}</span>
            <span className="mx-1">•</span>
            <span>{report.description}</span>
            {(dateFrom || dateTo) && (
              <>
                <span className="mx-1">•</span>
                <span className="text-primary font-medium">
                  {dateFrom || '…'} – {dateTo || '…'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
        <button
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-container-low text-on-surface font-semibold text-sm hover:bg-outline-variant/50 transition-colors"
          title="Pobierz PDF"
        >
          <span className="material-symbols-outlined text-[18px]">download</span>
          PDF
        </button>
        <button
          className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-surface-container-low text-on-surface font-semibold text-sm hover:bg-outline-variant/50 transition-colors"
          title="Pobierz CSV"
        >
          <span className="material-symbols-outlined text-[18px]">csv</span>
          CSV
        </button>
      </div>
    </div>
  );
}

function TicketRow({ ticket, coordinators, onTicketUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(ticket.status || 'NEW');
  const [priority, setPriority] = useState(ticket.priority || 'MEDIUM');
  const [assignee, setAssignee] = useState(ticket.assigned_to?.id || '');
  const [isSaving, setIsSaving] = useState(false);
  const [closingNote, setClosingNote] = useState('');

  useEffect(() => {
      setStatus(ticket.status || 'NEW');
      setPriority(ticket.priority || 'MEDIUM');
      setAssignee(ticket.assigned_to?.id || '');
  }, [ticket]);

  const hasChanges = status !== ticket.status || priority !== ticket.priority || assignee !== (ticket.assigned_to?.id || '');
  const isClosed = ticket.status === 'CLOSED';

  const handleSave = async (e) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
        const payload = {
            status,
            priority,
            assigned_to_id: assignee || null,
        };
        const res = await api.patch(`tickets/${ticket.id}/`, payload);
        onTicketUpdated(res.data);
    } catch (err) {
        console.error("Błąd podczas zapisu:", err);
        alert("Wystąpił błąd podczas zapisywania zmian.");
    } finally {
        setIsSaving(false);
    }
  };

  const getPriorityColor = (prio) => {
    return PRIORITY_MAP[prio]?.color || PRIORITY_MAP['MEDIUM'].color;
  };

  const getStatusColor = (stat) => {
    return STATUS_MAP[stat]?.color || STATUS_MAP['NEW'].color;
  };

  const auditLog = ticket.audit_log || [];

  const getLogDisplay = (log) => {
    const resolveUserName = (value) => {
      if (!value) return '';

      const matchedCoordinator = coordinators.find((candidate) => candidate.id === value);
      if (matchedCoordinator) {
        return `${matchedCoordinator.first_name} ${matchedCoordinator.last_name}`.trim();
      }

      return value;
    };

    if (log.field_changed === 'note') {
       return {
          title: 'Dodano notatkę',
          content: <span className="font-italic text-on-surface">"{log.new_value}"</span>
       };
    }

    if (log.field_changed === 'assigned_to') {
       const oldName = resolveUserName(log.old_value);
       const newName = resolveUserName(log.new_value);

       if (!oldName) {
           return {
             title: 'Przypisano zgłoszenie',
             content: <>do <span className="font-bold text-primary">{newName}</span></>
           };
       }

       if (!newName) {
           return {
             title: 'Usunięto przypisanie',
             content: <>było <span className="line-through">{oldName}</span></>
           };
       }

       return {
         title: 'Zmieniono przypisanie',
         content: <>z <span className="line-through">{oldName}</span> na <span className="font-bold text-primary">{newName}</span></>
       };
    }

    const fieldNameMap = { status: 'status', priority: 'priorytet' };
    const name = fieldNameMap[log.field_changed] || log.field_changed;

    const formatVal = (val, field) => {
       if (field === 'status') return STATUS_MAP[val]?.label || val;
       if (field === 'priority') return PRIORITY_MAP[val]?.label || val;
       return val;
    };

    return {
       title: `Zmieniono ${name}`,
       content: <>z <strong className="line-through font-bold">{formatVal(log.old_value, log.field_changed)}</strong> na <strong className="font-bold text-primary">{formatVal(log.new_value, log.field_changed)}</strong></>
    };
  };

  return (
    <div className="bg-surface rounded-xl flex flex-col outline outline-1 outline-outline hover:shadow-sm transition-shadow">
      <div className="p-3 sm:p-4 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <h3 className="font-bold text-on-surface text-[15px] sm:text-base">{ticket.title}</h3>
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs font-medium mt-1">
            <span className="text-on-surface-variant">{formatDate(ticket.created_at)}</span>
            <span className="mx-1 text-outline-variant">•</span>
            <span className="text-on-surface-variant">{ticket.category?.name || 'Inne'}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
           <div className="relative group cursor-pointer" title="Zmień status">
             <select
                value={status}
                onChange={(e) => {
                  const newStatus = e.target.value;
                  setStatus(newStatus);
                  if (newStatus === 'RESOLVED') {
                    setExpanded(true);
                  }
                }}
                disabled={isClosed}
                className={`text-[11px] sm:text-xs font-bold uppercase rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none hover:shadow-sm transition-shadow ${getStatusColor(status)} ${isClosed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
             >
               {Object.entries(STATUS_MAP)
                 .filter(([k]) => k !== 'CLOSED' || isClosed)
                 .map(([k, v]) => (
                   <option key={k} value={k} className="bg-surface text-on-surface uppercase">{v.label}</option>
                 ))}
             </select>
             {!isClosed && <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-60 group-hover:opacity-100 transition-opacity">arrow_drop_down</span>}
           </div>

           <div className="relative group cursor-pointer" title="Zmień priorytet">
             <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={isClosed}
                className={`text-[11px] sm:text-xs font-bold rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none hover:shadow-sm transition-shadow ${getPriorityColor(priority)} ${isClosed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
             >
               {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                 <option key={k} value={k} className="bg-surface text-on-surface">{v.label}</option>
               ))}
             </select>
             {!isClosed && <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-60 group-hover:opacity-100 transition-opacity">arrow_drop_down</span>}
           </div>

           <div className="relative group cursor-pointer" title="Zmień przypisanie">
             <select
               value={assignee}
               onChange={(e) => setAssignee(e.target.value)}
               disabled={isClosed}
               className={`text-[11px] sm:text-xs font-medium rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none bg-surface-container-low text-on-surface hover:shadow-sm transition-shadow max-w-[150px] truncate ${isClosed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
             >
               <option value="">Nieprzypisane</option>
               {coordinators.map((c) => (
                   <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
               ))}
             </select>
             {!isClosed && <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-60 group-hover:opacity-100 transition-opacity">arrow_drop_down</span>}
           </div>

           {hasChanges && !isClosed && (
             <button
               className="px-2.5 py-1 bg-primary text-on-primary text-[11px] sm:text-xs font-bold rounded-lg hover:scale-[0.98] transition-transform shadow-sm flex items-center gap-1 disabled:opacity-50"
               onClick={handleSave}
               title="Zapisz zmiany"
               disabled={isSaving}
             >
               <span className="material-symbols-outlined text-[14px]">{isSaving ? 'sync' : 'save'}</span>
               Zapisz
             </button>
           )}

           <button className="p-1 rounded hover:bg-surface-container text-on-surface-variant transition-colors ml-auto md:ml-0" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
             <span className="material-symbols-outlined text-[20px]">
               {expanded ? 'expand_less' : 'expand_more'}
             </span>
           </button>
        </div>
      </div>

      {expanded && (
        <div className="p-3 sm:p-4 border-t border-outline-variant bg-surface-container-lowest rounded-b-xl flex flex-col gap-3 sm:gap-4">
          <div>
             <h4 className="text-[13px] sm:text-sm font-bold text-on-surface mb-2 sm:mb-3">Historia zgłoszenia (AuditLog)</h4>
             <div className="flex flex-col gap-2.5 sm:gap-3 pl-2 border-l-2 border-outline-variant ml-2">
               {auditLog.length > 0 ? auditLog.map((log) => {
                 const display = getLogDisplay(log);
                 return (
                   <div key={log.id} className="relative pl-3 sm:pl-4">
                     <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary/40 border-2 border-surface" />
                       {/* render SYSTEM if user null */}
                     <div className="text-[11px] sm:text-xs font-medium text-on-surface-variant mb-0.5">
                       {formatDate(log.created_at)} • {log.user ? `${log.user.first_name} ${log.user.last_name}` : 'SYSTEM'}
                     </div>
                     <div className="text-[13px] sm:text-sm text-on-surface font-semibold">{display.title}</div>
                     <div className="text-[11px] sm:text-xs text-on-surface-variant mt-1 p-2 bg-surface-container rounded-lg border border-outline">
                       {display.content}
                     </div>
                   </div>
                 );
               }) : (
                 <div className="text-xs text-on-surface-variant italic">Brak historii zmian.</div>
               )}
             </div>
          </div>
          {ticket.status === 'CLOSED' && (
              <div className="mt-2 pt-3 sm:pt-4 border-t border-outline-variant text-[13px] sm:text-sm text-on-surface-variant italic text-center">
                  Zgłoszenie jest zamknięte i nie można go już edytować.
              </div>
          )}

          {status === 'RESOLVED' && !isClosed && (
             <div className="flex flex-col gap-2 mt-2 pt-3 sm:pt-4 border-t border-outline-variant" onClick={(e) => e.stopPropagation()}>
               <label className="text-[11px] sm:text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                 Notatka rozwiązująca (wymagana do zamknięcia)
               </label>
               <textarea
                 value={closingNote}
                 onChange={(e) => setClosingNote(e.target.value)}
                 className="w-full p-2.5 sm:p-3 rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm bg-surface resize-none"
                 rows="2"
                 placeholder="Wpisz notatkę z rozwiązaniem problemu..."
               />
               <button
                 onClick={async (e) => {
                   e.stopPropagation();
                   if (!closingNote.trim()) {
                     alert("Notatka zamykająca jest wymagana!");
                     return;
                   }
                   setIsSaving(true);
                   try {
                     const payload = {
                       status: 'CLOSED',
                       priority,
                       assigned_to_id: assignee || null,
                       note: closingNote,
                     };
                     const res = await api.patch(`tickets/${ticket.id}/`, payload);

                     onTicketUpdated(res.data);
                     setExpanded(false);
                     setClosingNote('');
                   } catch (err) {
                     console.error("Błąd podczas zapisu:", err);
                     alert("Wystąpił błąd podczas zamykania zgłoszenia.");
                   } finally {
                     setIsSaving(false);
                   }
                 }}
                 disabled={!closingNote.trim() || isSaving}
                 className="self-end px-3.5 py-2 bg-primary text-on-primary rounded-xl text-[13px] sm:text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-50"
               >
                 {isSaving ? 'Zamykanie...' : 'Zapisz notatkę i zamknij zgłoszenie'}
               </button>
             </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main page ── */
export default function CoordinatorPanel() {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1;

  const [dateFrom, setDateFrom] = useState(getFirstDayOfMonth(currentYear, currentMonthNum));
  const [dateTo, setDateTo] = useState(getLastDayOfMonth(currentYear, currentMonthNum));
  const [chartShiftMonths, setChartShiftMonths] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [chartTickets, setChartTickets] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartLoading, setIsChartLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Ticket filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortPriority, setSortPriority] = useState('');

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
        const offset = (currentPage - 1) * pageSize;
        const params = createBaseTicketParams({ statusFilter, priorityFilter, dateFrom, dateTo });
        params.set('limit', String(pageSize));
        params.set('offset', String(offset));
        if (sortPriority) {
           const prefix = sortPriority === 'desc' ? '-' : '';
           params.append('ordering', `${prefix}priority`);
        } else {
           params.append('ordering', '-created_at');
        }

        const res = await api.get(`tickets/?${params.toString()}`);
        const mainTickets = (res.data.results || []).filter(ticket => ticket.parent_ticket === null);
        setTickets(mainTickets);
        setTotalCount(res.data.count || 0);
    } catch (err) {
        console.error("Błąd podczas pobierania danych:", err);
    } finally {
        setIsLoading(false);
    }
  }, [currentPage, dateFrom, dateTo, priorityFilter, sortPriority, statusFilter]);

  const fetchChartTickets = useCallback(async () => {
    setIsChartLoading(true);
    try {
      const baseDate = dateTo ? new Date(`${dateTo}T00:00:00`) : new Date();
      const endDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + chartShiftMonths, 1);
      const startDate = new Date(endDate.getFullYear(), endDate.getMonth() - 5, 1);

      const startStr = getFirstDayOfMonth(startDate.getFullYear(), startDate.getMonth() + 1);
      const endStr = getLastDayOfMonth(endDate.getFullYear(), endDate.getMonth() + 1);

      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (priorityFilter) params.append('priority', priorityFilter);
      params.append('date_from', startStr);
      params.append('date_to', endStr);
      params.set('limit', '1000');
      params.set('offset', '0');
      params.set('ordering', '-created_at');

      const res = await api.get(`tickets/?${params.toString()}`);
      const results = res.data.results || [];
      const count = res.data.count || results.length;

      if (count > results.length) {
        const pageSizeForCharts = 1000;
        const totalPages = Math.ceil(count / pageSizeForCharts);
        const allResults = [...results];

        for (let pageIndex = 1; pageIndex < totalPages; pageIndex += 1) {
          const pageParams = new URLSearchParams();
          if (statusFilter) pageParams.append('status', statusFilter);
          if (priorityFilter) pageParams.append('priority', priorityFilter);
          pageParams.append('date_from', startStr);
          pageParams.append('date_to', endStr);
          pageParams.set('limit', String(pageSizeForCharts));
          pageParams.set('offset', String(pageIndex * pageSizeForCharts));
          pageParams.set('ordering', '-created_at');

          const pageRes = await api.get(`tickets/?${pageParams.toString()}`);
          allResults.push(...(pageRes.data.results || []));
        }

        setChartTickets(allResults);
        return;
      }

      setChartTickets(results);
    } catch (err) {
      console.error('Błąd podczas pobierania danych do wykresów:', err);
      setChartTickets([]);
    } finally {
      setIsChartLoading(false);
    }
  }, [chartShiftMonths, dateTo, priorityFilter, statusFilter]);

  useEffect(() => {
      fetchTickets();
      }, [fetchTickets]);

  useEffect(() => {
      fetchChartTickets();
  }, [fetchChartTickets]);

  useEffect(() => {
      const fetchCoordinators = async () => {
          try {
              const res = await api.get('auth/coordinators/');
              setCoordinators(res.data);
          } catch (err) {
              console.error("Błąd pobierania koordynatorów:", err);
          }
      };
      fetchCoordinators();
  }, []);

  const handleTicketUpdated = () => {
      // Refresh the entire list from server to ensure sorting/pagination/filtering is consistent
      fetchTickets();
      fetchChartTickets();
  };

  const handleBarClick = (bar) => {
    if (!bar.key) return;
    const [yearStr, monthStr] = bar.key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const targetFirstDay = getFirstDayOfMonth(year, month);
    const targetLastDay = getLastDayOfMonth(year, month);

    if (dateFrom === targetFirstDay && dateTo === targetLastDay) {
      setDateFrom('');
      setDateTo('');
    } else {
      setDateFrom(targetFirstDay);
      setDateTo(targetLastDay);
    }
    setChartShiftMonths(0);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const visibleReports = REPORTS_LIST.filter((report) => {
    if (dateFrom && report.generatedOn < dateFrom) return false;
    if (dateTo && report.generatedOn > dateTo) return false;
    return true;
  });

  const baseChartEndDate = dateTo ? new Date(`${dateTo}T00:00:00`) : new Date();
  const shiftedEndDate = new Date(baseChartEndDate.getFullYear(), baseChartEndDate.getMonth() + chartShiftMonths, 1);
  const trendData = buildTrendData(chartTickets, dateFrom, dateTo, shiftedEndDate);
  // Filter category distribution client-side based on active dateFrom/dateTo range
  const activeTickets = chartTickets.filter((ticket) => {
    if (!ticket.created_at) return false;
    const tDate = ticket.created_at.slice(0, 10); // Format YYYY-MM-DD
    return (!dateFrom || tDate >= dateFrom) && (!dateTo || tDate <= dateTo);
  });
  const categoryData = buildCategoryDist(activeTickets);

  return (
    <main className="flex-1 overflow-y-auto p-4 sm:p-5 lg:p-10 scrollbar-thin">
      {/* Page header */}
      <header className="mb-4 md:mb-6">
        <div className="mb-4 md:mb-5">
          <h1 className="text-[24px] md:text-[30px] font-bold tracking-[-0.015em] text-on-surface leading-tight">
            Analiza Zgłoszeń
          </h1>
          <p className="text-on-surface-variant text-sm md:text-base mt-1.5 md:mt-2">
            Kompleksowy przegląd i generowanie raportów usterek.
          </p>
        </div>
        <div className="w-full flex flex-col gap-2.5 rounded-xl border border-outline-variant bg-surface-container-low px-4 py-4 md:px-6 md:py-5 text-sm text-on-surface shadow-sm">
          <div className="flex items-center gap-2 font-semibold">
            <span className="material-symbols-outlined text-primary text-[20px]">date_range</span>
            Zakres dat
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 sm:gap-4">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Od
              </label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setChartShiftMonths(0); // Reset shift on manual date change
                  setCurrentPage(1);
                }}
               className="w-full px-3 py-2.5 rounded-lg bg-surface border borl px-3 py-2.5 rounded-lg bg-surface border border-outline-variant text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
              <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Do
              </label>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => {
                  setDateTo(e.target.value);
                  setChartShiftMonths(0); // Reset shift on manual date change
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2.5 rounded-lg bg-surface border border-outline-variant text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  // Clears filters and resets view range to all months
                  setDateFrom('');
                  setDateTo('');
                  setChartShiftMonths(0);
                  setCurrentPage(1);
                }}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold text-on-surface-variant hover:text-error hover:bg-error-container transition-colors whitespace-nowrap"
              >
                Wyczyść
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-8">
        {/* Visualization bento */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend chart (2/3 width) */}
          <div className="lg:col-span-2 bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-4 sm:p-6 flex flex-col min-h-[26rem] sm:min-h-[32rem] relative">
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-[20px] font-semibold text-on-surface leading-tight">
                Trend Zgłoszeń (Ostatnie 6 miesięcy)
              </h2>
            </div>
            {/* loading indicator in the top right corner */}
            {isChartLoading && trendData.length > 0 && (
              <div className="absolute top-4 right-4 z-30 flex items-center gap-1.5 bg-surface-container/80 backdrop-blur-sm px-2.5 py-1 rounded-full border border-outline text-[11px] font-bold text-on-surface-variant animate-pulse shadow-sm">
                <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                Loading...
              </div>
            )}
            {isChartLoading && trendData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant animate-pulse gap-2">
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                Loading chart...
              </div>
            ) : trendData.length > 0 ? (
              // smooth fading while loading (trend data)
              <div className={`relative flex-1 flex flex-col px-4 transition-all duration-300 ${isChartLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                <button
                  onClick={() => setChartShiftMonths(prev => prev - 1)}
                  disabled={isChartLoading}
                  className="absolute left-[-12px] top-[40%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-surface shadow border border-outline flex items-center justify-center text-on-surface hover:bg-surface-container transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="Poprzedni miesiąc"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>

                <BarChart data={trendData} onBarClick={handleBarClick} />

                <button
                  onClick={() => setChartShiftMonths(prev => prev + 1)}
                  disabled={isChartLoading}
                  className="absolute right-[-12px] top-[40%] -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-surface shadow border border-outline flex items-center justify-center text-on-surface hover:bg-surface-container transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  title="Następny miesiąc"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">
                Brak danych do wyświetlenia.
              </div>
            )}
          </div>

          {/* Category distribution (1/3 width) */}
          <div className="bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-4 sm:p-6 flex flex-col min-h-[18rem] lg:min-h-[32rem] relative">
            <h2 className="text-lg sm:text-[20px] font-semibold text-on-surface mb-4 sm:mb-6 leading-tight">
              Dystrybucja Kategorii
            </h2>

            {isChartLoading && categoryData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant animate-pulse gap-2">
                <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                Loading...
              </div>
            ) : categoryData.length > 0 ? (
              // smooth fading while loading (category dist)
              <div className={`flex-1 flex flex-col justify-center gap-4 transition-all duration-300 ${isChartLoading ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                {categoryData.slice().reverse().map((cat) => (
                  <CategoryRow key={cat.label} {...cat} />
                ))}
                {/* Progress bar */}
                <div className="w-full h-3 rounded-full flex overflow-hidden mt-4">
                  {categoryData.map((cat) => (
                    <div
                      key={cat.label}
                      className="h-full"
                      style={{
                        width: `${cat.pct}%`,
                        backgroundColor: cat.color
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">
                Brak danych do wyświetlenia.
              </div>
            )}
          </div>
        </section>
        {/* Reports list */}
        <section className="bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-4 sm:p-6 lg:p-8">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-4 sm:pb-5 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">summarize</span>
              </div>
              <h2 className="text-xl sm:text-[24px] font-bold text-on-surface leading-tight">Raporty</h2>
            </div>
          </div>
          {/* Report items */}
          <div className="flex flex-col gap-3">
            {visibleReports.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
              />
            ))}
            {visibleReports.length === 0 && (
              <div className="text-center py-12 text-on-surface-variant bg-surface-container-low rounded-xl border border-outline border-dashed">
                Brak raportów w wybranym zakresie dat.
              </div>
            )}
          </div>
        </section>
        {/* Tickets list */}
        <section className="bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-4 sm:p-6 lg:p-8">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-outline-variant pb-4 sm:pb-5 mb-4 sm:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">list_alt</span>
              </div>
              <h2 className="text-xl sm:text-[24px] font-bold text-on-surface leading-tight">Obecne Zgłoszenia</h2>
            </div>

            <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant bg-surface-container-low outline-none cursor-pointer hover:border-primary/40"
              >
                <option value="">Status: Wszystkie</option>
                <option value="NEW">Nowe</option>
                <option value="IN_PROGRESS">W trakcie</option>
                <option value="RESOLVED">Rozwiązane</option>
                <option value="CLOSED">Zamknięte</option>
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant bg-surface-container-low outline-none cursor-pointer hover:border-primary/40"
              >
                <option value="">Priorytet: Wszystkie</option>
                <option value="LOW">Niskie</option>
                <option value="MEDIUM">Średnie</option>
                <option value="HIGH">Wysokie</option>
                <option value="CRITICAL">Krytyczne</option>
              </select>
              <select
                value={sortPriority}
                onChange={(e) => {
                  setSortPriority(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant bg-surface-container-low outline-none cursor-pointer hover:border-primary/40"
              >
                <option value="">Sortuj: Domyślnie</option>
                <option value="desc">Priorytet: najwyższy najpierw</option>
                <option value="asc">Priorytet: najniższy najpierw</option>
              </select>
            </div>
          </div>

          {/* Ticket items */}
          <div className="flex flex-col gap-3">
            {isLoading ? (
               <div className="text-center py-12 text-on-surface-variant bg-surface-container-low rounded-xl border border-outline border-dashed">
                 Ładowanie danych z serwera...
               </div>
            ) : tickets.length > 0 ? (
              <div className="flex flex-col gap-4">
                {tickets.map((ticket) => (
                  <TicketRow key={ticket.id} ticket={ticket} coordinators={coordinators} onTicketUpdated={handleTicketUpdated} />
                ))}

                {/* Pagination Footer */}
                <div className="mt-8 pt-6 border-t border-outline-variant flex flex-col sm:flex-row items-center justify-between gap-4">
                  <p className="text-sm text-on-surface-variant">
                    Pokazano <span className="font-bold text-on-surface">{Math.min(totalCount, (currentPage - 1) * pageSize + 1)} - {Math.min(totalCount, currentPage * pageSize)}</span> z <span className="font-bold text-on-surface">{totalCount}</span> zgłoszeń
                  </p>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1 || isLoading}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline hover:bg-surface-container transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <span className="material-symbols-outlined">chevron_left</span>
                    </button>

                    {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Simple logic to show only some pages if too many
                        if (totalPages > 7 && (pageNum > 2 && pageNum < totalPages - 1 && Math.abs(pageNum - currentPage) > 1)) {
                            if (pageNum === 3 || pageNum === totalPages - 2) return <span key={pageNum} className="px-2">...</span>;
                            return null;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold text-sm transition-all ${
                              currentPage === pageNum 
                              ? 'bg-primary text-on-primary' 
                              : 'hover:bg-surface-container text-on-surface'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                    })}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                      className="w-10 h-10 flex items-center justify-center rounded-lg border border-outline hover:bg-surface-container transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-on-surface-variant bg-surface-container-low rounded-xl border border-outline border-dashed">
                Brak zgłoszeń spełniających wybrane kryteria.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}