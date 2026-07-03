import { useState, useEffect, useRef, Fragment } from "react";
import {
  listSupervisors,
  listSubUsers,
  createSubUser,
  updateUser,
  deleteUser,
  registerSupervisor,
  getAccountSummary,
  getSupervisorAccountsSummary,
  getSubUsersSummary,
} from "../api";
import { getUser } from "../utils/auth";

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

const ACCESS_TYPES = [
  { key: "pre_policy_broad_access", label: "Pre-Policy Broad Access" },
  { key: "pre_policy_limited_access", label: "Pre-Policy Limited Access" },
  { key: "claims_broad_access", label: "Claims Broad Access" },
  { key: "claims_limited_access", label: "Claims Limited Access" },
];

const MONTH_ABBRS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function UserAccessControl() {
  const currentUser = getUser();
  const isAdmin = currentUser?.is_staff === true && (currentUser?.type === "supervisor" || currentUser?.type === "supervisor_admin");
  const isSupervisorAdmin = currentUser?.is_staff === false && currentUser?.type === "supervisor_admin";
  const isSupervisorOnly = currentUser?.is_staff === false && currentUser?.type === "supervisor";
  const canViewAllSupervisors = isAdmin || isSupervisorAdmin;

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

  // Modals state
  const [showCreateSupervisorModal, setShowCreateSupervisorModal] = useState(false);
  const [showCreateSubUserModal, setShowCreateSubUserModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Active item state for edit/delete
  const [userToEdit, setUserToEdit] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formType, setFormType] = useState("pre_policy_broad_access");
  const [formSupervisorId, setFormSupervisorId] = useState("");

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

  const fetchSupervisorSummary = async (supervisorId, month, year, currentSubUsersList = []) => {
    setLoadingSummary(true);
    setLoadingSubusersSummary(true);
    
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

    // 2. Aggregate sub-users summary from currentSubUsersList stats directly
    try {
      const aggregated = currentSubUsersList.reduce(
        (acc, curr) => ({
          total_links_sent: acc.total_links_sent + (curr.total_links_sent ?? 0),
          total_clicks: acc.total_clicks + (curr.total_clicked ?? 0),
          total_opens: acc.total_opens + (curr.total_completed ?? 0),
          not_clicked: acc.not_clicked + ((curr.total_links_sent ?? 0) - (curr.total_clicked ?? 0)),
        }),
        { total_links_sent: 0, total_clicks: 0, total_opens: 0, not_clicked: 0 }
      );

      setSubusersSummary(aggregated);
    } catch (err) {
      console.error("Failed to load sub-users aggregated summary", err);
    } finally {
      setLoadingSubusersSummary(false);
    }
  };

  const fetchSubUsersData = async (supervisorId, month = statsMonth, year = statsYear) => {
    setLoading(true);
    setError("");
    try {
      const data = await getSubUsersSummary(supervisorId, { month, year });
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setSubUsers(list);
    } catch (err) {
      setError(err?.message || "Failed to load sub-users summary.");
    } finally {
      setLoading(false);
    }
  };

  // Load supervisors or sub-users initially and when filters change
  useEffect(() => {
    if (canViewAllSupervisors && !selectedSupervisor) {
      fetchSupervisorsData(statsMonth, statsYear);
    } else if (selectedSupervisor) {
      fetchSubUsersData(selectedSupervisor.id, statsMonth, statsYear);
    } else if (isSupervisorOnly) {
      // Direct sub-users list for supervisor
      setSelectedSupervisor(currentUser);
    }
  }, [selectedSupervisor, statsMonth, statsYear]);

  // Effect to load summary statistics when supervisor, filters, or sub-users change
  useEffect(() => {
    if (selectedSupervisor) {
      fetchSupervisorSummary(selectedSupervisor.id, statsMonth, statsYear, subUsers);
    }
  }, [selectedSupervisor, statsMonth, statsYear, subUsers]);

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
    if (!formName || !formEmail || !formPassword) {
      triggerAlert("All fields are required.", false);
      return;
    }
    
    // Determine supervisor ID association
    const supervisorId = isAdmin ? (formSupervisorId || selectedSupervisor?.id) : currentUser.id;
    if (!supervisorId) {
      triggerAlert("Please select a Supervisor.", false);
      return;
    }

    setError("");
    try {
      await createSubUser({
        name: formName,
        email: formEmail,
        password: formPassword,
        type: formType,
        supervisor: parseInt(supervisorId, 10),
      });
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
      // Type is only editable for sub-users, type/supervisor_admin is editable for supervisors
      if (userToEdit.type === "supervisor" || userToEdit.type === "supervisor_admin") {
        payload.type = formSupervisorType;
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

  const openEditModal = (user) => {
    setUserToEdit(user);
    setFormName(user.name || "");
    setFormEmail(user.email || "");
    setFormType(user.type || "pre_policy_broad_access");
    setFormSupervisorType(user.type || "supervisor");
    setShowEditModal(true);
  };

  const openDeleteModal = (user) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const resetForms = () => {
    setFormName("");
    setFormEmail("");
    setFormPassword("");
    setFormType("pre_policy_broad_access");
    setFormSupervisorType("supervisor");
    setFormSupervisorId("");
    setUserToEdit(null);
  };

  // Helper mapping for roles
  const getRoleLabel = (type) => {
    if (type === "supervisor") return "Supervisor";
    if (type === "supervisor_admin") return "Supervisor Admin";
    const found = ACCESS_TYPES.find((t) => t.key === type);
    return found ? found.label : type;
  };

  // Summary Metrics
  const totalSupervisorsCount = supervisors.length;
  const totalSubUsersCount = supervisors.reduce((acc, curr) => acc + (curr.subUsersCount || 0), 0);

  return (
    <div className="min-h-[600px] font-sans text-sm">
      
      {/* Alert Banners */}
      {successMsg && (
        <div className="mb-4 p-3 bg-green-50 text-green-700 border border-green-200 rounded font-medium text-sm transition-all duration-300">
          {successMsg}
        </div>
      )}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded font-medium text-sm transition-all duration-300">
          {error}
        </div>
      )}

      {/* --- METRICS / COUNTS CARDS (Admin Main Page Only) --- */}
      {canViewAllSupervisors && !selectedSupervisor && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
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
                      <button
                        onClick={() => {
                          resetForms();
                          setShowCreateSubUserModal(true);
                        }}
                        className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded text-xs transition"
                      >
                        Add Sub-user
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
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Role Type</th>
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
                            <td className="px-4 py-3 text-gray-600">
                              <span className="px-2 py-0.5 text-xs font-semibold rounded bg-green-50 text-green-700 border border-green-100">
                                {getRoleLabel(sup.type)}
                              </span>
                            </td>
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
                                      onClick={() => openEditModal(sup)}
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
                              <td colSpan={6} className="px-6 py-4 border-b border-gray-200">
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
                    Supervisor: {selectedSupervisor.name}'s Transactions
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
                      {isSupervisorOnly ? "My Sub-users List" : `Sub-users of ${selectedSupervisor.name}`}
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
                                  {getRoleLabel(user.type)}
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
                                  {!isSupervisorAdmin && (
                                    <>
                                      <button
                                        onClick={() => openEditModal(user)}
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

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Supervisor Type</label>
                  <select
                    value={formSupervisorType}
                    onChange={(e) => setFormSupervisorType(e.target.value)}
                    className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white cursor-pointer transition"
                  >
                    <option value="supervisor">Supervisor</option>
                    <option value="supervisor_admin">Supervisor Admin</option>
                  </select>
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
                  >
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

                {/* Supervisors / Sub-users editing roles */}
                {(userToEdit.type === "supervisor" || userToEdit.type === "supervisor_admin") ? (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Supervisor Type</label>
                    <select
                      value={formSupervisorType}
                      onChange={(e) => setFormSupervisorType(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white cursor-pointer transition"
                    >
                      <option value="supervisor">Supervisor</option>
                      <option value="supervisor_admin">Supervisor Admin</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Access Role Type</label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value)}
                      className="border border-gray-300 rounded px-3 py-2 text-sm text-gray-700 w-full focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none bg-white cursor-pointer transition"
                    >
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
                <span className="block text-xs text-gray-500 font-semibold mt-1">Role: {getRoleLabel(userToDelete.type)}</span>
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

    </div>
  );
}
