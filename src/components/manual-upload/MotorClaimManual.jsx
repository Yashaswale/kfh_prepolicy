import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { startAssessment, uploadDamageImages, uploadInspectionOcr } from "../../api";
import { AuthGate, ManualLanding, ManualReview, ManualUploadStep, TipsScreen, useVerifyLink } from "./ManualUploadCommon";

const REQUIRED = [
  { id: "license_plate", label: "License Plate", instruction: "Upload a clear photo of the license plate" },
  { id: "chassis_no", label: "Chassis Number", instruction: "Upload a clear photo of the chassis number" },
  { id: "front", label: "Front of Vehicle", instruction: "Upload the front view of the vehicle" },
  { id: "rear", label: "Rear of Vehicle", instruction: "Upload the rear view of the vehicle" },
  { id: "right", label: "Right Side", instruction: "Upload the right-side view of the vehicle" },
  { id: "left", label: "Left Side", instruction: "Upload the left-side view of the vehicle" },
];

export default function MotorClaimManual() {
  const { t, i18n } = useTranslation();
  const { user_id, unique_id } = useParams();
  if (!user_id || !unique_id) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-7 text-center" dir={i18n.dir()}>
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mb-4 text-amber-600 font-bold">
          !
        </div>
        <h2 className="font-syne text-xl font-bold text-gray-900 mb-2">{t("Missing link data")}</h2>
        <p className="text-gray-600 text-sm leading-relaxed max-w-sm">
          {t("Please open the inspection link you received (it contains your user id and session id).")}
        </p>
      </div>
    );
  }
  const { authState } = useVerifyLink({ userId: user_id, uniqueId: unique_id });

  const [screen, setScreen] = useState("landing"); // landing | tips | upload | extras | review | success
  const [stepIndex, setStepIndex] = useState(0);
  const [files, setFiles] = useState(() => Object.fromEntries(REQUIRED.map((s) => [s.id, null])));
  const [extraFiles, setExtraFiles] = useState([]); // File[]
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onStart = () => setScreen("tips");
    window.addEventListener("manual:start", onStart);
    return () => window.removeEventListener("manual:start", onStart);
  }, []);

  const step = REQUIRED[stepIndex];
  const currentFile = files[step?.id] || null;
  const setCurrentFile = (f) => setFiles((prev) => ({ ...prev, [step.id]: f }));

  const previewItems = useMemo(() => {
    const requiredItems = REQUIRED.map((s) => ({ id: s.id, label: s.label, file: files[s.id] }));
    const extras = extraFiles.map((f, idx) => ({ id: `extra_${idx}`, label: `Additional Image ${idx + 1}`, file: f }));
    return [...requiredItems, ...extras];
  }, [files, extraFiles]);

  const resetAll = () => {
    setFiles(Object.fromEntries(REQUIRED.map((s) => [s.id, null])));
    setExtraFiles([]);
    setStepIndex(0);
    setScreen("upload");
  };

  const submit = async () => {
    if (!unique_id) return;
    setSubmitting(true);
    try {
      // OCR uploads for license & chassis
      for (const ocrKey of ["license_plate", "chassis_no"]) {
        const file = files[ocrKey];
        if (!file) continue;
        const formData = new FormData();
        formData.append("unique_id", unique_id);
        formData.append("type", ocrKey);
        formData.append("image", file);
        try {
          await uploadInspectionOcr(formData);
        } catch {
          // swallow
        }
      }

      const fd = new FormData();
      fd.append("unique_id", unique_id);
      ["front", "rear", "left", "right"].forEach((k) => {
        const f = files[k];
        if (f) fd.append(k, f);
      });
      extraFiles.forEach((f) => {
        if (f) fd.append("other", f);
      });

      await uploadDamageImages(fd);
      await startAssessment({ unique_id });
      setScreen("success");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate authState={authState}>
      {screen === "landing" && (
        <ManualLanding
          title="Motor Claim Inspection (Manual Upload)"
          subtitle="Upload license, chassis, vehicle sides, and (optionally) any additional images from your device."
          badge="Manual Upload"
        />
      )}
      {screen === "tips" && <TipsScreen onNext={() => setScreen("upload")} />}
      {screen === "upload" && (
        <ManualUploadStep
          step={step}
          stepIndex={stepIndex}
          totalSteps={REQUIRED.length}
          file={currentFile}
          setFile={setCurrentFile}
          onBack={() => (stepIndex === 0 ? setScreen("tips") : setStepIndex((i) => i - 1))}
          onNext={() => {
            if (stepIndex < REQUIRED.length - 1) setStepIndex((i) => i + 1);
            else setScreen("extras");
          }}
        />
      )}

      {screen === "extras" && (
        <div className="min-h-screen bg-white flex flex-col px-6 py-10" dir={i18n.dir()}>
          <div className="mb-6">
            <h2 className="font-syne text-xl font-bold text-gray-900 mb-2" style={{ fontWeight: 700 }}>
              {t("Additional Images (Optional)")}
            </h2>
            <p className="text-sm text-gray-500">{t("Upload any extra images showing damage or details. You can add multiple.")}</p>
          </div>

          <label className="block mb-5">
            <span className="text-[13px] font-semibold text-gray-700">{t("Add images")}</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const next = Array.from(e.target.files || []);
                if (next.length) setExtraFiles((prev) => [...prev, ...next]);
                e.target.value = "";
              }}
              className="mt-2 block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
            />
          </label>

          {extraFiles.length > 0 && (
            <div className="space-y-3 mb-6">
              {extraFiles.map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t("Additional Image")} {idx + 1}</p>
                    <p className="text-xs text-gray-500 truncate">{f.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtraFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-colors"
                    title={t("Remove")}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-auto space-y-3">
            <button
              type="button"
              onClick={() => setScreen("review")}
              className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform flex items-center justify-center gap-2"
              style={{ fontWeight: 700 }}
            >
              {t("Continue to Review")} <Plus className="w-4 h-4 mx-1" />
            </button>
            <button
              type="button"
              onClick={() => setScreen("review")}
              className="w-full py-3 rounded-2xl text-gray-700 font-syne font-semibold text-sm bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
              style={{ fontWeight: 600 }}
            >
              {t("Skip")}
            </button>
          </div>
        </div>
      )}

      {screen === "review" && (
        <ManualReview
          title="Review Your Uploads"
          items={previewItems}
          onRetake={(i) => {
            if (i < REQUIRED.length) {
              setStepIndex(i);
              setScreen("upload");
            } else {
              setScreen("extras");
            }
          }}
          onRetakeAll={resetAll}
          onSubmit={submit}
          isSubmitting={submitting}
        />
      )}

      {screen === "success" && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center" dir={i18n.dir()}>
          <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center mb-4">
            ✓
          </div>
          <h2 className="font-syne text-2xl font-bold text-gray-900 mb-2">{t("Submission Successful")}</h2>
          <p className="text-sm text-gray-500">{t("Your claim has been submitted successfully.")}</p>
        </div>
      )}
    </AuthGate>
  );
}

