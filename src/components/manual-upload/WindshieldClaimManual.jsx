import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { startWindshieldAssessment, uploadInspectionOcr, uploadWindshieldImages } from "../../api";
import { AuthGate, ManualLanding, ManualReview, ManualUploadStep, TipsScreen, useVerifyLink } from "./ManualUploadCommon";

const STEPS = [
  { id: "license_plate", label: "License Plate", instruction: "Upload a clear photo of the license plate" },
  { id: "chassis_no", label: "Chassis Number", instruction: "Upload a clear photo of the chassis number" },
  { id: "windshield_plate", label: "Windshield with Plate", instruction: "Upload a photo of the full windshield with the plate visible" },
  { id: "windshield_damage", label: "Windshield Damage Closeup", instruction: "Upload a close-up photo of the damaged area" },
];

export default function WindshieldClaimManual() {
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
      if (files.windshield_plate) fd.append("windshield_plate_image", files.windshield_plate);
      if (files.windshield_damage) fd.append("windshield_closeup_image", files.windshield_damage);

      await uploadWindshieldImages(fd);
      await startWindshieldAssessment({ unique_id });
      setScreen("success");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthGate authState={authState}>
      {screen === "landing" && (
        <ManualLanding
          title="Windshield Damage Inspection (Manual Upload)"
          subtitle="Same windshield flow, but you will upload photos from your device (no camera capture)."
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

