import { useState, useRef, useEffect } from "react";
import { getAccountSummary, listInspections } from "../api";

const DAMAGE_LEVELS = ["No Damage", "Minor Damage", "Major Damage"];

// ─── Bar Chart ─────────────────────────────────────────────────────────────────
function BarChart({ data, activeView }) {
  const [tooltip, setTooltip] = useState(null);
  const maxVal = data.length ? Math.max(...data.map((d) => d.value)) : 0;
  const ySteps = 6;
  const yMax = maxVal ? Math.ceil(maxVal / 5) * 5 : 10;

  return (
    <div className="relative w-full h-full flex flex-col">
      <div className="flex flex-1 gap-0">
        {/* Y axis */}
        <div className="flex flex-col-reverse justify-between pr-3 pb-6 text-right" style={{ minWidth: 44 }}>
          {Array.from({ length: ySteps + 1 }, (_, i) => (
            <span key={i} className="text-xs text-gray-400 leading-none">
              {Math.round((yMax / ySteps) * i)}
            </span>
          ))}
        </div>

        {/* Bars + x-axis */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 relative">
            {/* Grid lines */}
            {Array.from({ length: ySteps }, (_, i) => (
              <div
                key={i}
                className="absolute left-0 right-0 border-t border-gray-100"
                style={{ bottom: `${((i + 1) / ySteps) * 100}%` }}
              />
            ))}

            {/* Bars */}
            <div className="absolute inset-0 flex items-end gap-1 px-1 pb-0">
              {data.map((d, i) => {
                const pct = (d.value / yMax) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                    {tooltip?.i === i && (
                      <div className="absolute bottom-full mb-1 bg-white border border-gray-200 shadow-lg rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-800 whitespace-nowrap z-10 pointer-events-none">
                        {d.value.toLocaleString()} Link Sent
                        <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-200" />
                      </div>
                    )}
                    <div
                      className="w-full rounded-t-sm cursor-pointer transition-all duration-200 group-hover:opacity-80"
                      style={{ height: `${pct}%`, backgroundColor: "#1e7e5c", minHeight: 4 }}
                      onMouseEnter={() => setTooltip({ i })}
                      onMouseLeave={() => setTooltip(null)}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* X labels */}
          <div className="flex gap-1 px-1 pt-1">
            {data.map((d, i) => (
              <div key={i} className="flex-1 text-center text-xs text-gray-500">{d.label}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Damage Badge ──────────────────────────────────────────────────────────────
function DamageBadge({ level }) {
  const map = {
    "No Damage": "bg-green-500 text-white",
    "Minor Damage": "bg-orange-400 text-white",
    "Major Damage": "bg-red-600 text-white",
  };
  return (
    <span className={`px-3 py-1 rounded text-xs font-semibold ${map[level] || "bg-gray-200 text-gray-700"}`}>
      {level}
    </span>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [chartView, setChartView] = useState("Days");
  const [month, setMonth] = useState("February 2026");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [sortBy, setSortBy] = useState("Newest First");
  const [showEntries, setShowEntries] = useState(15);
  const [page, setPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverTotalCount, setServerTotalCount] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [chartData, setChartData] = useState([]);
  const [summary, setSummary] = useState({
    total_links_sent: 0,
    total_clicks: 0,
    total_opens: 0,
    not_clicked: 0,
  });
  const [rows, setRows] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Load account summary for chart + cards
  useEffect(() => {
    let cancelled = false;

    const fetchSummary = async () => {
      setLoadingSummary(true);
      const [monthLabel] = month.split(" ");
      const monthCode = monthLabel.toLowerCase().slice(0, 3); // jan, feb, mar...
      const period =
        chartView === "Days" ? "days" : chartView === "Week" ? "weeks" : "months";

      try {
        const data = await getAccountSummary({ month: monthCode, period });
        if (cancelled || !data) return;

        setSummary({
          total_links_sent: data.total_links_sent ?? 0,
          total_clicks: data.total_clicks ?? 0,
          total_opens: data.total_completed ?? 0,
          not_clicked: data.not_clicked ?? 0,
        });

        const overTime = data.link_sent_over_time || {};
        const points = Object.entries(overTime)
          .sort(([a], [b]) => (a < b ? -1 : 1))
          .map(([date, value]) => ({
            label: date,
            value: typeof value === "number" ? value : 0,
          }));
        setChartData(points);
      } catch {
        if (!cancelled) {
          setSummary({
            total_links_sent: 0,
            total_clicks: 0,
            total_opens: 0,
            not_clicked: 0,
          });
          setChartData([]);
        }
      } finally {
        if (!cancelled) setLoadingSummary(false);
      }
    };

    fetchSummary();
    return () => {
      cancelled = true;
    };
  }, [month, chartView]);

  // Load transactions list from /customers/list/
  useEffect(() => {
    let cancelled = false;

    const fetchRows = async () => {
      setLoadingRows(true);

      const sortByParam = sortBy === "Oldest First" ? "asc" : "des";
      const query = {
        name: debouncedSearch || undefined,
        status: statusFilter === "All Status" ? undefined : statusFilter.toLowerCase(),
        start_date: fromDate || undefined,
        end_date: toDate || undefined,
        sort_by: sortByParam,
        page,
      };

      try {
        const data = await listInspections(query);
        const results = Array.isArray(data) ? data : (data?.results ?? []);
        const total = Array.isArray(data) ? results.length : (data?.count ?? results.length);
        const pages = Array.isArray(data) ? 1 : (data?.total_pages ?? 1);
        const current = Array.isArray(data) ? page : (data?.current_page ?? page);

        if (!cancelled) {
          setServerTotalCount(total);
          setServerTotalPages(pages);
          if (current !== page) setPage(current);

          const mapped = results.map((item, index) => {
            let dateStr = "";
            let timeStr = "";
            if (item.created_at) {
              try {
                const dt = new Date(item.created_at);
                dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
                timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
              } catch (_) { }
            }
            return {
              id: item.id ?? index + 1,
              name: item.customer_name ?? "-",
              email: item.email ?? "",
              type: item.type_display ?? "",
              policyNumber: item.policy_number ?? "",
              damageLevel: item.damage_level ?? "",
              date: dateStr,
              time: timeStr,
            };
          });
          setRows(mapped);
          setSelected(new Set(mapped.map((t) => t.id)));
        }
      } catch {
        if (!cancelled) {
          setRows([]);
          setSelected(new Set());
          setServerTotalCount(0);
          setServerTotalPages(1);
        }
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    };

    fetchRows();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, statusFilter, fromDate, toDate, sortBy, page]);

  const useServerPagination = serverTotalPages > 1 || serverTotalCount > rows.length;
  const computedTotalPages = useServerPagination ? serverTotalPages : Math.max(1, Math.ceil(rows.length / showEntries));
  const computedTotalCount = useServerPagination ? serverTotalCount : rows.length;
  const serverPageSize = serverTotalPages > 0 ? Math.ceil(serverTotalCount / serverTotalPages) : showEntries;
  const baseIndex = (page - 1) * (useServerPagination ? serverPageSize : showEntries);
  const paginated = useServerPagination ? rows : rows.slice((page - 1) * showEntries, page * showEntries);

  const toggleAll = () => {
    if (paginated.every((t) => selected.has(t.id))) {
      setSelected((s) => { const n = new Set(s); paginated.forEach((t) => n.delete(t.id)); return n; });
    } else {
      setSelected((s) => { const n = new Set(s); paginated.forEach((t) => n.add(t.id)); return n; });
    }
  };

  const toggleOne = (id) => {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const allChecked = paginated.length > 0 && paginated.every((t) => selected.has(t.id));

  return (
    <div className="min-h-screen bg-gray-100 p-6" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>

      {/* Top Section */}
      <div className="flex gap-6 mb-6">
        {/* Left Panel */}
        <div className="w-[520px] shrink-0 flex flex-col gap-4">
          {/* Credits / summary */}
          <div className="bg-[#1e7e5c] rounded-xl px-6 py-4 flex items-center justify-between">
            <span className="text-white font-semibold text-base">Total Links Sent</span>
            <span className="border-2 border-white text-white font-bold text-base px-4 py-1.5 rounded-lg">
              {summary.total_links_sent}
            </span>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Month</span>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
            >
              {["January 2026", "February 2026", "March 2026"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </div>

          {/* Stats Grid from account summary */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "Total Link Sent", value: summary.total_links_sent },
              { label: "Clicks", value: summary.total_clicks },
              { label: "Total Completed", value: summary.total_opens },
              { label: "Not Clicked", value: summary.not_clicked },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <p className="text-xs text-gray-500 font-medium mb-2">{s.label}</p>
                <p className="text-3xl font-light text-gray-500">
                  {loadingSummary ? "…" : s.value}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Chart */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-semibold text-gray-800">Link Sent Over Time</h3>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-[#1e7e5c]" />
                <span className="text-xs text-gray-500">Link Sent</span>
              </div>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {["Days", "Week", "Month"].map((v) => (
                <button
                  key={v}
                  onClick={() => setChartView(v)}
                  className={`px-4 py-1.5 text-xs font-semibold transition-colors ${chartView === v ? "bg-green-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <div className="h-64">
            {chartData.length ? (
              <BarChart data={chartData} activeView={chartView} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">
                {loadingSummary ? "Loading chart..." : "No data available for selected period."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900 mb-4">Transaction List</h2>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-white w-64">
              <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, email,..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
              />
            </div>

            {/* From */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">From</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* To */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">To</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>

            {/* Status (by inspection status string) */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
            >
              <option>All Status</option>
              <option>sent</option>
              <option>processing</option>
              <option>received</option>
              <option>expired</option>
              <option>regenerated</option>
            </select>

            <div className="ml-auto flex items-center gap-2">
              <span className="text-sm text-gray-600 font-medium">Sort By</span>
              <select
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white outline-none focus:ring-2 focus:ring-green-500 cursor-pointer"
              >
                <option>Newest First</option>
                <option>Oldest First</option>
              </select>
            </div>
          </div>

          {/* Total */}
          <div className="flex items-center justify-end mt-4">
            <span className="text-sm font-semibold text-gray-700">
              Total List : {loadingRows ? "…" : computedTotalCount}
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/50">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 accent-green-600 cursor-pointer"
                  />
                </th>
                {["#", "Customer Name", "Email Address", "Type", "Policy Number", "Date", "Time", ""].map((h, i) => (
                  <th key={i} className="px-3 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((t, idx) => (
                <tr
                  key={t.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? "" : ""}`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(t.id)}
                      onChange={() => toggleOne(t.id)}
                      className="w-4 h-4 rounded border-gray-300 accent-green-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-500">{baseIndex + idx + 1}</td>
                  <td className="px-3 py-3 text-sm text-gray-800 font-medium">{t.name}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{t.email}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{t.type_display}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{t.policyNumber}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{t.date}</td>
                  <td className="px-3 py-3 text-sm text-gray-600">{t.time}</td>
                  <td className="px-3 py-3">
                    <button className="text-gray-500 hover:text-gray-800 transition-colors p-1">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {computedTotalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Page {page} of {computedTotalPages} (Total {computedTotalCount})
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Prev
              </button>
              {Array.from({ length: Math.min(5, computedTotalPages) }, (_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${page === p ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
                  >
                    {p}
                  </button>
                );
              })}
              {computedTotalPages > 5 && <span className="text-gray-400 text-sm px-1">…</span>}
              <button
                onClick={() => setPage((p) => Math.min(computedTotalPages, p + 1))}
                disabled={page === computedTotalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}