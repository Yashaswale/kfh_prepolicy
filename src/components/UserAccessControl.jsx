import { useState, useEffect, Fragment, useRef } from "react";
import {
  createSubUser,
  updateUser,
  deleteUser,
  registerSupervisor,
  getAccountSummary,
  getSupervisorAccountsSummary,
  getSubUsersSummary,
  listInspections,
  getInspectionOcr,
  getDamageResults,
  getWindshieldResults,
  regenerateInspectionLink,
  markInspectionAsViewed,
  changePassword,
} from "../api";
import { getUser } from "../utils/auth";
import PrePolicyAssessmentResult from "../pages/Pre-policy";
import WindShieldAssessmentResult from "../pages/WindsheildClaim";

// ---- Icons ----
const ArrowLeftIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
  </svg>
);

const EditIcon = () => (
  <svg className="w-4 h-4 text-gray-500 hover:text-green-600 transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const DeleteIcon = () => (
  <svg className="w-4 h-4 text-gray-500 hover:text-red-600 transition" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const KeyIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m-5a5 5 0 11-10 0 5 5 0 0110 0zM19 12a2 2 0 11-2-2m2 2h2m-2 0V9a2 2 0 00-2-2h-3" />
  </svg>
);

// ---- Dashboard-like Icons for Inspection List ----
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
    <div className="relative inline-block" ref={ref} style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white text-sm text-gray-700 w-full hover:border-green-400 transition"
      >
        <span className="flex-1 text-left whitespace-nowrap truncate">{value}</span>
        <ChevronDown />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded shadow-lg z-50 min-w-full">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
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
const CALENDAR_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const CALENDAR_WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

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
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 bg-white text-sm text-gray-700 hover:border-green-400 transition min-w-[130px]"
      >
        <span className="flex-1 text-left">{formatDisplay(value)}</span>
        <CalendarIcon />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-3 w-64">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronLeft />
            </button>
            <span className="text-sm font-semibold text-gray-800">{CALENDAR_MONTHS[month]} {year}</span>
            <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded transition">
              <ChevronRight />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {CALENDAR_WEEK_DAYS.map(d => (
              <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((day, idx) => (
              <div key={idx} className="flex items-center justify-center">
                {day ? (
                  <button
                    type="button"
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
              type="button"
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

// ---- Inspection constants & helpers ----
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

const CREATOR_TYPE_FILTER_OPTIONS = [
  "All User Types",
  "Supervisor",
  "Pre-Policy Broad Access",
  "Pre-Policy Limited Access",
  "Claims Broad Access",
  "Claims Limited Access",
];

const CREATOR_TYPE_LABEL_TO_CODE = {
  "Supervisor": "supervisor",
  "Pre-Policy Broad Access": "pre_policy_broad_access",
  "Pre-Policy Limited Access": "pre_policy_limited_access",
  "Claims Broad Access": "claims_broad_access",
  "Claims Limited Access": "claims_limited_access",
};

const damageColors = {
  "Major Damage": "bg-red-500",
  "Medium Damage": "bg-orange-500",
  "Minor Damage": "bg-yellow-500",
  "No Damage": "bg-green-500",
  "Damaged": "bg-red-500",
};

const TAB_TYPE_MAP = {
  pre: "vehicle",
  motor: "motor",
  wind: "windshield",
};

const renderReviewStatus = (status) => {
  if (status === true || status === "accepted") {
    return <span className="text-green-600 font-semibold text-xs bg-green-50 px-2 py-0.5 rounded border border-green-100 w-fit">Accepted</span>;
  }
  if (status === false || status === "rejected") {
    return <span className="text-red-600 font-semibold text-xs bg-red-50 px-2 py-0.5 rounded border border-red-100 w-fit">Rejected</span>;
  }
  if (status === "viewed") {
    return <span className="text-blue-600 font-semibold text-xs bg-blue-50 px-2 py-0.5 rounded border border-blue-100 w-fit">Viewed</span>;
  }
  if (status === "pending") {
    return <span className="text-amber-600 font-semibold text-xs bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">Pending</span>;
  }
  return <span className="text-gray-400 text-xs">—</span>;
};

const ACCESS_TYPES = [
  { key: "pre_policy_broad_access", label: "Pre-Policy Broad Access" },
  { key: "pre_policy_limited_access", label: "Pre-Policy Limited Access" },
  { key: "claims_broad_access", label: "Claims Broad Access" },
  { key: "claims_limited_access", label: "Claims Limited Access" },
];

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function UserAccessControl({ isAdminSubUsers = false }) {
  const currentUser = getUser();
  const isAdmin = currentUser?.is_staff === true && (currentUser?.type === "supervisor" || currentUser?.type === "supervisor_admin");
  const isSupervisorAdmin = currentUser?.is_staff === false && currentUser?.type === "supervisor_admin";
  const isSupervisorOnly = currentUser?.is_staff === false && currentUser?.type === "supervisor";
  const canViewAllSupervisors = (isAdmin || isSupervisorAdmin) && !isAdminSubUsers;

  // State
  const [supervisors, setSupervisors] = useState([]);
  const [formSupervisorType, setFormSupervisorType] = useState("supervisor");
  const [expandedSupervisorId, setExpandedSupervisorId] = useState(null);
  const [expandedSubuserId, setExpandedSubuserId] = useState(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [subUsers, setSubUsers] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingSubusersSummary, setLoadingSubusersSummary] = useState(false);

  const [userSummary, setUserSummary] = useState({
    total_links_sent: 0,
    total_clicks: 0,
    total_opens: 0,
    not_clicked: 0,
  });

  const [subusersSummary, setSubusersSummary] = useState({
    total_links_sent: 0,
    total_clicks: 0,
    total_opens: 0,
    not_clicked: 0,
  });

  const now = new Date();
  const [statsMonth, setStatsMonth] = useState(MONTH_ABBRS[now.getMonth()]);
  const [statsYear, setStatsYear] = useState(String(now.getFullYear()));

  // Inspection Listing States (for selected supervisor detail view)
  const [inspectionsActiveTab, setInspectionsActiveTab] = useState("pre");
  const [inspectionsSearch, setInspectionsSearch] = useState("");
  const [inspectionsDebouncedSearch, setInspectionsDebouncedSearch] = useState("");
  const [inspectionsDateFrom, setInspectionsDateFrom] = useState("");
  const [inspectionsDateTo, setInspectionsDateTo] = useState("");
  const [inspectionsStatusFilter, setInspectionsStatusFilter] = useState("All Status");
  const [inspectionsCorrectResultFilter, setInspectionsCorrectResultFilter] = useState("All Review Status");
  const [inspectionsCreatorTypeFilter, setInspectionsCreatorTypeFilter] = useState("All User Types");
  const [inspectionsSortBy, setInspectionsSortBy] = useState("Newest First");
  const [inspectionsCurrentPage, setInspectionsCurrentPage] = useState(1);
  const [inspectionsRows, setInspectionsRows] = useState([]);
  const [inspectionsTotalCount, setInspectionsTotalCount] = useState(0);
  const [inspectionsTotalPages, setInspectionsTotalPages] = useState(1);
  const [loadingInspections, setLoadingInspections] = useState(false);
  const [inspectionsError, setInspectionsError] = useState("");
  const [inspectionsDetailView, setInspectionsDetailView] = useState(null);
  const [lastViewedInspectionId, setLastViewedInspectionId] = useState(null);

  // Debounce effect for inspections search
  useEffect(() => {
    const timer = setTimeout(() => {
      setInspectionsDebouncedSearch(inspectionsSearch);
      setInspectionsCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [inspectionsSearch]);

  // Modals state
  const [showCreateSupervisorModal, setShowCreateSupervisorModal] = useState(false);
  const [showCreateSubUserModal, setShowCreateSubUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Active item state for edit/delete/password change
  const [userToEdit, setUserToEdit] = useState(null);
  const [isEditingSupervisor, setIsEditingSupervisor] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [changePasswordUser, setChangePasswordUser] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formType, setFormType] = useState("");
  const [formSupervisorId, setFormSupervisorId] = useState("");
  const [formChangePasswordEmail, setFormChangePasswordEmail] = useState("");
  const [formChangePasswordNewPassword, setFormChangePasswordNewPassword] = useState("");
  const [formChangePasswordConfirmPassword, setFormChangePasswordConfirmPassword] = useState("");

  // Fetch all supervisors and their sub-user lists to display total counts
  const fetchSupervisorsData = async (month = statsMonth, year = statsYear) => {
    setLoading(true);
    setError("");
    try {
      const data = await getSupervisorAccountsSummary({ month, year });
      const sups = Array.isArray(data) ? data : (data?.results ?? []);

      const mapped = sups.map(sup => ({
        ...sup,
        subUsersCount: sup.sub_users_count ?? 0,
      }));

      setSupervisors(mapped);
    } catch (err) {
      setError(err?.message || "Failed to load supervisors list.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSupervisorSummary = async (supervisorId, month, year) => {
    setLoadingSummary(true);
    
    // 1. Fetch Supervisor's own summary
    try {
      const data = await getAccountSummary({ user_id: supervisorId, month, year });
      if (data) {
        setUserSummary({
          total_links_sent: data.total_links_sent ?? 0,
          total_clicks: data.total_clicks ?? 0,
          total_opens: data.total_completed ?? 0,
          not_clicked: data.not_clicked ?? 0,
        });
      }
    } catch (err) {
      console.error("Failed to load supervisor summary", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchSubUsersData = async (supervisorId, month = statsMonth, year = statsYear) => {
    setLoading(true);
    setLoadingSubusersSummary(true);
    setError("");
    try {
      const data = await getSubUsersSummary(supervisorId, { month, year });
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setSubUsers(list);

      if (data && !Array.isArray(data)) {
        setSubusersSummary({
          total_links_sent: data.total_links_sent ?? 0,
          total_clicks: data.total_clicked ?? 0,
          total_opens: data.total_completed ?? 0,
          not_clicked: (data.total_links_sent ?? 0) - (data.total_clicked ?? 0),
        });
      } else {
        setSubusersSummary({
          total_links_sent: 0,
          total_clicks: 0,
          total_opens: 0,
          not_clicked: 0,
        });
      }
    } catch (err) {
      setError(err?.message || "Failed to load sub-users summary.");
    } finally {
      setLoading(false);
      setLoadingSubusersSummary(false);
    }
  };

  // Load supervisors or sub-users initially and when filters change
  useEffect(() => {
    if (canViewAllSupervisors && !selectedSupervisor) {
      fetchSupervisorsData(statsMonth, statsYear);
    } else if (selectedSupervisor) {
      fetchSubUsersData(selectedSupervisor.id, statsMonth, statsYear);
    } else if (isSupervisorOnly || isAdminSubUsers) {
      // Direct sub-users list for supervisor / admin
      setSelectedSupervisor(currentUser);
    }
  }, [selectedSupervisor, statsMonth, statsYear]);

  // Effect to load summary statistics when supervisor or filters change
  useEffect(() => {
    if (selectedSupervisor) {
      fetchSupervisorSummary(selectedSupervisor.id, statsMonth, statsYear);
    }
  }, [selectedSupervisor, statsMonth, statsYear]);

  // Fetch inspections for the selected supervisor
  const fetchSupervisorInspections = async () => {
    if (!selectedSupervisor?.id || !canViewAllSupervisors) return;

    setLoadingInspections(true);
    setInspectionsError("");

    const statusCode =
      inspectionsStatusFilter === "All Status" ? undefined : STATUS_LABEL_TO_CODE[inspectionsStatusFilter];
    const typeCode = TAB_TYPE_MAP[inspectionsActiveTab];
    const sortByParam = inspectionsSortBy === "Oldest First" ? "asc" : "des";
    const creatorTypeCode =
      inspectionsCreatorTypeFilter === "All User Types" ? undefined : CREATOR_TYPE_LABEL_TO_CODE[inspectionsCreatorTypeFilter];

    const query = {
      supervisor_id: selectedSupervisor.id,
      status: statusCode,
      name: inspectionsDebouncedSearch || undefined,
      type: typeCode,
      start_date: inspectionsDateFrom || undefined,
      end_date: inspectionsDateTo || undefined,
      sort_by: sortByParam,
      page: inspectionsCurrentPage,
      user_type: creatorTypeCode,
      ...(inspectionsCorrectResultFilter !== "All Review Status" && inspectionsCorrectResultFilter !== "All" ? { review_status: inspectionsCorrectResultFilter.toLowerCase() } : {}),
    };

    try {
      const data = await listInspections(query);
      const results = Array.isArray(data) ? data : (data?.results ?? []);
      const total = Array.isArray(data) ? results.length : (data?.count ?? results.length);
      const pages = Array.isArray(data) ? 1 : (data?.total_pages ?? 1);
      const current = Array.isArray(data) ? inspectionsCurrentPage : (data?.current_page ?? inspectionsCurrentPage);

      setInspectionsTotalCount(total);
      setInspectionsTotalPages(pages);
      if (current !== inspectionsCurrentPage) setInspectionsCurrentPage(current);

      const mapped = results.map((item, index) => {
        let dateStr = "";
        let timeStr = "";
        if (item.created_at) {
          try {
            const dt = new Date(item.created_at);
            dateStr = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            timeStr = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
          } catch (_) {}
        }

        let updatedAtStr = "—";
        if (item.updated_at) {
          try {
            const dt = new Date(item.updated_at);
            const d = dt.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
            const t = dt.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
            updatedAtStr = `${d} ${t}`;
          } catch (_) {}
        }

        return {
          id: item.id ?? index + 1,
          unique_verify_id: item.unique_verify_id ?? "",
          name: item.customer_name ?? "-",
          email: item.email ?? "",
          policy: item.policy_number ?? "",
          claim_number: item.claim_number ?? "",
          date: dateStr,
          time: timeStr,
          updatedAt: updatedAtStr,
          damage: item.damage_level ?? "",
          status: item.status ?? "",
          link: item.link ?? "",
          correctResult: item.review_status || item.correct_result,
          additionalNotes: item.additional_notes,
          location: item.location ?? "—",
          createdBy: item.created_by_name ?? "—",
          fakeImgDetection: item.fake_img_detection ?? false,
          serialNumber: item.serial_number ?? (index + 1),
        };
      });

      setInspectionsRows(mapped);
    } catch (err) {
      setInspectionsRows([]);
      setInspectionsError("Unable to load inspections. Please try again.");
    } finally {
      setLoadingInspections(false);
    }
  };

  useEffect(() => {
    fetchSupervisorInspections();
  }, [
    selectedSupervisor,
    inspectionsActiveTab,
    inspectionsStatusFilter,
    inspectionsDateFrom,
    inspectionsDateTo,
    inspectionsDebouncedSearch,
    inspectionsSortBy,
    inspectionsCurrentPage,
    inspectionsCorrectResultFilter,
    inspectionsCreatorTypeFilter,
  ]);

  const openOcrForInspectionRow = async (row) => {
    if (!row?.id) return;

    const rowIdStr = row.id.toString();
    setLastViewedInspectionId(rowIdStr);

    try {
      await markInspectionAsViewed(row.id);
    } catch (err) {
      console.error("Failed to mark inspection as viewed", err);
    }

    setInspectionsDetailView({
      row,
      ocrData: null,
      damageData: null,
      windshieldData: null,
      ocrLoading: true,
      ocrError: "",
      tab: inspectionsActiveTab,
    });

    try {
      const isWindshield = inspectionsActiveTab === "wind";
      const [ocrData, resultsData] = await Promise.allSettled([
        getInspectionOcr(row.id),
        isWindshield ? getWindshieldResults(row.id) : getDamageResults(row.id),
      ]);

      const ocr = ocrData.status === "fulfilled" ? ocrData.value : null;
      const results = resultsData.status === "fulfilled" ? resultsData.value : null;
      const ocrErr = ocrData.status === "rejected"
        ? (ocrData.reason?.data?.detail || ocrData.reason?.message || "Unable to load inspection details.")
        : "";

      setInspectionsDetailView((prev) => prev ? {
        ...prev,
        ocrData: ocr,
        damageData: isWindshield ? null : results,
        windshieldData: isWindshield ? results : null,
        ocrLoading: false,
        ocrError: ocrErr,
      } : null);
    } catch (err) {
      const msg = err?.data?.detail || err?.data?.error || err?.message || "Unable to load inspection details.";
      setInspectionsDetailView((prev) => prev ? { ...prev, ocrError: msg, ocrLoading: false } : null);
    }
  };

  const refreshCurrentView = () => {
    if (selectedSupervisor) {
      fetchSubUsersData(selectedSupervisor.id, statsMonth, statsYear);
      if (isAdmin) {
        fetchSupervisorsData(statsMonth, statsYear); // also keep main list updated
      }
    } else {
      fetchSupervisorsData(statsMonth, statsYear);
    }
  };

  const triggerAlert = (msg, isSuccess = true) => {
    if (isSuccess) {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setError(msg);
      setTimeout(() => setError(""), 5000);
    }
  };

  // --- Handlers ---
  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword) {
      triggerAlert("All fields are required.", false);
      return;
    }
    setError("");
    try {
      await registerSupervisor({
        name: formName,
        email: formEmail,
        password: formPassword,
        type: formSupervisorType,
      });
      triggerAlert("Supervisor created successfully!");
      setShowCreateSupervisorModal(false);
      resetForms();
      fetchSupervisorsData();
    } catch (err) {
      const msg = err?.data?.detail || err?.data?.error || err?.message || "Failed to create supervisor.";
      triggerAlert(msg, false);
    }
  };

  const handleCreateSubUser = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail || !formPassword || !formType) {
      triggerAlert("All fields are required.", false);
      return;
    }

    // Determine supervisor ID association
    const supervisorId = (isAdmin && !isAdminSubUsers) ? (formSupervisorId || selectedSupervisor?.id) : currentUser.id;
    if (!supervisorId) {
      triggerAlert("Please select a Supervisor.", false);
      return;
    }

    setError("");
    try {
      const payload = {
        name: formName,
        email: formEmail,
        password: formPassword,
        type: formType,
      };
      if (isAdmin && !isAdminSubUsers) {
        payload.supervisor = parseInt(supervisorId, 10);
      }
      await createSubUser(payload);
      triggerAlert("Sub-user created successfully!");
      setShowCreateSubUserModal(false);
      resetForms();
      refreshCurrentView();
    } catch (err) {
      const msg = err?.data?.detail || err?.data?.error || err?.message || "Failed to create sub-user.";
      triggerAlert(msg, false);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!formName || !formEmail) {
      triggerAlert("Name and Email are required.", false);
      return;
    }
    setError("");
    try {
      const payload = {
        name: formName,
        email: formEmail,
      };
      // Type is only editable for sub-users
      if (isEditingSupervisor) {
        payload.type = userToEdit.type || "supervisor";
      } else {
        payload.type = formType;
      }
      await updateUser(userToEdit.id, payload);
      triggerAlert("User details updated successfully!");
      setShowEditModal(false);
      resetForms();
      refreshCurrentView();
    } catch (err) {
      const msg = err?.data?.detail || err?.data?.error || err?.message || "Failed to update user.";
      triggerAlert(msg, false);
    }
  };

  const handleDeleteConfirm = async () => {
    setError("");
    try {
      await deleteUser(userToDelete.id);
      triggerAlert("User deleted successfully!");
      setShowDeleteModal(false);
      setUserToDelete(null);
      // If we deleted the supervisor we were viewing, go back
      if (selectedSupervisor && selectedSupervisor.id === userToDelete.id) {
        setSelectedSupervisor(null);
        fetchSupervisorsData();
      } else {
        refreshCurrentView();
      }
    } catch (err) {
      const msg = err?.data?.detail || err?.data?.error || err?.message || "Failed to delete user.";
      triggerAlert(msg, false);
    }
  };

  const openEditModal = (user, isSupervisor = false) => {
    const isSup = isSupervisor || user.type === "supervisor" || user.type === "supervisor_admin";
    setUserToEdit(user);
    setIsEditingSupervisor(isSup);
    setFormName(user.name || "");
    setFormEmail(user.email || "");
    setFormType(user.type || "");
    setFormSupervisorType(user.type || "supervisor");
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const openChangePasswordModal = (user) => {
    setChangePasswordUser(user);
    setFormChangePasswordEmail(user.email || "");
    setFormChangePasswordNewPassword("");
    setFormChangePasswordConfirmPassword("");
    setShowChangePasswordModal(true);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!formChangePasswordEmail || !formChangePasswordNewPassword || !formChangePasswordConfirmPassword) {
      triggerAlert("All fields are required.", false);
      return;
    }
    if (formChangePasswordNewPassword !== formChangePasswordConfirmPassword) {
      triggerAlert("Passwords do not match.", false);
      return;
    }
    setError("");
    try {
      await changePassword({
        email: formChangePasswordEmail,
        new_password: formChangePasswordNewPassword,
        confirm_password: formChangePasswordConfirmPassword,
      });
      triggerAlert("Password changed successfully!");
      setShowChangePasswordModal(false);
      resetForms();
    } catch (err) {
      const msg = err?.data?.detail || err?.data?.error || err?.message || "Failed to change password.";
      triggerAlert(msg, false);
    }
  };

  const resetForms = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormType("");
    setFormSupervisorType("supervisor");
    setFormSupervisorId("");
    setUserToEdit(null);
    setIsEditingSupervisor(false);
    setFormChangePasswordEmail("");
    setFormChangePasswordNewPassword("");
    setFormChangePasswordConfirmPassword("");
    setChangePasswordUser(null);
  };

  // Helper mapping for roles
  const getRoleLabel = (userOrType) => {
    if (!userOrType) return "";
    if (typeof userOrType === "string") {
      const type = userOrType;
      if (type === "supervisor") return "Supervisor";
      if (type === "supervisor_admin") return "Supervisor Admin";
      const found = ACCESS_TYPES.find((t) => t.key === type);
      return found ? found.label : type;
    }

    const user = userOrType;
    if (user.type === "supervisor_admin") {
      if (user.is_staff === true) {
        return "Admin";
      } else {
        return "Supervisor Admin";
      }
    }
    if (user.type === "supervisor") return "Supervisor";
    const found = ACCESS_TYPES.find((t) => t.key === user.type);
    return found ? found.label : user.type;
  };

  // Summary Metrics
  const totalSupervisorsCount = supervisors.length;
  const totalSubUsersCount = supervisors.reduce((acc, curr) => acc + (curr.subUsersCount || 0), 0);
  const totalLinksSent = supervisors.reduce((acc, curr) => acc + (curr.total_links_sent ?? 0), 0);
  const totalClicked = supervisors.reduce((acc, curr) => acc + (curr.total_clicked ?? 0), 0);
  const totalCompleted = supervisors.reduce((acc, curr) => acc + (curr.total_completed ?? 0), 0);
  const totalPending = supervisors.reduce((acc, curr) => acc + (curr.pending ?? 0), 0);

  if (inspectionsDetailView) {
    if (inspectionsDetailView.tab === "wind") {
      return (
        <WindShieldAssessmentResult
          inspectionRow={inspectionsDetailView.row}
          ocrData={inspectionsDetailView.ocrData}
          windshieldData={inspectionsDetailView.windshieldData}
          ocrLoading={inspectionsDetailView.ocrLoading}
          ocrError={inspectionsDetailView.ocrError}
          onBack={() => setInspectionsDetailView(null)}
          onRefresh={() => openOcrForInspectionRow(inspectionsDetailView.row)}
          hideEditStatus={true}
        />
      );
    }
    return (
      <PrePolicyAssessmentResult
        inspectionRow={inspectionsDetailView.row}
        ocrData={inspectionsDetailView.ocrData}
        damageData={inspectionsDetailView.damageData}
        ocrLoading={inspectionsDetailView.ocrLoading}
        ocrError={inspectionsDetailView.ocrError}
        onBack={() => setInspectionsDetailView(null)}
        onRefresh={() => openOcrForInspectionRow(inspectionsDetailView.row)}
        hideEditStatus={true}
      />
    );
  }

  return (
    <div className="min-h-[600px] font-sans text-sm">

      {/* Floating Toast Notification Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {successMsg && (
          <div className="pointer-events-auto bg-white border border-green-100 shadow-xl rounded-xl p-4 flex items-start gap-3 animate-toast-in border-l-4 border-l-green-500">
            <div className="text-green-500 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Success</p>
              <p className="text-xs text-gray-500 mt-0.5">{successMsg}</p>
            </div>
            <button 
              onClick={() => setSuccessMsg("")} 
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {error && (
          <div className="pointer-events-auto bg-white border border-red-100 shadow-xl rounded-xl p-4 flex items-start gap-3 animate-toast-in border-l-4 border-l-red-500">
            <div className="text-red-500 mt-0.5">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-800">Error</p>
              <p className="text-xs text-gray-500 mt-0.5">{error}</p>
            </div>
            <button 
              onClick={() => setError("")} 
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* --- METRICS / COUNTS CARDS (Admin Main Page Only) --- */}
      {canViewAllSupervisors && !selectedSupervisor && (
        <div className="space-y-6 mb-6">
          {/* Row 1: System Directory Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
              <p className="text-xs text-gray-500 font-medium mb-1.5">Total Supervisors</p>
              <p className="text-3xl font-light text-gray-500">
                {loading ? "…" : totalSupervisorsCount}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
              <p className="text-xs text-gray-500 font-medium mb-1.5">Total Sub-users</p>
              <p className="text-3xl font-light text-gray-500">
                {loading ? "…" : totalSubUsersCount}
              </p>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
              <p className="text-xs text-gray-500 font-medium mb-1.5">Logged In Profile</p>
              <p className="text-base font-semibold text-gray-700 truncate">{currentUser?.name || "Admin"}</p>
              <p className="text-xs text-gray-400 truncate mt-0.5">{currentUser?.email}</p>
            </div>
          </div>

          {/* Row 2: Combined Activity Summary */}
          <div>
            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
              Combined Activity (Sum of All Supervisors)
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Links Sent</p>
                <p className="text-3xl font-light text-gray-500">
                  {loading ? "…" : totalLinksSent}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Clicked</p>
                <p className="text-3xl font-light text-gray-500">
                  {loading ? "…" : totalClicked}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Completed</p>
                <p className="text-3xl font-light text-gray-500">
                  {loading ? "…" : totalCompleted}
                </p>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Pending</p>
                <p className="text-3xl font-light text-gray-500">
                  {loading ? "…" : totalPending}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- LOADING SPINNER FOR MAIN VIEWS --- */}
      {loading && (supervisors.length === 0 && subUsers.length === 0) ? (
        <div className="bg-white rounded border border-gray-200 p-20 flex flex-col items-center justify-center text-gray-400">
          <svg className="animate-spin h-8 w-8 text-green-500 mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-sm font-medium">Loading user management details...</span>
        </div>
      ) : (
        <>
          {/* VIEW 1: Supervisors Table List (Admin Only) */}
          {canViewAllSupervisors && !selectedSupervisor && (
            <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
              {/* Header Bar */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                  <span className="font-semibold text-gray-800 text-sm">Supervisors Directory</span>
                  {/* Period Filter Dropdowns for Stats */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-500">Month</span>
                    <select
                      value={statsMonth}
                      onChange={(e) => setStatsMonth(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
                    >
                      {MONTH_ABBRS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>

                    <span className="text-xs font-medium text-gray-500 ml-1.5">Year</span>
                    <select
                      value={statsYear}
                      onChange={(e) => setStatsYear(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
                    >
                      {["2024", "2025", "2026", "2027", "2028"].map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          resetForms();
                          setShowCreateSupervisorModal(true);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded text-xs transition"
                      >
                        Add Supervisor
                      </button>
                    </>
                  )}
                </div>
              </div>

              {supervisors.length === 0 ? (
                <div className="text-center py-16 text-gray-400 bg-white">
                  <p className="text-base font-semibold">No Supervisors Available</p>
                  <p className="text-xs mt-1">Register a new supervisor to begin structuring your user access hierarchy.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50">
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">Sr No</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Supervisor Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Email Address</th>
                        {!isAdmin && <th className="px-4 py-3 text-left font-semibold text-gray-700">Role Type</th>}
                        <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Total Sub-users</th>
                        <th className="px-4 py-3 text-right font-semibold text-gray-700 pr-6">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {supervisors.map((sup, index) => (
                        <Fragment key={sup.id}>
                          <tr className="border-b border-gray-100 bg-white hover:bg-gray-50/50 transition">
                            <td className="px-4 py-3 text-gray-500">{sup.serial_number ?? (index + 1)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-800">{sup.name}</td>
                            <td className="px-4 py-3 text-gray-500">{sup.email}</td>
                            {!isAdmin && (
                              <td className="px-4 py-3 text-gray-600">
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-50 text-green-700 border border-green-100">
                                  {getRoleLabel(sup)}
                                </span>
                              </td>
                            )}
                            <td className="px-4 py-3">
                              <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                                {sup.subUsersCount ?? 0}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right pr-6">
                              <div className="flex items-center justify-end gap-3.5">
                                <button
                                  onClick={() => {
                                    setSelectedSupervisor(sup);
                                    fetchSubUsersData(sup.id);
                                  }}
                                  className="text-xs text-green-600 hover:text-green-700 font-semibold transition"
                                >
                                  View Sub-Users
                                </button>
                                <button
                                  onClick={() => setExpandedSupervisorId(expandedSupervisorId === sup.id ? null : sup.id)}
                                  className="text-xs text-blue-600 hover:text-blue-750 font-semibold transition flex items-center gap-1"
                                  title="View Stats"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                  </svg>
                                  Stats
                                </button>
                                {isAdmin && (
                                  <>
                                    <button
                                      onClick={() => openChangePasswordModal(sup)}
                                      title="Change Password"
                                      className="text-xs text-green-600 hover:text-green-750 font-semibold transition flex items-center gap-1"
                                    >
                                      <KeyIcon />
                                      Change Password
                                    </button>
                                    <button
                                      onClick={() => openEditModal(sup, true)}
                                      title="Edit Supervisor"
                                      className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-green-600 transition"
                                    >
                                      <EditIcon />
                                    </button>
                                    <button
                                      onClick={() => openDeleteModal(sup)}
                                      title="Delete Supervisor"
                                      className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition"
                                    >
                                      <DeleteIcon />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedSupervisorId === sup.id && (
                            <tr className="bg-gray-50/50">
                              <td colSpan={isAdmin ? 5 : 6} className="px-6 py-4 border-b border-gray-200">
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                  <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Total Sent</span>
                                    <span className="text-lg font-bold text-gray-750">{sup.total_links_sent ?? 0}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Clicked</span>
                                    <span className="text-lg font-bold text-gray-750">{sup.total_clicked ?? 0}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Completed</span>
                                    <span className="text-lg font-bold text-gray-750">{sup.total_completed ?? 0}</span>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs col-span-1">
                                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Status Ratio</span>
                                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                      <div>Pending: <span className="font-semibold text-gray-700">{sup.pending ?? 0}</span></div>
                                      <div>Processing: <span className="font-semibold text-gray-700">{sup.processing ?? 0}</span></div>
                                      <div>Received: <span className="font-semibold text-gray-700">{sup.received ?? 0}</span></div>
                                      <div>Expired: <span className="font-semibold text-gray-700">{sup.expired ?? 0}</span></div>
                                    </div>
                                  </div>
                                  <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs col-span-1">
                                    <span className="block text-[10px] text-gray-400 font-semibold uppercase">Review Results</span>
                                    <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                      <div>Accepted: <span className="font-semibold text-green-600">{sup.accepted ?? 0}</span></div>
                                      <div>Rejected: <span className="font-semibold text-red-600">{sup.rejected ?? 0}</span></div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {selectedSupervisor && (
            <div>
              {canViewAllSupervisors && (
                <div className="mb-5">
                  <button
                    onClick={() => {
                      setSelectedSupervisor(null);
                      fetchSupervisorsData();
                    }}
                    className="flex items-center gap-1.5 bg-white border border-gray-300 hover:border-green-400 text-gray-700 hover:text-green-600 font-semibold text-xs px-3.5 py-2 rounded shadow-xs transition"
                  >
                    <ArrowLeftIcon />
                    Back to directory
                  </button>
                </div>
              )}

              {/* --- DUAL ROW TRANSACTION GRIDS FOR ADMIN --- */}
              {/* 1. Supervisor's Own Transactions */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Overall Summary for : {selectedSupervisor.name}
                  </h3>
                  {/* Period Filter Dropdowns for Stats */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-gray-500">Month</span>
                    <select
                      value={statsMonth}
                      onChange={(e) => setStatsMonth(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
                    >
                      {MONTH_ABBRS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>

                    <span className="text-xs font-medium text-gray-500 ml-1.5">Year</span>
                    <select
                      value={statsYear}
                      onChange={(e) => setStatsYear(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-xs text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-green-500 cursor-pointer"
                    >
                      {["2024", "2025", "2026", "2027", "2028"].map((y) => (
                        <option key={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Link Sent", value: userSummary.total_links_sent },
                    { label: "Clicks", value: userSummary.total_clicks },
                    { label: "Total Completed", value: userSummary.total_opens },
                    { label: "Not Clicked", value: userSummary.not_clicked },
                  ].map((card) => (
                    <div key={card.label} className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
                      <p className="text-xs text-gray-400 font-medium mb-1">{card.label}</p>
                      <p className="text-3xl font-light text-gray-600">
                        {loadingSummary ? "…" : card.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 2. Sub-users Aggregated Transactions (Only show when there are sub-users under this supervisor) */}
              <div className="mb-6">
                <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-3">
                  Associated Sub-users' Combined Transactions
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Link Sent", value: subusersSummary.total_links_sent },
                    { label: "Clicks", value: subusersSummary.total_clicks },
                    { label: "Total Completed", value: subusersSummary.total_opens },
                    { label: "Not Clicked", value: subusersSummary.not_clicked },
                  ].map((card) => (
                    <div key={card.label} className="bg-white rounded-xl p-5 shadow-xs border border-gray-150">
                      <p className="text-xs text-gray-400 font-medium mb-1">{card.label}</p>
                      <p className="text-3xl font-light text-gray-600">
                        {loadingSubusersSummary ? "…" : card.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sub-users Listing Card */}
              <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden mt-6">
                <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    {canViewAllSupervisors && (
                      <button
                        onClick={() => {
                          setSelectedSupervisor(null);
                          fetchSupervisorsData();
                        }}
                        className="flex items-center gap-1.5 text-gray-500 hover:text-green-600 font-medium text-xs transition"
                      >
                        <ArrowLeftIcon />
                        Back to directory
                      </button>
                    )}
                    <span className="font-semibold text-gray-800 text-sm hidden sm:inline">|</span>
                    <span className="font-semibold text-gray-800 text-sm">
                      {isAdminSubUsers ? "Admin Sub-users List" : isSupervisorOnly ? "My Sub-users List" : `Sub-users of ${selectedSupervisor.name}`}
                    </span>
                  </div>

                  {!isSupervisorAdmin && (
                    <button
                      onClick={() => {
                        resetForms();
                        setFormSupervisorId(String(selectedSupervisor.id));
                        setShowCreateSubUserModal(true);
                      }}
                      className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded text-xs transition"
                    >
                      Add Sub-user
                    </button>
                  )}
                </div>

                {subUsers.length === 0 ? (
                  <div className="text-center py-16 text-gray-400 bg-white">
                    <p className="text-base font-semibold">No Sub-users Found</p>
                    <p className="text-xs mt-1">There are no sub-users registered under this supervisor.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50">
                          <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">Sr No</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Sub-user Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Email Address</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Access Role Type</th>
                          <th className="px-4 py-3 text-right font-semibold text-gray-700 pr-6">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subUsers.map((user, index) => (
                          <Fragment key={user.id}>
                            <tr className="border-b border-gray-100 bg-white hover:bg-gray-50/50 transition">
                              <td className="px-4 py-3 text-gray-500">{user.serial_number ?? (index + 1)}</td>
                              <td className="px-4 py-3 font-semibold text-gray-800">{user.name}</td>
                              <td className="px-4 py-3 text-gray-500">{user.email}</td>
                              <td className="px-4 py-3 text-gray-600">
                                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-50 text-green-700 border border-green-100">
                                  {getRoleLabel(user)}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right pr-6">
                                <div className="flex items-center justify-end gap-3.5">
                                  <button
                                    onClick={() => setExpandedSubuserId(expandedSubuserId === user.id ? null : user.id)}
                                    className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition flex items-center gap-1 text-xs font-semibold"
                                    title="View Stats"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
                                    </svg>
                                    Stats
                                  </button>
                                  {isAdmin && (
                                    <button
                                      onClick={() => openChangePasswordModal(user)}
                                      className="text-xs text-green-600 hover:text-green-750 font-semibold transition flex items-center gap-1"
                                      title="Change Password"
                                    >
                                      <KeyIcon />
                                      Change Password
                                    </button>
                                  )}
                                  {!isSupervisorAdmin && (
                                    <>
                                      <button
                                        onClick={() => openEditModal(user, false)}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-green-600 transition"
                                        title="Edit Sub-user"
                                      >
                                        <EditIcon />
                                      </button>
                                      <button
                                        onClick={() => openDeleteModal(user)}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-red-600 transition"
                                        title="Delete Sub-user"
                                      >
                                        <DeleteIcon />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                            {expandedSubuserId === user.id && (
                              <tr className="bg-gray-50/50">
                                <td colSpan={5} className="px-6 py-4 border-b border-gray-200">
                                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                    <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">Total Sent</span>
                                      <span className="text-lg font-bold text-gray-755">{user.total_links_sent ?? 0}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">Clicked</span>
                                      <span className="text-lg font-bold text-gray-755">{user.total_clicked ?? 0}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs">
                                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">Completed</span>
                                      <span className="text-lg font-bold text-gray-755">{user.total_completed ?? 0}</span>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs col-span-1">
                                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">Status Ratio</span>
                                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                        <div>Pending: <span className="font-semibold text-gray-700">{user.pending ?? 0}</span></div>
                                        <div>Processing: <span className="font-semibold text-gray-700">{user.processing ?? 0}</span></div>
                                        <div>Received: <span className="font-semibold text-gray-700">{user.received ?? 0}</span></div>
                                      </div>
                                    </div>
                                    <div className="bg-white p-3 rounded-lg border border-gray-150 shadow-2xs col-span-1">
                                      <span className="block text-[10px] text-gray-400 font-semibold uppercase">Review Results</span>
                                      <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                                        <div>Accepted: <span className="font-semibold text-green-600">{user.accepted ?? 0}</span></div>
                                        <div>Rejected: <span className="font-semibold text-red-600">{user.rejected ?? 0}</span></div>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* --- Supervisor Inspections Listing Section --- */}
              {canViewAllSupervisors && (
                <div className="mt-8 animate-fade-in">
                  <div className="border-t border-gray-250 my-6"></div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Inspections Created by {selectedSupervisor.name} and Sub-users
                    </h3>
                  </div>

                  {/* Tabs */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {[
                        { key: "pre", label: "Pre Inspection", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" },
                        { key: "motor", label: "Motor Claim", d: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" },
                        { key: "wind", label: "Wind Shield Claim", d: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
                      ].map(tab => (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => {
                            setInspectionsActiveTab(tab.key);
                            setInspectionsCurrentPage(1);
                          }}
                          className={`flex items-center gap-2 px-5 py-2.5 rounded text-sm font-medium border transition flex-shrink-0
                            ${inspectionsActiveTab === tab.key
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
                  </div>

                  {/* Filter Bar and Table Card */}
                  <div className="bg-white rounded border border-gray-200 shadow-sm overflow-hidden">
                    
                    {/* Filter controls */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-100 flex-wrap">
                      {/* Search */}
                      <div className="flex items-center gap-2 border border-gray-300 rounded px-3 py-2 w-full sm:w-auto sm:min-w-[220px] flex-1">
                        <SearchIcon />
                        <input
                          type="text"
                          placeholder="Search by name, email,..."
                          value={inspectionsSearch}
                          onChange={(e) => setInspectionsSearch(e.target.value)}
                          className="outline-none text-sm text-gray-600 placeholder-gray-400 w-full"
                        />
                      </div>

                      {/* From Date */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700">From</span>
                        <DatePicker
                          value={inspectionsDateFrom}
                          onChange={(val) => { setInspectionsDateFrom(val); setInspectionsCurrentPage(1); }}
                        />
                      </div>

                      {/* To Date */}
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-gray-700">To</span>
                        <DatePicker
                          value={inspectionsDateTo}
                          onChange={(val) => { setInspectionsDateTo(val); setInspectionsCurrentPage(1); }}
                        />
                      </div>

                      {/* Status */}
                      <SelectDropdown
                        value={inspectionsStatusFilter}
                        onChange={(val) => { setInspectionsStatusFilter(val); setInspectionsCurrentPage(1); }}
                        options={STATUS_FILTER_OPTIONS}
                        minWidth="130px"
                      />

                      {/* Review Status */}
                      <SelectDropdown
                        value={inspectionsCorrectResultFilter}
                        onChange={(val) => { setInspectionsCorrectResultFilter(val); setInspectionsCurrentPage(1); }}
                        options={["All Review Status", "Pending", "Viewed", "Accepted", "Rejected"]}
                        minWidth="150px"
                      />

                      {/* Creator User Type */}
                      <SelectDropdown
                        value={inspectionsCreatorTypeFilter}
                        onChange={(val) => { setInspectionsCreatorTypeFilter(val); setInspectionsCurrentPage(1); }}
                        options={CREATOR_TYPE_FILTER_OPTIONS}
                        minWidth="170px"
                      />

                      {/* Sort By */}
                      <div className="flex items-center gap-2 sm:ml-auto text-sm">
                        <span className="font-medium text-gray-700 whitespace-nowrap">Sort By</span>
                        <SelectDropdown
                          value={inspectionsSortBy}
                          onChange={(val) => { setInspectionsSortBy(val); setInspectionsCurrentPage(1); }}
                          options={["Newest First", "Oldest First"]}
                          minWidth="150px"
                        />
                      </div>
                    </div>

                    {/* Total Count */}
                    <div className="flex items-center justify-end px-4 py-2 border-b border-gray-100 bg-gray-50/50">
                      <div className="text-xs text-gray-500 font-semibold">
                        Total Inspections: <span className="text-gray-800 font-bold">{inspectionsTotalCount}</span>
                      </div>
                    </div>

                    {/* Table / Loading / Empty */}
                    {loadingInspections ? (
                      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <svg className="animate-spin h-8 w-8 text-green-500 mb-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-sm font-medium">Loading inspections list...</span>
                      </div>
                    ) : inspectionsError ? (
                      <div className="text-center py-16 text-red-500 font-medium bg-white">
                        {inspectionsError}
                      </div>
                    ) : inspectionsRows.length === 0 ? (
                      <div className="text-center py-16 text-gray-400 bg-white">
                        <p className="text-base font-semibold">No Inspections Found</p>
                        <p className="text-xs mt-1">Adjust the filters or date ranges to search for inspections.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-200 bg-gray-50">
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-12">Sr No</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Customer Name</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Email Address</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Policy Number</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Created By</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Date</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Updated At</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700 w-32">Damage Level</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                              <th className="px-4 py-3 text-left font-semibold text-gray-700">Review Status</th>
                              <th className="px-4 py-3 text-right font-semibold text-gray-700 pr-6">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {inspectionsRows.map((row) => {
                              const isLastViewed = lastViewedInspectionId === row.id?.toString();
                              return (
                                <tr
                                  key={row.id}
                                  className={`border-b border-gray-100 transition ${isLastViewed ? 'bg-blue-50/80 hover:bg-blue-50' : 'bg-white hover:bg-gray-50'}`}
                                >
                                  <td className="px-4 py-3 text-gray-500">{row.serialNumber}</td>
                                  <td className="px-4 py-3 font-semibold text-gray-800">{row.name}</td>
                                  <td className="px-4 py-3 text-gray-500 truncate max-w-[150px]" title={row.email}>{row.email}</td>
                                  <td className="px-4 py-3 text-gray-600">{row.policy}</td>
                                  <td className="px-4 py-3 text-gray-700 font-medium">{row.createdBy}</td>
                                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.date}</td>
                                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{row.time}</td>
                                  <td className="px-4 py-3 text-gray-600">
                                    {row.updatedAt && row.updatedAt !== "—" ? (
                                      <div className="flex flex-col text-xs">
                                        <span className="font-medium whitespace-nowrap">{row.updatedAt.split(" ").slice(0, 3).join(" ")}</span>
                                        <span className="text-gray-400 mt-0.5 whitespace-nowrap">{row.updatedAt.split(" ").slice(3).join(" ")}</span>
                                      </div>
                                    ) : (
                                      <span>—</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {row.damage ? (
                                      <span className={`${damageColors[row.damage] || "bg-gray-400"} text-white text-xs font-semibold px-2 py-0.5 rounded`}>
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
                                          <span className="bg-gray-400 text-white text-xs font-semibold px-2 py-0.5 rounded">
                                            {row.status || "Unknown"}
                                          </span>
                                        );
                                      }
                                      return (
                                        <span className={`${meta.color} text-white text-xs font-semibold px-2 py-0.5 rounded`}>
                                          {meta.label}
                                        </span>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-4 py-3">
                                    <div className="flex flex-col gap-1">
                                      {renderReviewStatus(row.correctResult)}
                                      {row.additionalNotes && (
                                        <span className="text-gray-400 text-xs max-w-[120px] truncate" title={row.additionalNotes}>
                                          {row.additionalNotes}
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 text-right pr-6">
                                    <div className="flex items-center justify-end gap-2">
                                      {row.status === "expired" ? (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            try {
                                              const resp = await regenerateInspectionLink({ unique_id: row.unique_verify_id });
                                              setInspectionsRows(prev => prev.map(r => r.unique_verify_id === row.unique_verify_id ? {
                                                ...r,
                                                link: resp?.link || resp?.data?.link || r.link,
                                                status: resp?.status || resp?.data?.status || "pending",
                                              } : r));
                                            } catch (err) {
                                              alert(err?.data?.detail || err?.message || "Failed to regenerate link");
                                            }
                                          }}
                                          className="text-xs bg-green-500 hover:bg-green-600 text-white font-semibold px-2 py-1 rounded transition"
                                        >
                                          Regenerate
                                        </button>
                                      ) : row.link ? (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => { navigator.clipboard.writeText(row.link); alert("Link copied!"); }}
                                            className="p-1 hover:bg-gray-100 rounded text-gray-450 hover:text-green-600 transition"
                                            title="Copy Link"
                                          >
                                            <CopyIcon />
                                          </button>
                                        </>
                                      ) : null}
                                      <button
                                        type="button"
                                        onClick={() => openOcrForInspectionRow(row)}
                                        className="p-1 hover:bg-gray-100 rounded text-gray-450 hover:text-green-600 transition"
                                        title="View Detailed Results"
                                      >
                                        <EyeIcon />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
                      <span className="text-xs text-gray-500">
                        {loadingInspections
                          ? "Loading..."
                          : inspectionsTotalCount
                            ? `Showing ${(inspectionsCurrentPage - 1) * inspectionsRows.length + 1}–${(inspectionsCurrentPage - 1) * inspectionsRows.length + inspectionsRows.length} of ${inspectionsTotalCount}`
                            : "No inspections found"}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInspectionsCurrentPage((p) => Math.max(1, p - 1))}
                          disabled={inspectionsCurrentPage <= 1}
                          className="px-2.5 py-1 bg-white border border-gray-300 rounded text-xs text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-semibold transition"
                        >
                          Prev
                        </button>
                        <span className="text-xs text-gray-600 font-medium">
                          Page {inspectionsCurrentPage} of {inspectionsTotalPages}
                        </span>
                        <button
                          type="button"
                          onClick={() => setInspectionsCurrentPage((p) => Math.min(inspectionsTotalPages, p + 1))}
                          disabled={inspectionsCurrentPage >= inspectionsTotalPages}
                          className="px-2.5 py-1 bg-white border border-gray-300 rounded text-xs text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 font-semibold transition"
                        >
                          Next
                        </button>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ======================================================== */}
      {/* ── MODALS ────────────────────────────────────────────── */}
      {/* ======================================================== */}

      {/* Modal 1: Create Supervisor */}
      {showCreateSupervisorModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Register New Supervisor</h2>
              <button
                type="button"
                onClick={() => setShowCreateSupervisorModal(false)}
                className="text-gray-400 hover:text-gray-600 transition text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSupervisor}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Supervisor Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John Doe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="supervisor@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>


              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSupervisorModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-semibold transition"
                >
                  Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Create Sub User */}
      {showCreateSubUserModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Add Sub-user Account</h2>
              <button
                type="button"
                onClick={() => setShowCreateSubUserModal(false)}
                className="text-gray-400 hover:text-gray-600 transition text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleCreateSubUser}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">User Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Jane Doe"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="subuser@example.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Access Role Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white cursor-pointer transition"
                    required
                  >
                    <option value="">-- Choose Access Role --</option>
                    {ACCESS_TYPES.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Admin needs to specify supervisor. If we already clicked into a supervisor, pre-fill it. */}
                {isAdmin && !selectedSupervisor && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Assign Supervisor</label>
                    <select
                      value={formSupervisorId}
                      onChange={(e) => setFormSupervisorId(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white cursor-pointer transition"
                      required
                    >
                      <option value="">-- Choose Supervisor --</option>
                      {supervisors.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.email})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSubUserModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-semibold transition"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Edit User Details */}
      {showEditModal && userToEdit && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Edit User Details</h2>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 transition text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleEditUser}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">User Name</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                {/* Only show access role type if the user is a subuser */}
                {!isEditingSupervisor && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Access Role Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white cursor-pointer transition"
                      required
                    >
                      <option value="">-- Choose Access Role --</option>
                      {ACCESS_TYPES.map((t) => (
                        <option key={t.key} value={t.key}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-semibold transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 4: Delete User Confirmation */}
      {showDeleteModal && userToDelete && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-red-50 text-red-700 border-b border-red-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Confirm Deletion</h2>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="text-red-500 hover:text-red-700 transition text-lg"
              >
                &times;
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">
                Are you sure you want to permanently delete the following user profile?
              </p>
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded text-sm">
                <span className="block font-bold text-gray-800">{userToDelete.name}</span>
                <span className="block text-xs text-gray-500 mt-0.5">{userToDelete.email}</span>
                <span className="block text-xs text-gray-500 font-semibold mt-1">Role: {getRoleLabel(userToDelete)}</span>
              </div>
              <p className="text-xs text-red-600 font-medium mt-4">
                This action is irreversible and will revoke all access privileges.
              </p>
              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteConfirm}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold transition"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Change Password */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg border border-gray-100 w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-800">Change User Password</h2>
              <button
                type="button"
                onClick={() => {
                  setShowChangePasswordModal(false);
                  setChangePasswordUser(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition text-lg"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={formChangePasswordEmail}
                    onChange={(e) => setFormChangePasswordEmail(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition bg-gray-50 cursor-not-allowed"
                    required
                    readOnly
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formChangePasswordNewPassword}
                    onChange={(e) => setFormChangePasswordNewPassword(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={formChangePasswordConfirmPassword}
                    onChange={(e) => setFormChangePasswordConfirmPassword(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePasswordModal(false);
                    setChangePasswordUser(null);
                  }}
                  className="flex-1 md:flex-initial px-6 py-2.5 border border-gray-300 text-gray-700 rounded hover:bg-gray-100 text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 md:flex-initial px-8 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded text-xs font-bold transition shadow-sm"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
