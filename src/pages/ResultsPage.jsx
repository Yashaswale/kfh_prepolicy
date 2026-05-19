import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInspectionOcr, getDamageResults, getWindshieldResults } from "../api";
import PrePolicyAssessmentResult from "./Pre-policy";
import WindShieldAssessmentResult from "./WindsheildClaim";

export default function ResultsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ocrData, setOcrData] = useState(null);
  const [damageData, setDamageData] = useState(null);
  const [windshieldData, setWindshieldData] = useState(null);
  const [tab, setTab] = useState("pre");

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      // Fetch OCR, Damage, and Windshield results concurrently
      const [ocrRes, dmgRes, windRes] = await Promise.allSettled([
        getInspectionOcr(id),
        getDamageResults(id),
        getWindshieldResults(id)
      ]);

      if (ocrRes.status === "rejected") {
        throw new Error("Could not load inspection data. " + (ocrRes.reason?.message || ""));
      }

      const ocr = ocrRes.value;
      const dmg = dmgRes.status === "fulfilled" ? dmgRes.value : null;
      const wind = windRes.status === "fulfilled" ? windRes.value : null;

      setOcrData(ocr);
      
      let isWindshield = false;
      if (wind && !wind.error) {
         isWindshield = true;
         setWindshieldData(wind);
      } else if (Array.isArray(ocr) && ocr.some(o => o.type.includes("windshield"))) {
         isWindshield = true;
      }

      if (isWindshield) {
         setTab("wind");
      } else {
         setDamageData(dmg);
         setTab("pre");
      }

    } catch (err) {
      setError(err.message || "Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <svg className="w-10 h-10 animate-spin text-green-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <div className="text-gray-600 font-medium tracking-wide">Loading results...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="text-red-500 bg-red-50 px-6 py-4 rounded-xl border border-red-200 flex items-center gap-3">
          <svg className="w-6 h-6 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-medium">{error}</span>
        </div>
        <button onClick={() => navigate("/")} className="mt-6 px-5 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition">
          Go to Home
        </button>
      </div>
    );
  }

  // Create a minimal inspectionRow since we don't have the list data
  const mockRow = {
    id: id,
    unique_verify_id: "",
    name: "—",
    email: "—",
    policy: "—",
    status: "—"
  };

  if (tab === "wind") {
    return (
      <WindShieldAssessmentResult
        inspectionRow={mockRow}
        ocrData={ocrData}
        windshieldData={windshieldData}
        ocrLoading={false}
        ocrError={""}
        onBack={() => navigate(-1)}
        onRefresh={() => fetchData()}
      />
    );
  }

  return (
    <PrePolicyAssessmentResult
      inspectionRow={mockRow}
      ocrData={ocrData}
      damageData={damageData}
      ocrLoading={false}
      ocrError={""}
      onBack={() => navigate(-1)}
      onRefresh={() => fetchData()}
    />
  );
}
