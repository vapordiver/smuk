import { useState, useEffect, useMemo } from 'react';
import api from '../services/api';

/**
 * CoordinatorPanel – Analiza Zgłoszeń view for coordinator role.
 * Based on code.html mockup and the Indigo Scholar Design System (DESIGN.md).
 */

/* ── Mock data (retained only for charts and reports) ── */
const TREND_DATA = [
  { label: 'Wrz', value: 42, heightPct: 40 },
  { label: 'Paź', value: 68, heightPct: 65 },
  { label: 'Lis', value: 94, heightPct: 85 },
  { label: 'Gru', value: 48, heightPct: 45 },
  { label: 'Sty', value: 56, heightPct: 55 },
  { label: 'Lut', value: 76, heightPct: 70, active: true },
];

const CATEGORY_DIST = [
  { label: 'Infrastruktura IT', pct: 45, color: 'bg-primary' },
  { label: 'Hydraulika', pct: 25, color: 'bg-secondary' },
  { label: 'Elektryka', pct: 20, color: 'bg-tertiary' },
  { label: 'Inne', pct: 10, color: 'bg-outline-variant' },
];

const REPORTS_LIST = [
  {
    id: 1,
    icon: 'picture_as_pdf',
    iconColor: 'text-primary-fixed-dim',
    title: 'Raport Miesięczny - Luty 2024',
    description: 'Wszystkie kategorie, Wszystkie statusy',
    generatedAt: 'Dzisiaj, 09:41',
  },
  {
    id: 2,
    icon: 'analytics',
    iconColor: 'text-secondary',
    title: 'Usterki IT - Semestr Zimowy',
    description: 'Infrastruktura IT, Tylko zakończone',
    generatedAt: 'Wczoraj, 14:20',
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

const MOCK_COORDINATORS = [
  { id: 'mock1', first_name: 'Jan', last_name: 'Kowalski' },
  { id: 'mock2', first_name: 'Anna', last_name: 'Nowak' },
  { id: 'mock3', first_name: 'Piotr', last_name: 'Wiśniewski' }
];

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

/* ── Sub-components ── */

function BarChart({ data }) {
  return (
    <div className="flex-1 flex items-end justify-between gap-2 md:gap-6 pt-4 pb-2 border-b border-outline-variant relative">
      {/* Dashed guide lines */}
      <div className="absolute left-0 top-0 h-full w-full flex flex-col justify-between pointer-events-none z-0">
        <div className="border-b border-dashed border-outline-variant w-full h-0" />
        <div className="border-b border-dashed border-outline-variant w-full h-0" />
        <div className="border-b border-dashed border-outline-variant w-full h-0" />
      </div>

      {data.map((bar) => (
        <div key={bar.label} className="flex flex-col items-center justify-end w-full h-full z-10">
          <div
            className={`w-full rounded-t-md relative ${
              bar.active ? 'bg-primary' : 'bg-primary/30'
            }`}
            style={{ height: `${bar.heightPct}%` }}
          >
            {bar.active && (
              <div
                className="absolute -top-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface text-xs py-1 px-2 rounded font-medium shadow-sm"
              >
                {bar.value}
              </div>
            )}
          </div>
          <span
            className={`text-xs font-medium mt-3 ${
              bar.active ? 'text-primary font-bold' : 'text-on-surface-variant'
            }`}
          >
            {bar.label}
          </span>
        </div>
      ))}
    </div>
  );
}

function CategoryRow({ label, pct, color }) {
  return (
    <div className="flex items-center gap-3">
      <div className={`w-3 h-3 rounded-full shrink-0 ${color}`} />
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

  // Sync state if ticket props update
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
            // assigned_to_id: assignee || null // Omitted as per user request (mock data vs backend validation)
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
    if (log.field_changed === 'note') {
       return {
          title: 'Dodano notatkę',
          content: <span className="font-italic text-on-surface">"{log.new_value}"</span>
       };
    }
    
    if (log.field_changed === 'assigned_to') {
       const getMockName = (id) => {
         if (!id || id === 'None' || id === 'null') return '';
         const c = MOCK_COORDINATORS.find(m => m.id === id);
         return c ? `${c.first_name} ${c.last_name}` : 'Nieznany użytkownik';
       };
       const oldName = getMockName(log.old_value);
       const newName = getMockName(log.new_value);
       
       if (!oldName) {
           return {
             title: 'Przypisano zgłoszenie',
             content: <>do <span className="font-bold text-primary">{newName}</span></>
           };
       } else if (!newName) {
           return {
             title: 'Usunięto przypisanie',
             content: <>było <span className="line-through">{oldName}</span></>
           };
       } else {
           return {
             title: 'Zmieniono przypisanie',
             content: <>z <span className="line-through">{oldName}</span> na <span className="font-bold text-primary">{newName}</span></>
           };
       }
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
       content: <>z <span className="line-through">{formatVal(log.old_value, log.field_changed)}</span> na <span className="font-bold text-primary">{formatVal(log.new_value, log.field_changed)}</span></>
    };
  };

  return (
    <div className="bg-surface rounded-xl flex flex-col outline outline-1 outline-outline hover:shadow-sm transition-shadow">
      <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <h3 className="font-bold text-on-surface">{ticket.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium mt-1">
            <span className="text-on-surface-variant">{formatDate(ticket.created_at)}</span>
            <span className="mx-1 text-outline-variant">•</span>
            <span className="text-on-surface-variant">{ticket.category?.name || 'Inne'}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
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
                className={`text-xs font-bold uppercase rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none hover:shadow-sm transition-shadow ${getStatusColor(status)} ${isClosed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                className={`text-xs font-bold rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none hover:shadow-sm transition-shadow ${getPriorityColor(priority)} ${isClosed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
               className={`text-xs font-medium rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none bg-surface-container-low text-on-surface hover:shadow-sm transition-shadow max-w-[150px] truncate ${isClosed ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
             >
               <option value="">Nieprzypisane</option>
               {coordinators.map(c => (
                   <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
               ))}
             </select>
             {!isClosed && <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-60 group-hover:opacity-100 transition-opacity">arrow_drop_down</span>}
           </div>

           {hasChanges && !isClosed && (
             <button 
               className="px-3 py-1 bg-primary text-on-primary text-xs font-bold rounded-lg hover:scale-[0.98] transition-transform shadow-sm flex items-center gap-1 disabled:opacity-50"
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
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest rounded-b-xl flex flex-col gap-4">
          <div>
             <h4 className="text-sm font-bold text-on-surface mb-3">Historia zgłoszenia (AuditLog)</h4>
             <div className="flex flex-col gap-3 pl-2 border-l-2 border-outline-variant ml-2">
               {auditLog.length > 0 ? auditLog.map((log) => {
                 const display = getLogDisplay(log);
                 return (
                 <div key={log.id} className="relative pl-4">
                   <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary/40 border-2 border-surface" />
                   <div className="text-xs font-medium text-on-surface-variant mb-0.5">
                       {formatDate(log.created_at)} • {log.user?.first_name} {log.user?.last_name}
                   </div>
                   <div className="text-sm text-on-surface font-semibold">{display.title}</div>
                   <div className="text-xs text-on-surface-variant mt-1 p-2 bg-surface-container rounded-lg border border-outline">
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
              <div className="mt-2 pt-4 border-t border-outline-variant text-sm text-on-surface-variant italic text-center">
                  Zgłoszenie jest zamknięte i nie można go już edytować.
              </div>
          )}

          {status === 'RESOLVED' && !isClosed && (
             <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-outline-variant" onClick={(e) => e.stopPropagation()}>
               <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                 Notatka rozwiązująca (wymagana do zamknięcia)
               </label>
               <textarea 
                 value={closingNote}
                 onChange={(e) => setClosingNote(e.target.value)}
                 className="w-full p-3 rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm bg-surface resize-none"
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
                                               // assigned_to_id: assignee || null,
                       note: closingNote
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
                 className="self-end px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:scale-[0.98] transition-transform disabled:opacity-50"
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 10;

  // Filtry do sekcji biletów
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortPriority, setSortPriority] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
        const offset = (currentPage - 1) * pageSize;
        const params = new URLSearchParams({
            limit: pageSize,
            offset: offset,
        });

        if (statusFilter) params.append('status', statusFilter);
        if (priorityFilter) params.append('priority', priorityFilter);
        if (searchQuery) params.append('search', searchQuery);
        if (dateFrom) params.append('date_from', dateFrom);
        if (dateTo) params.append('date_to', dateTo);
        if (sortPriority) {
           const prefix = sortPriority === 'desc' ? '-' : '';
           params.append('ordering', `${prefix}priority`);
        } else {
           params.append('ordering', '-created_at');
        }

        const res = await api.get(`tickets/?${params.toString()}`);
        setTickets(res.data.results || []);
        setTotalCount(res.data.count || 0);
    } catch (err) {
        console.error("Błąd podczas pobierania danych:", err);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      fetchTickets();
  }, [currentPage, statusFilter, priorityFilter, searchQuery, dateFrom, dateTo, sortPriority]);

  // Reset page when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [statusFilter, priorityFilter, searchQuery, dateFrom, dateTo, sortPriority]);

  const handleTicketUpdated = (updatedTicket) => {
      // Refresh the entire list from server to ensure sorting/pagination/filtering is consistent
      fetchTickets();
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <main className="flex-1 overflow-y-auto p-6 lg:p-10 scrollbar-thin">
      {/* ── Page header ── */}
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-[30px] font-bold tracking-[-0.015em] text-on-surface leading-tight">
            Analiza Zgłoszeń
          </h1>
          <p className="text-on-surface-variant text-base mt-2">
            Kompleksowy przegląd i generowanie raportów usterek.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-xl border border-outline-variant text-sm font-medium text-on-surface">
          <span className="material-symbols-outlined text-primary text-[20px]">calendar_month</span>
          Bieżący semestr
        </div>
      </header>

      <div className="flex flex-col gap-8">
        {/* ── Visualization bento ── */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Trend chart (2/3 width) */}
          <div className="lg:col-span-2 bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-6 flex flex-col h-80">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-[20px] font-semibold text-on-surface">
                Trend Zgłoszeń (Ostatnie 6 miesięcy)
              </h2>
              <button className="text-on-surface-variant hover:text-primary transition-colors">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
            <BarChart data={TREND_DATA} />
          </div>

          {/* Category distribution (1/3 width) */}
          <div className="bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-6 flex flex-col h-80">
            <h2 className="text-[20px] font-semibold text-on-surface mb-6">
              Dystrybucja Kategorii
            </h2>
            <div className="flex-1 flex flex-col justify-center gap-4">
              {CATEGORY_DIST.map((cat) => (
                <CategoryRow key={cat.label} {...cat} />
              ))}
              {/* Progress bar */}
              <div className="w-full h-3 rounded-full flex overflow-hidden mt-4">
                {CATEGORY_DIST.map((cat) => (
                  <div
                    key={cat.label}
                    className={`h-full ${cat.color}`}
                    style={{ width: `${cat.pct}%` }}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Reports list ── */}
        <section className="bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-8">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">summarize</span>
              </div>
              <h2 className="text-[24px] font-bold text-on-surface">Raporty</h2>
            </div>

            {/* Optional date filter toggle */}
            <button
              onClick={() => setShowDateFilter((v) => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                showDateFilter
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary/40 hover:text-primary'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">date_range</span>
              Filtruj po dacie
              <span className="material-symbols-outlined text-[16px]">
                {showDateFilter ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          </div>

          {/* Collapsible date range filter */}
          {showDateFilter && (
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4 mb-6 p-4 bg-surface-container-low rounded-xl border border-outline-variant">
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Data od
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                />
              </div>
              <div className="flex flex-col gap-1.5 flex-1">
                <label className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Data do
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-surface border border-outline-variant text-on-surface font-medium focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow"
                />
              </div>
              <button
                onClick={() => { setDateFrom(''); setDateTo(''); }}
                className="px-4 py-3 rounded-xl text-sm font-semibold text-on-surface-variant hover:text-error hover:bg-error-container transition-colors"
              >
                Wyczyść
              </button>
            </div>
          )}

          {/* Report items */}
          <div className="flex flex-col gap-3">
            {REPORTS_LIST.map((report) => (
              <ReportRow
                key={report.id}
                report={report}
                dateFrom={dateFrom}
                dateTo={dateTo}
              />
            ))}
          </div>

          {/* Archive link */}
          <div className="mt-6 flex justify-end">
            <a
              href="#"
              className="text-sm font-bold text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[16px]">folder_open</span>
              Zobacz archiwum
            </a>
          </div>
        </section>

        {/* ── Tickets list ── */}
        <section className="bg-surface rounded-xl shadow-soft outline outline-1 outline-outline p-8">
          {/* Section header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">list_alt</span>
              </div>
              <h2 className="text-[24px] font-bold text-on-surface">Obecne Zgłoszenia</h2>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)} 
                className="px-4 py-2 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant bg-surface-container-low outline-none cursor-pointer hover:border-primary/40"
              >
                <option value="">Status: Wszystkie</option>
                <option value="NEW">Nowe</option>
                <option value="IN_PROGRESS">W trakcie</option>
                <option value="RESOLVED">Rozwiązane</option>
                <option value="CLOSED">Zamknięte</option>
              </select>
              <select 
                value={priorityFilter} 
                onChange={(e) => setPriorityFilter(e.target.value)} 
                className="px-4 py-2 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant bg-surface-container-low outline-none cursor-pointer hover:border-primary/40"
              >
                <option value="">Priorytet: Wszystkie</option>
                <option value="LOW">Niskie</option>
                <option value="MEDIUM">Średnie</option>
                <option value="HIGH">Wysokie</option>
                <option value="CRITICAL">Krytyczne</option>
              </select>
              <select 
                value={sortPriority} 
                onChange={(e) => setSortPriority(e.target.value)} 
                className="px-4 py-2 rounded-xl border border-outline-variant text-sm font-semibold text-on-surface-variant bg-surface-container-low outline-none cursor-pointer hover:border-primary/40"
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
                  <TicketRow key={ticket.id} ticket={ticket} coordinators={MOCK_COORDINATORS} onTicketUpdated={handleTicketUpdated} />
                ))}
                
                {/* ── Pagination Footer ── */}
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
