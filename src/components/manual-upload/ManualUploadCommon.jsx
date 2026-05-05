import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle, ChevronRight, RotateCcw } from "lucide-react";
import { verifyInspectionLink } from "../../api";

const GlobalStyle = () => (
  <style>{`
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'DM Sans', sans-serif; background: #f8faf8; overflow-x: hidden; }
    .font-syne { font-family: 'Syne', sans-serif; }
    .kfh-green  { color: #1a8a3c; }
    .kfh-bg     { background: #1a8a3c; }
    .kfh-border { border-color: #1a8a3c; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    .fade-up   { animation: fadeUp .45s ease both; }
    .fade-up-1 { animation: fadeUp .45s .1s ease both; }
    .fade-up-2 { animation: fadeUp .45s .2s ease both; }
    .fade-up-3 { animation: fadeUp .45s .3s ease both; }
  `}</style>
);

const KFHHeader = () => {
  const { i18n } = useTranslation();
  return (
    <div className="fade-up w-full flex items-center justify-between mb-8">
      <img src="/KFH_logo.png" alt="KFH Takaful" className="h-10 object-contain" />
      <button
        onClick={() => i18n.changeLanguage(i18n.language === "en" ? "ar" : "en")}
        className="px-3 py-1.5 bg-gray-100 text-[#1a8a3c] hover:bg-green-50 font-bold rounded-lg text-sm transition-colors"
      >
        {i18n.language === "en" ? "العربية" : "English"}
      </button>
    </div>
  );
};

export function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("No file"));
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

export function useVerifyLink({ userId, uniqueId }) {
  const [authState, setAuthState] = useState("loading"); // loading | ok | expired | failed
  const [inspectionId, setInspectionId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!userId || !uniqueId) {
        setAuthState("failed");
        return;
      }
      setAuthState("loading");
      try {
        const res = await verifyInspectionLink({ user_id: Number(userId), unique_id: uniqueId });
        if (cancelled) return;
        if (res?.is_expired) setAuthState("expired");
        else if (res?.is_verified) {
          setAuthState("ok");
          if (res?.id) setInspectionId(res.id);
          else if (res?.inspection_id) setInspectionId(res.inspection_id);
        } else setAuthState("failed");
      } catch {
        if (!cancelled) setAuthState("failed");
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [userId, uniqueId]);

  return { authState, inspectionId };
}

export function AuthGate({ authState, children }) {
  const { t, i18n } = useTranslation();
  if (authState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir={i18n.dir()}>
        <GlobalStyle />
        <div className="text-center">
          <div className="mx-auto mb-4 w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-600 font-medium">{t("Authenticating link…")}</p>
        </div>
      </div>
    );
  }
  if (authState === "expired") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6 text-center" dir={i18n.dir()}>
        <GlobalStyle />
        <div>
          <h1 className="font-syne text-2xl font-bold text-gray-900 mb-3">{t("Link Expired")}</h1>
          <p className="text-sm text-gray-600 max-w-sm">
            {t("This inspection link has expired. Please contact the administrator to request a new link.")}
          </p>
        </div>
      </div>
    );
  }
  if (authState === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-6 text-center" dir={i18n.dir()}>
        <GlobalStyle />
        <div>
          <h1 className="font-syne text-2xl font-bold text-gray-900 mb-3">{t("Authentication Failed")}</h1>
          <p className="text-sm text-gray-600 max-w-sm">
            {t("We could not verify this inspection link. Please check the link or contact the administrator.")}
          </p>
        </div>
      </div>
    );
  }
  return children;
}

export function ManualLanding({ title, subtitle, badge }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-12" dir={i18n.dir()}>
      <GlobalStyle />
      <KFHHeader />
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        {badge ? (
          <div className="fade-up-1 inline-flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full px-3 py-1.5 mb-4">
            <div className="w-2 h-2 rounded-full bg-gray-900" />
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{t(badge)}</span>
          </div>
        ) : null}
        <h1 className="fade-up-1 font-syne text-2xl font-bold text-gray-900 text-center mb-3" style={{ fontWeight: 700, whiteSpace: "pre-wrap" }}>
          {t(title)}
        </h1>
        <p className="fade-up-2 text-gray-500 text-center text-sm leading-relaxed mb-10">{t(subtitle)}</p>
        <div className="fade-up-2 w-full space-y-3 mb-10">
          {[
            { text: t("Upload required photos from your device") },
            { text: t("No camera or location permissions needed") },
            { text: t("Review each file before continuing") },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-green-50 rounded-xl px-4 py-3">
              <div className="mt-0.5 shrink-0">
                <CheckCircle className="w-4 h-4" style={{ color: "#1a8a3c" }} />
              </div>
              <span className="text-sm text-gray-600">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="fade-up-3 w-full max-w-sm">
        <button
          type="button"
          onClick={() => window.dispatchEvent(new CustomEvent("manual:start"))}
          className="w-full text-white font-syne font-bold py-4 rounded-2xl text-base tracking-wide shadow-lg active:scale-95 transition-transform kfh-bg"
          style={{ fontWeight: 700 }}
        >
          {t("Start")}
        </button>
      </div>
    </div>
  );
}

export function TipsScreen({ onNext }) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const tips = useMemo(() => {
    const dos = [
      { img: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200&q=60", text: "Ensure good lighting conditions" },
      { img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&q=60", text: "Keep the subject within the frame" },
      { img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200&q=60", text: "Make sure the image is sharp and readable" },
    ];
    const donts = [
      { img: "https://images.unsplash.com/photo-1621274147744-cfb5694bb233?w=200&q=60", text: "Don't upload blurry or shaky photos" },
      { img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&q=60", text: "Don't cut off important parts of the vehicle" },
    ];
    return page === 0 ? dos : donts;
  }, [page]);

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-10" dir={i18n.dir()}>
      <GlobalStyle />
      <div className="flex items-center justify-between mb-6 fade-up">
        <div className="flex gap-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === page ? 32 : 16, background: i === page ? "#1a8a3c" : "#e2e8f0" }}
            />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium">{page === 0 ? t("Do's") : t("Don'ts")}</span>
      </div>
      <div className="mb-6 fade-up">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${page === 0 ? "bg-green-50" : "bg-red-50"}`}>
          {page === 0 ? (
            <CheckCircle className="w-4 h-4" style={{ color: "#1a8a3c" }} />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <span className={`text-sm font-semibold ${page === 0 ? "kfh-green" : "text-red-500"}`}>
            {page === 0 ? t("Photo Tips – Do's") : t("Photo Tips – Don'ts")}
          </span>
        </div>
        <p className="text-gray-500 text-sm">{t("Follow these guidelines for the best results.")}</p>
      </div>
      <div className="flex-1 space-y-4 fade-up-1">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-3">
            <img src={tip.img} alt="" className="w-20 h-14 object-cover rounded-xl shrink-0" />
            <p className="text-sm text-gray-700 font-medium leading-snug">{t(tip.text)}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 fade-up-2">
        {page === 0 ? (
          <button
            onClick={() => setPage(1)}
            className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform"
            style={{ fontWeight: 700 }}
          >
            {t("Next")}
          </button>
        ) : (
          <button
            onClick={onNext}
            className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform flex items-center justify-center"
            style={{ fontWeight: 700 }}
          >
            {t("Got It — Continue")} <ChevronRight className="w-4 h-4 ml-1 mx-1" />
          </button>
        )}
      </div>
    </div>
  );
}

function FilePreview({ file, label }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  if (!file || !url) return null;
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 bg-white shadow-sm">
      <div className="px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-gray-800">{label}</span>
        <span className="text-xs text-gray-400 truncate max-w-[45%]">{file.name}</span>
      </div>
      <div className="mx-4 mb-4 rounded-xl overflow-hidden border-2 kfh-border aspect-video bg-black">
        <img src={url} alt={label} className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

export function ManualUploadStep({ step, stepIndex, totalSteps, file, setFile, onNext, onBack }) {
  const { t, i18n } = useTranslation();
  const canContinue = Boolean(file);
  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-10" dir={i18n.dir()}>
      <GlobalStyle />
      <div className="fade-up flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-2 rounded-xl text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {t("Back")}
        </button>
        <span className="text-xs text-gray-400 font-medium">
          {stepIndex + 1} / {totalSteps}
        </span>
      </div>

      <div className="fade-up-1 mb-5">
        <h2 className="font-syne text-xl font-bold text-gray-900 mb-2" style={{ fontWeight: 700 }}>
          {t(step.label)}
        </h2>
        {step.instruction ? <p className="text-sm text-gray-500">{t(step.instruction)}</p> : null}
      </div>

      <div className="fade-up-1 space-y-4">
        <label className="block">
          <span className="text-[13px] font-semibold text-gray-700">{t("Choose an image")}</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="mt-2 block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
          />
        </label>

        {file ? <FilePreview file={file} label={t(step.label)} /> : null}

        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{ fontWeight: 700 }}
        >
          {t("Continue")} <ChevronRight className="w-4 h-4 mx-1" />
        </button>
      </div>
    </div>
  );
}

export function ManualReview({ title, items, onRetake, onSubmit, onRetakeAll, isSubmitting }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={i18n.dir()}>
      <GlobalStyle />
      <div className="bg-white px-6 pt-10 pb-6 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full kfh-bg flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-syne text-xl font-bold text-gray-900 mb-1" style={{ fontWeight: 700 }}>
          {t(title)}
        </h2>
        <p className="text-gray-500 text-sm">{t("Make sure all uploads are clear before submitting")}</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {items.map((it, i) => (
          <div key={it.id} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-gray-800 text-sm">{t(it.label)}</span>
              <button
                type="button"
                onClick={() => onRetake(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white kfh-bg active:scale-95 transition-transform"
              >
                <RotateCcw className="w-3 h-3" /> {t("Change")}
              </button>
            </div>
            <div className="mx-4 mb-4">
              {it.file ? (
                <FilePreview file={it.file} label={t(it.label)} />
              ) : (
                <div className="rounded-xl overflow-hidden border-2 kfh-border aspect-video bg-black flex items-center justify-center text-gray-400 text-sm">
                  {t("No file selected")}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="px-5 mt-6 space-y-3">
        <button
          type="button"
          onClick={onSubmit}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ fontWeight: 700 }}
        >
          {isSubmitting ? t("Submitting…") : t("Submit")}
        </button>
        <button
          type="button"
          onClick={onRetakeAll}
          disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-gray-700 font-syne font-semibold text-base bg-white border border-gray-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ fontWeight: 600 }}
        >
          <RotateCcw className="w-4 h-4 mx-1" /> {t("Start Over")}
        </button>
      </div>
    </div>
  );
}

