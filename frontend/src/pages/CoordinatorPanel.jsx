import { useState } from 'react';

/**
 * CoordinatorPanel – Analiza Zgłoszeń view for coordinator role.
 * Based on code.html mockup and the Indigo Scholar Design System (DESIGN.md).
 *
 * Replaces the "Kreator Raportu" section with a list of available reports
 * that can be triggered individually, with an optional date-range filter.
 */

/* ── Mock data ── */
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
  {
    id: 3,
    icon: 'summarize',
    iconColor: 'text-tertiary',
    title: 'Raport Hydraulika Q4 2023',
    description: 'Hydraulika, Wszystkie statusy',
    generatedAt: '12.01.2024, 11:05',
  },
  {
    id: 4,
    icon: 'bar_chart',
    iconColor: 'text-on-surface-variant',
    title: 'Raport Roczny 2023',
    description: 'Wszystkie kategorie, Wszystkie statusy',
    generatedAt: '03.01.2024, 08:30',
  },
];

const TICKETS_LIST = [
  {
    id: 1,
    title: 'Uszkodzony panel LED',
    category: 'Elektryka',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assignee: 'Jan Kowalski',
    date: '2024-05-07',
    auditLog: [
      { date: '2024-05-07 10:00', user: 'Jan Kowalski', action: 'Zmieniono status na W TRAKCIE' },
      { date: '2024-05-07 09:00', user: 'System', action: 'Utworzono zgłoszenie' }
    ]
  },
  {
    id: 2,
    title: 'Wykryto wyciek wody',
    category: 'Hydraulika',
    status: 'NEW',
    priority: 'CRITICAL',
    assignee: '',
    date: '2024-05-07',
    auditLog: [
      { date: '2024-05-07 11:30', user: 'System', action: 'Utworzono zgłoszenie' }
    ]
  },
  {
    id: 3,
    title: 'Brak internetu na 2 piętrze',
    category: 'Infrastruktura IT',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    assignee: 'Anna Nowak',
    date: '2024-05-06',
    auditLog: [
      { date: '2024-05-07 08:15', user: 'Anna Nowak', action: 'Zmieniono status na ROZWIĄZANE', note: 'Zrestartowano switch' },
      { date: '2024-05-06 14:00', user: 'Anna Nowak', action: 'Zmieniono status na W TRAKCIE' },
      { date: '2024-05-06 13:00', user: 'System', action: 'Utworzono zgłoszenie' }
    ]
  }
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

function TicketRow({ ticket }) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState(ticket.status);
  const [priority, setPriority] = useState(ticket.priority);
  const [assignee, setAssignee] = useState(ticket.assignee);

  return (
    <div className="bg-surface rounded-xl flex flex-col outline outline-1 outline-outline hover:shadow-sm transition-shadow">
      <div className="p-4 flex flex-col md:flex-row items-start md:items-center gap-4 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex-1">
          <h3 className="font-bold text-on-surface">{ticket.title}</h3>
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium mt-1">
            <span className="text-on-surface-variant">{ticket.date}</span>
            <span className="mx-1 text-outline-variant">•</span>
            <span className="text-on-surface-variant">{ticket.category}</span>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
           <div className="relative group cursor-pointer" title="Zmień status">
             <select 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
                className={`text-xs font-bold uppercase rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none cursor-pointer hover:shadow-sm transition-shadow ${STATUS_MAP[status]?.color}`}
             >
               {Object.entries(STATUS_MAP).map(([k, v]) => (
                 <option key={k} value={k} className="bg-surface text-on-surface uppercase">{v.label}</option>
               ))}
             </select>
             <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-60 group-hover:opacity-100 transition-opacity">arrow_drop_down</span>
           </div>

           <div className="relative group cursor-pointer" title="Zmień priorytet">
             <select 
                value={priority} 
                onChange={(e) => setPriority(e.target.value)}
                className={`text-xs font-bold rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none cursor-pointer hover:shadow-sm transition-shadow ${PRIORITY_MAP[priority]?.color}`}
             >
               {Object.entries(PRIORITY_MAP).map(([k, v]) => (
                 <option key={k} value={k} className="bg-surface text-on-surface">{v.label}</option>
               ))}
             </select>
             <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-60 group-hover:opacity-100 transition-opacity">arrow_drop_down</span>
           </div>

           <div className="relative group cursor-pointer" title="Zmień przypisanie">
             <select
               value={assignee}
               onChange={(e) => setAssignee(e.target.value)}
               className="text-xs font-medium rounded-lg pl-2 pr-6 py-1 outline-none border border-outline-variant appearance-none cursor-pointer bg-surface-container-low text-on-surface hover:shadow-sm transition-shadow"
             >
               <option value="">Nieprzypisane</option>
               <option value="Jan Kowalski">Jan Kowalski</option>
               <option value="Anna Nowak">Anna Nowak</option>
               <option value="Piotr Wiśniewski">Piotr Wiśniewski</option>
             </select>
             <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none text-[16px] opacity-60 group-hover:opacity-100 transition-opacity">arrow_drop_down</span>
           </div>

           <button className="p-1 rounded hover:bg-surface-container text-on-surface-variant transition-colors" onClick={() => setExpanded(!expanded)}>
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
               {ticket.auditLog.map((log, idx) => (
                 <div key={idx} className="relative pl-4">
                   <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary/40 border-2 border-surface" />
                   <div className="text-xs font-medium text-on-surface-variant mb-0.5">{log.date} • {log.user}</div>
                   <div className="text-sm text-on-surface">{log.action}</div>
                   {log.note && <div className="text-xs text-on-surface-variant mt-1 p-2 bg-surface-container rounded-lg border border-outline">{log.note}</div>}
                 </div>
               ))}
             </div>
          </div>
          {status === 'RESOLVED' && (
             <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-outline-variant">
               <label className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                 Notatka rozwiązująca (wymagana)
               </label>
               <textarea 
                 className="w-full p-3 rounded-lg border border-outline focus:border-primary focus:ring-1 focus:ring-primary outline-none text-sm bg-surface resize-none"
                 rows="2" 
                 placeholder="Wpisz notatkę z rozwiązaniem problemu..." 
               />
               <button className="self-end px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:scale-[0.98] transition-transform">
                 Zapisz notatkę
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

  // Filtry do sekcji biletów
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortPriority, setSortPriority] = useState('');

  const PRIORITY_WEIGHT = {
    LOW: 1,
    MEDIUM: 2,
    HIGH: 3,
    CRITICAL: 4
  };

  const filteredTickets = TICKETS_LIST.filter(ticket => {
    if (statusFilter && ticket.status !== statusFilter) return false;
    if (priorityFilter && ticket.priority !== priorityFilter) return false;
    return true;
  });

  const sortedAndFilteredTickets = [...filteredTickets].sort((a, b) => {
    if (sortPriority === 'desc') {
      return (PRIORITY_WEIGHT[b.priority] || 0) - (PRIORITY_WEIGHT[a.priority] || 0);
    } else if (sortPriority === 'asc') {
      return (PRIORITY_WEIGHT[a.priority] || 0) - (PRIORITY_WEIGHT[b.priority] || 0);
    }
    return 0;
  });

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
            {sortedAndFilteredTickets.length > 0 ? (
              sortedAndFilteredTickets.map((ticket) => (
                <TicketRow key={ticket.id} ticket={ticket} />
              ))
            ) : (
              <div className="text-center py-8 text-on-surface-variant bg-surface-container-low rounded-xl border border-outline border-dashed">
                Brak zgłoszeń spełniających wybrane filtry.
              </div>
            )}
          </div>

          {/* Pagination mockup */}
          <div className="mt-6 flex items-center justify-between pt-4 border-t border-outline-variant text-sm font-medium text-on-surface-variant">
            <span>Pokazuję 1-3 z 24 zgłoszeń</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg bg-primary text-on-primary font-bold shadow-sm">1</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface transition-colors">2</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface transition-colors">3</button>
              <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container text-on-surface transition-colors">
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
