import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import PrePolicyAssessmentResult from "./Pre-policy";
import WindShieldAssessmentResult from "./WindsheildClaim";
import { getInspectionOcr, getDamageResults, getWindshieldResults, listInspections } from "../api";

export default function ResultsPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const stateRow = location.state?.row;
  const stateTab = location.state?.tab; // "pre", "motor", "wind"

  const [detailView, setDetailView] = useState({
    row: stateRow || { id: id, name: "—", email: "—", policy: "—", status: "—" },
    tab: stateTab,
    ocrData: null,
    damageData: null,
    windshieldData: null,
    ocrLoading: true,
    ocrError: "",
  });

  useEffect(() => {
    let cancelled = false;

    const fetchResultData = async () => {
      try {
        let fetchedRow = stateRow;
        if (!fetchedRow) {
          try {
            let match = null;
            let page = 1;
            while (!match && page <= 5) {
              const res = await listInspections({ page });
              const results = Array.isArray(res) ? res : (res?.results || []);
              match = results.find((r) => String(r.id) === String(id));
              if (results.length === 0 || (!res?.next && !Array.isArray(res))) break;
              page++;
            }
            if (match) {
              fetchedRow = {
                id: match.id,
                unique_verify_id: match.unique_verify_id || "",
                name: match.customer_name || "—",
                email: match.email || "—",
                policy: match.policy_number || "—",
                status: match.status || "—",
                damage: match.damage_level || "",
                link: match.link || "",
              };
            }
          } catch (e) {
            console.error("Failed to fetch inspection details for direct link:", e);
          }
        }

        const [ocrRes, damageRes, windRes] = await Promise.allSettled([
          getInspectionOcr(id),
          getDamageResults(id),
          getWindshieldResults(id),
        ]);

        if (cancelled) return;

        const ocrData = ocrRes.status === "fulfilled" ? ocrRes.value : null;
        const damageData = damageRes.status === "fulfilled" ? damageRes.value : null;
        const windData = windRes.status === "fulfilled" ? windRes.value : null;

        const ocrErr = ocrRes.status === "rejected"
          ? (ocrRes.reason?.data?.detail || ocrRes.reason?.message || "Unable to load inspection details.")
          : "";

        // Determine tab if not provided in state
        let determinedTab = stateTab;
        if (!determinedTab) {
          if (windData && Array.isArray(windData.windshield_results) && windData.windshield_results.length > 0) {
            determinedTab = "wind";
          } else {
            determinedTab = "pre"; // Default to pre/motor
          }
        }

        setDetailView((prev) => ({
          ...prev,
          row: fetchedRow || prev.row,
          tab: determinedTab,
          ocrData,
          damageData,
          windshieldData: windData,
          ocrLoading: false,
          ocrError: ocrErr,
        }));
      } catch (err) {
        if (!cancelled) {
          const msg = err?.data?.detail || err?.data?.error || err?.message || "Unable to load inspection details.";
          setDetailView((prev) => ({ ...prev, ocrError: msg, ocrLoading: false }));
        }
      }
    };

    fetchResultData();

    return () => {
      cancelled = true;
    };
  }, [id, stateTab]);

  const handleBack = () => {
    // Go back to dashboard
    navigate("/dashboard");
  };

  if (detailView.tab === "wind") {
    return (
      <WindShieldAssessmentResult
        inspectionRow={detailView.row}
        ocrData={detailView.ocrData}
        windshieldData={detailView.windshieldData}
        ocrLoading={detailView.ocrLoading}
        ocrError={detailView.ocrError}
        onBack={handleBack}
      />
    );
  }

  return (
    <PrePolicyAssessmentResult
      inspectionRow={detailView.row}
      ocrData={detailView.ocrData}
      damageData={detailView.damageData}
      ocrLoading={detailView.ocrLoading}
      ocrError={detailView.ocrError}
      onBack={handleBack}
    />
  );
}
