import { useState, useRef, useEffect } from "react";
import SendLinkModal from "./Sendlink_modal";
import Transactions from "./Transactions";
import { listInspections, getInspectionOcr } from "../api";

// ---- Icons ----
const KFHLogo = () => (
  <div className="flex items-center gap-2">
    <svg width="36" height="36" viewBox="0 0 40 40" fill="none">
      <path d="M20 4 L28 10 L34 18 L32 28 L24 34 L16 34 L8 28 L6 18 L12 10 Z" fill="none" stroke="#22c55e" strokeWidth="2" />
      <path d="M20 8 L26 13 L30 20 L28 27 L22 31 L18 31 L12 27 L10 20 L14 13 Z" fill="none" stroke="#22c55e" strokeWidth="1.5" />
      <circle cx="20" cy="20" r="4" fill="#22c55e" />
    </svg>
    <div>
      <div className="text-green-500 font-bold text-base leading-none tracking-widest">KFH</div>
      <div className="text-green-500 text-[10px] tracking-widest">TAKAFUL</div>
    </div>
  </div>
);

const SearchIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const CopyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const ChevronDown = () => (
  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);

const ChevronLeft = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
);

const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
);

// ---- Custom Select Dropdown ----
function SelectDropdown({ value, onChange, options, minWidth = "130px" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref} style={{ minWidth }}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white text-sm text-gray-700 w-full hover:border-green-400 transition"
      >
        <span className="flex-1 text-left whitespace-nowrap">{value}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-full">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`block w-full text-left px-4 py-2 text-sm whitespace-nowrap hover:bg-green-50 hover:text-green-600 transition ${value === opt ? "bg-green-50 text-green-600 font-medium" : "text-gray-700"}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---- Calendar Date Picker ----
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function DatePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const formatDisplay = (d) => {
    if (!d) return "dd-mm-yyyy";
    const date = new Date(d);
    return `${String(date.getDate()).padStart(2, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${date.getFullYear()}`;
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const selectDay = (day) => {
    const sel = new Date(year, month, day);
    onChange(sel.toISOString().split("T")[0]);
    setOpen(false);
  };

  const isSelected = (day) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
  };

  const isToday = (day) => {
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === day;
  };

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white text-sm text-gray-700 hover:border-green-400 transition min-w-[130px]"
      >
        <span className="flex-1 text-left">{formatDisplay(value)}</span>
        <CalendarIcon />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 w-64">
          <div className="flex items-center justify-between mb-3">
            <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronLeft />
            </button>
            <span className="text-sm font-semibold text-gray-800">{MONTHS[month]} {year}</span>
            <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronRight />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, idx) => (
              <div key={idx} className="flex items-center justify-center">
                {day ? (
                  <button
                    onClick={() => selectDay(day)}
                    className={`w-8 h-8 text-xs rounded-full flex items-center justify-center transition font-medium
                      ${isSelected(day) ? "bg-green-500 text-white" : isToday(day) ? "border border-green-400 text-green-600" : "text-gray-700 hover:bg-green-50 hover:text-green-600"}`}
                  >
                    {day}
                  </button>
                ) : <div className="w-8 h-8" />}
              </div>
            ))}
          </div>
          <div className="mt-2 pt-2 border-t border-gray-100 flex justify-end">
            <button
              onClick={() => { onChange(""); setOpen(false); }}
              className="text-xs text-gray-400 hover:text-red-500 transition"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Static Data / Mappings ----
const STATUS_META = {
  sent: { label: "Sent", color: "bg-yellow-600" },
  processing: { label: "Processing", color: "bg-purple-500" },
  received: { label: "Received", color: "bg-teal-500" },
  expired: { label: "Expired", color: "bg-gray-500" },
  regenerated: { label: "Regenerated", color: "bg-blue-500" },
};

const STATUS_FILTER_OPTIONS = [
  "All Status",
  "Sent",
  "Processing",
  "Received",
  "Expired",
  "Regenerated",
];

const STATUS_LABEL_TO_CODE = {
  Sent: "sent",
  Processing: "processing",
  Received: "received",
  Expired: "expired",
  Regenerated: "regenerated",
};

const damageColors = {
  "Minor Damage": "bg-orange-400",
  "Major Damage": "bg-red-500",
};

// ---- Tab definitions (outside component to avoid recreation on render) ----
const TABS = [
  {
    key: "pre",
    label: "Pre Inspection",
    d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2",
  },
  {
    key: "motor",
    label: "Motor Claim",
    d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2",
  },
  {
    key: "wind",
    label: "Wind Shield Claim",
    d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

const TAB_TYPE_MAP = {
  pre: "vehicle",
  motor: "motor",
  wind: "windshield",
};

// ---- Main Component ----
export default function App() {
  const [activeTab, setActiveTab] = useState("pre");
  const [activeNav, setActiveNav] = useState("dashboard");
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState([]);
  const [allChecked, setAllChecked] = useState(true);
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("Last Updated");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showSendLink, setShowSendLink] = useState(false);
  const [loadingRows, setLoadingRows] = useState(false);
  const [rowsError, setRowsError] = useState("");
  const [ocrOpen, setOcrOpen] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState("");
  const [ocrData, setOcrData] = useState(null);
  const [ocrRow, setOcrRow] = useState(null);

  // Load inspections list from API
  useEffect(() => {
    let cancelled = false;
    const fetchRows = async () => {
      setLoadingRows(true);
      setRowsError("");

      const statusCode =
        statusFilter === "All Status" ? undefined : STATUS_LABEL_TO_CODE[statusFilter];
      const typeCode = TAB_TYPE_MAP[activeTab];

      const query = {
        status: statusCode,
        name: search || undefined,
        type: typeCode,
        start_date: dateFrom || undefined,
        end_date: dateTo || undefined,
      };
      try {
        const data = await listInspections(query);
        if (!cancelled && Array.isArray(data)) {
          const mapped = data.map((item, index) => ({
            id: item.id ?? index + 1,
            name: item.customer_name ?? "-",
            email: item.email ?? "",
            policy: item.policy_number ?? "",
            date: item.date ?? "",
            time: item.time ?? "",
            damage: item.damage_level ?? "",
            status: item.status ?? "",
            link: item.link ?? "",
          }));
          setRows(mapped);
          setSelected(mapped.map(() => true));
          setAllChecked(mapped.length > 0);
        }
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setSelected([]);
          setAllChecked(false);
          setRowsError("Unable to load inspections. Please try again.");
        }
      } finally {
        if (!cancelled) setLoadingRows(false);
      }
    };

    fetchRows();
    return () => {
      cancelled = true;
    };
  }, [activeTab, statusFilter, dateFrom, dateTo, search]);

  const toggleAll = () => {
    const next = !allChecked;
    setAllChecked(next);
    setSelected(rows.map(() => next));
  };

  const toggleRow = (i) => {
    const next = [...selected];
    next[i] = !next[i];
    setSelected(next);
    setAllChecked(next.every(Boolean));
  };

  const openOcrForRow = async (row) => {
    if (!row?.id) return;
    setOcrRow(row);
    setOcrOpen(true);
    setOcrLoading(true);
    setOcrError("");
    setOcrData(null);
    try {
      const data = await getInspectionOcr(row.id);
      setOcrData(data);
    } catch (err) {
      const msg =
        err?.data?.detail ||
        err?.data?.error ||
        err?.message ||
        "Unable to load inspection details.";
      setOcrError(msg);
    } finally {
      setOcrLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-sm">

      {/* ── Top Nav ── */}
      <header className="bg-white border-b border-gray-200 px-6 flex items-center justify-between h-14">
        <KFHLogo />
        <div className="flex items-center gap-1 text-gray-700 cursor-pointer hover:text-green-600 transition">
          <svg className="w-7 h-7 text-gray-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
          <span className="font-medium">Yash Aswale</span>
          <ChevronDown />
        </div>
      </header>

      {/* ── Sub Nav ── */}
      <div className="bg-gray-800 flex items-center px-4 h-12">
        <button
          onClick={() => setActiveNav("dashboard")}
          className={`flex items-center gap-2 px-6 h-full text-sm font-medium transition ${activeNav === "dashboard" ? "bg-green-500 text-white" : "text-gray-300 hover:text-white"}`}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 9a1 1 0 011-1h5a1 1 0 011 1v4a1 1 0 01-1 1H4a1 1 0 01-1-1v-4zm9-9a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V4zm0 9a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
          </svg>
          Dashboard
        </button>
        <button
          onClick={() => setActiveNav("transaction")}
          className={`flex items-center gap-2 px-6 h-full text-sm font-medium transition ${activeNav === "transaction" ? "bg-green-500 text-white" : "text-gray-300 hover:text-white"}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Transaction
        </button>
      </div>

      {/* ── Transaction Page ── */}
      {activeNav === "transaction" && (
        <Transactions />
      )}

      {/* ── Main Content ── */}
      {activeNav !== "transaction" && <main className="p-5">

        {/* Tabs + Send Button */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium border transition
                  ${activeTab === tab.key
                    ? "bg-green-500 text-white border-green-500"
                    : "bg-white text-gray-600 border-gray-300 hover:border-green-400"}`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.d} />
                </svg>
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowSendLink(true)}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded text-sm font-medium transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Send Link to Customer
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded border border-gray-200 shadow-sm">

          {/* Filter Bar */}
          <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
            {/* Search */}
            <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 min-w-[220px]">
              <SearchIcon />
              <input
                type="text"
                placeholder="Search by name, email,..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
              />
            </div>

            {/* From */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">From</span>
              <DatePicker value={dateFrom} onChange={setDateFrom} />
            </div>

            {/* To */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-gray-700">To</span>
              <DatePicker value={dateTo} onChange={setDateTo} />
            </div>

            {/* Status */}
            <SelectDropdown
              value={statusFilter}
              onChange={setStatusFilter}
              options={STATUS_FILTER_OPTIONS}
              minWidth="130px"
            />

            {/* Sort By */}
            <div className="flex items-center gap-2 ml-auto text-sm">
              <span className="font-medium text-gray-700 whitespace-nowrap">Sort By</span>
              <SelectDropdown
                value={sortBy}
                onChange={setSortBy}
                options={["Last Updated", "First Updated", "Created Date"]}
                minWidth="150px"
              />
            </div>
          </div>

          {/* Show entries + total */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>Show</span>
              <div className="flex items-center gap-1 border border-gray-300 rounded px-2 py-1 cursor-pointer select-none">
                <span>15</span>
                <ChevronDown />
              </div>
              <span>Entries</span>
            </div>
            <div className="text-sm text-gray-600">
              Total List : <span className="font-semibold">{rows.length}</span>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="w-4 h-4 accent-green-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700 w-10">#</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">
                    <span className="flex items-center gap-1">
                      Customer Name
                      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </span>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Email Address</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Policy Number</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Damage Level</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">All Status</th>
                  <th className="px-4 py-3 text-left font-semibold text-gray-700">Link</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition bg-white">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected[i]}
                        onChange={() => toggleRow(i)}
                        className="w-4 h-4 accent-green-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{row.name}</td>
                    <td className="px-4 py-3 text-gray-500">{row.email}</td>
                    <td className="px-4 py-3 text-gray-600">{row.policy}</td>
                    <td className="px-4 py-3 text-gray-600">{row.date}</td>
                    <td className="px-4 py-3 text-gray-600">{row.time}</td>
                    <td className="px-4 py-3">
                      {row.damage ? (
                        <span className={`${damageColors[row.damage]} text-white text-xs font-semibold px-3 py-1 rounded`}>
                          {row.damage}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const meta = STATUS_META[row.status];
                        if (!meta) {
                          return (
                            <span className="bg-gray-400 text-white text-xs font-semibold px-3 py-1 rounded">
                              {row.status || "Unknown"}
                            </span>
                          );
                        }
                        return (
                          <span className={`${meta.color} text-white text-xs font-semibold px-3 py-1 rounded`}>
                            {meta.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {row.link && (
                          <>
                            <span className="text-blue-500 text-xs truncate max-w-[130px]">{row.link}</span>
                            <button className="text-gray-400 hover:text-gray-600 transition" title="Copy">
                              <CopyIcon />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openOcrForRow(row)}
                          className="text-gray-400 hover:text-gray-700 transition ml-1"
                          title="View"
                        >
                          <EyeIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination / status */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {loadingRows
                ? "Loading inspections..."
                : rows.length
                  ? `Showing 1–${rows.length} of ${rows.length}`
                  : "No inspections found"}
            </span>
            {rowsError && (
              <span className="text-xs text-orange-500">
                {rowsError}
              </span>
            )}
          </div>

        </div>
      </main>}


      {/* ── Send Link Modal ── */}
      {showSendLink && <SendLinkModal onClose={() => setShowSendLink(false)} />}

      {/* ── OCR Details Modal ── */}
      {ocrOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  Inspection Details
                </h2>
                {ocrRow && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {ocrRow.name} · Policy {ocrRow.policy}
                  </p>
                )}
              </div>
              <button
                onClick={() => { setOcrOpen(false); setOcrData(null); setOcrError(""); }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-3">
              {ocrLoading && (
                <p className="text-sm text-gray-500">Loading OCR details…</p>
              )}
              {ocrError && (
                <p className="text-sm text-red-600">{ocrError}</p>
              )}
              {!ocrLoading && !ocrError && ocrData && (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">License Plate</span>
                    <span className="text-gray-900 font-semibold">
                      {ocrData.license_plate || ocrData.plate || "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 font-medium">Chassis Number</span>
                    <span className="text-gray-900 font-semibold">
                      {ocrData.chassis_number || ocrData.chassis || "-"}
                    </span>
                  </div>
                </>
              )}
              {!ocrLoading && !ocrError && !ocrData && (
                <p className="text-sm text-gray-500">No OCR data available.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}