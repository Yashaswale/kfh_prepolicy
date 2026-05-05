import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { startAssessment, uploadDamageImages, uploadInspectionOcr } from "../../api";
import { AuthGate, ManualLanding, ManualReview, ManualUploadStep, TipsScreen, useVerifyLink } from "./ManualUploadCommon";

const STEPS = [
  { id: "license_plate", label: "License Plate", instruction: "Upload a clear photo of the license plate" },
  { id: "chassis_no", label: "Chassis Number", instruction: "Upload a clear photo of the chassis number" },
  { id: "front", label: "Front of Vehicle", instruction: "Upload the front view of the vehicle" },
  { id: "rear", label: "Rear of Vehicle", instruction: "Upload the rear view of the vehicle" },
  { id: "right", label: "Right Side", instruction: "Upload the right-side view of the vehicle" },
  { id: "left", label: "Left Side", instruction: "Upload the left-side view of the vehicle" },
];

export default function PreclaimManual() {
  const { t } = useTranslation();
  const { user_id, unique_id } = useParams();
  if (!user_id || !unique_id) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-7 text-center">
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

  const [screen, setScreen] = useState("landing"); // landing | tips | upload | review | success
  const [stepIndex, setStepIndex] = useState(0);
  const [files, setFiles] = useState(() => Object.fromEntries(STEPS.map((s) => [s.id, null])));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const onStart = () => setScreen("tips");
    window.addEventListener("manual:start", onStart);
    return () => window.removeEventListener("manual:start", onStart);
  }, []);

  const step = STEPS[stepIndex];
  const currentFile = files[step?.id] || null;

  const setCurrentFile = (f) => setFiles((prev) => ({ ...prev, [step.id]: f }));

  const previewItems = useMemo(
    () => STEPS.map((s) => ({ id: s.id, label: s.label, file: files[s.id] })),
    [files]
  );

  const resetAll = () => {
    setFiles(Object.fromEntries(STEPS.map((s) => [s.id, null])));
    setStepIndex(0);
    setScreen("upload");
  };

  const submit = async () => {
    if (!unique_id) return;
    setSubmitting(true);
    try {
      // OCR uploads for license & chassis (non-blocking but awaited for consistency)
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

      // Damage images upload (only 4 sides)
      const fd = new FormData();
      fd.append("unique_id", unique_id);
      ["front", "rear", "left", "right"].forEach((k) => {
        const f = files[k];
        if (f) fd.append(k, f);
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
          title="Pre Claim Policy Inspection (Manual Upload)"
          subtitle="Same flow as pre-claim, but you will upload images from your device (no camera capture)."
          badge="Manual Upload"
        />
      )}
      {screen === "tips" && <TipsScreen onNext={() => setScreen("upload")} />}
      {screen === "upload" && (
        <ManualUploadStep
          step={step}
          stepIndex={stepIndex}
          totalSteps={STEPS.length}
          file={currentFile}
          setFile={setCurrentFile}
          onBack={() => (stepIndex === 0 ? setScreen("tips") : setStepIndex((i) => i - 1))}
          onNext={() => {
            if (stepIndex < STEPS.length - 1) setStepIndex((i) => i + 1);
            else setScreen("review");
          }}
        />
      )}
      {screen === "review" && (
        <ManualReview
          title="Review Your Uploads"
          items={previewItems}
          onRetake={(i) => {
            setStepIndex(i);
            setScreen("upload");
          }}
          onRetakeAll={resetAll}
          onSubmit={submit}
          isSubmitting={submitting}
        />
      )}
      {screen === "success" && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 text-center">
          <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center mb-4">
            ✓
          </div>
          <h2 className="font-syne text-2xl font-bold text-gray-900 mb-2">{t("Submission Successful")}</h2>
          <p className="text-sm text-gray-500">{t("Your inspection has been submitted successfully.")}</p>
        </div>
      )}
    </AuthGate>
  );
}

