import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, CheckCircle, RotateCcw, RotateCw, ChevronRight, MapPin, Shield, AlertCircle, Check, X, ArrowLeft, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { verifyInspectionLink, uploadInspectionOcr, uploadDamageImages, startAssessment, getDamageResults } from "../api";
import VehicleSideCapture from "./VehicleSideCapture";
import {
  acquireCameraStream,
  stopMediaStream,
  requestGeolocationOnce,
  cameraErrorToTranslationKey,
  getGeolocationCoordinates,
} from "../utils/cameraStream";

// ─── STEPS ───────────────────────────────────────────────────────────────────
// Manual steps captured with the traditional camera UI
const MANUAL_STEPS = [
  { id: "license_plate", label: "License Plate", instruction: "Position the plate within the frame", aspect: "portrait" },
  { id: "chassis_no", label: "Chassis Number", instruction: "Position the chassis number within the frame", aspect: "portrait" },
];

// WebSocket-detected sides (auto-captured via AI)
const WS_SIDE_ORDER = ["front", "rear", "left", "right"];

// Combined list for review screen (order: manual first, then WS sides)
const ALL_STEPS = [
  ...MANUAL_STEPS,
  { id: "front", label: "Front of Vehicle" },
  { id: "rear", label: "Rear of Vehicle" },
  { id: "left", label: "Left Side" },
  { id: "right", label: "Right Side" },
];

// Legacy alias used by CameraCapture — kept for compatibility
const STEPS = MANUAL_STEPS;

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'DM Sans', sans-serif; background: #f8faf8; overflow-x: hidden; }
    .font-syne { font-family: 'Syne', sans-serif; }
    .kfh-green  { color: #1a8a3c; }
    .kfh-bg     { background: #1a8a3c; }
    .kfh-border { border-color: #1a8a3c; }
    @keyframes fadeUp      { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse-ring  { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.12);opacity:.2} }
    @keyframes shimmer     { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    .fade-up   { animation: fadeUp .45s ease both; }
    .fade-up-1 { animation: fadeUp .45s .1s ease both; }
    .fade-up-2 { animation: fadeUp .45s .2s ease both; }
    .fade-up-3 { animation: fadeUp .45s .3s ease both; }
    .pulse-ring::before { content:''; position:absolute; inset:-8px; border-radius:inherit; border:2px solid #1a8a3c; animation:pulse-ring 2s ease-in-out infinite; }
    .shimmer-btn { background: linear-gradient(90deg,#1a8a3c 0%,#23b352 40%,#1a8a3c 80%); background-size:200% 100%; }
    .shimmer-btn:active { animation: shimmer 1s linear; }
    video { display:block; }
  `}</style>
);

// ─── KFH LOGO + LANG TOGGLE ──────────────────────────────────────────────────
const KFHHeader = () => {
  const { i18n } = useTranslation();
  return (
    <div className="fade-up w-full flex items-center justify-between mb-8">
      <img src="/KFH_logo.png" alt="KFH Takaful" className="h-10 object-contain" />
      <button
        onClick={() => i18n.changeLanguage(i18n.language === 'en' ? 'ar' : 'en')}
        className="px-3 py-1.5 bg-gray-100 text-[#1a8a3c] hover:bg-green-50 font-bold rounded-lg text-sm transition-colors"
      >
        {i18n.language === 'en' ? 'العربية' : 'English'}
      </button>
    </div>
  );
};

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1] || "");
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new Blob([u8arr], { type: mime });
}

/**
 * Rotate an image 90° anti-clockwise (counter-clockwise).
 * Returns a Promise that resolves to the rotated dataUrl.
 */
function rotateImageCCW90(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      // Swap width/height for 90° rotation
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");
      // Rotate 90° anti-clockwise: translate to bottom-left, then rotate -90°
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = dataUrl;
  });
}



// ─── SCREEN 1 : LANDING ───────────────────────────────────────────────────────
function Landing({ onStart }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-12" dir={i18n.dir()}>
      <GlobalStyle />
      <KFHHeader />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="fade-up-1 relative mb-8">
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center pulse-ring relative">
            <Camera className="w-10 h-10" style={{ color: '#1a8a3c' }} />
          </div>
        </div>
        <h1 className="fade-up-1 font-syne text-2xl font-bold text-gray-900 text-center mb-3" style={{ fontWeight: 700, whiteSpace: 'pre-wrap' }}>
          {t('Pre Claim Policy Inspection')}
        </h1>
        <p className="fade-up-2 text-gray-500 text-center text-sm leading-relaxed mb-10">
          {t('Take photos of your vehicle from all four sides for inspection')}
        </p>
        <div className="fade-up-2 w-full space-y-3 mb-10">
          {[
            { icon: <Camera className="w-4 h-4" style={{ color: '#1a8a3c' }} />, text: t("6 photos required: License plate, chassis & 4 sides") },
            { icon: <MapPin className="w-4 h-4" style={{ color: '#1a8a3c' }} />, text: t("GPS location will be recorded") },
            { icon: <Shield className="w-4 h-4" style={{ color: '#1a8a3c' }} />, text: t("Securely submitted for assessment") },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 bg-green-50 rounded-xl px-4 py-3">
              <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
              <span className="text-sm text-gray-600">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-up-3 w-full max-w-sm">
        <button onClick={onStart}
          className="shimmer-btn w-full text-white font-syne font-bold py-4 rounded-2xl text-base tracking-wide shadow-lg active:scale-95 transition-transform"
          style={{ fontWeight: 700 }}>
          {t('Start Assessment')}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 2 : TIPS ─────────────────────────────────────────────────────────
const DOS_TIPS = [
  { img: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200&q=60", text: "Ensure good lighting conditions" },
  { img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&q=60", text: "Keep the vehicle within the frame guide" },
  { img: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&q=60", text: "Take photos from a reasonable distance" },
  { img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200&q=60", text: "Ensure the entire vehicle is visible" },
];
const DONTS_TIPS = [
  { img: "https://images.unsplash.com/photo-1621274147744-cfb5694bb233?w=200&q=60", text: "Don't shoot in direct harsh sunlight" },
  { img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&q=60", text: "Don't cut off parts of the vehicle" },
  { img: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&q=60", text: "Don't use blurry or shaky photos" },
];

function TipsScreen({ onNext }) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(0);
  const tips = page === 0 ? DOS_TIPS : DONTS_TIPS;
  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-10" dir={i18n.dir()}>
      <GlobalStyle />
      <div className="flex items-center justify-between mb-6 fade-up">
        <div className="flex gap-2">
          {[0, 1].map(i => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === page ? 32 : 16, background: i === page ? '#1a8a3c' : '#e2e8f0' }} />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium">{page === 0 ? t("Photo Tips – Do's").split('–')[1] : t("Photo Tips – Don'ts").split('–')[1]}</span>
      </div>
      <div className="mb-6 fade-up">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${page === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          {page === 0
            ? <Check className="w-4 h-4" style={{ color: '#1a8a3c' }} />
            : <X className="w-4 h-4 text-red-500" />}
          <span className={`text-sm font-semibold ${page === 0 ? 'kfh-green' : 'text-red-500'}`}>
            {page === 0 ? t("Photo Tips – Do's") : t("Photo Tips – Don'ts")}
          </span>
        </div>
        <p className="text-gray-500 text-sm">{t("Follow these guidelines for the best results.")}</p>
      </div>
      <div className="flex-1 space-y-4 fade-up-1">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-3">
            <img src={tip.img} alt="" className="w-20 h-14 object-cover rounded-xl flex-shrink-0" />
            <p className="text-sm text-gray-700 font-medium leading-snug">{t(tip.text)}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 fade-up-2">
        {page === 0 ? (
          <button onClick={() => setPage(1)}
            className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform"
            style={{ fontWeight: 700 }}>
            {t("Next")}
          </button>
        ) : (
          <button onClick={onNext}
            className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform flex items-center justify-center"
            style={{ fontWeight: 700 }}>
            {t("Got It — Continue")} <ChevronRight className="w-4 h-4 ml-1 mx-1" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN 3 : AUTO-ROTATION ────────────────────────────────────────────────
function AutoRotationScreen({ onNext }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-14" dir={i18n.dir()}>
      <GlobalStyle />
      <div />
      <div className="flex flex-col items-center text-center fade-up">
        <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mb-8">
          <RotateCw className="w-10 h-10 text-[#1a8a3c]" />
        </div>
        <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3" style={{ fontWeight: 700 }}>{t("Turn Off Auto-Rotation")}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs">
          {t("Before we begin, please turn off your phone's auto-rotation feature.")}
        </p>
        <div className="w-full bg-green-50 border border-green-100 rounded-2xl px-5 py-4">
          <p className="text-sm text-gray-600 text-center leading-relaxed">
            {t("This ensures the camera stays in the correct orientation while you take photos.")}
          </p>
        </div>
      </div>
      <button onClick={onNext}
        className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform"
        style={{ fontWeight: 700 }}>
        {t("Next")}
      </button>
    </div>
  );
}

// ─── SCREEN 4 : PERMISSIONS ───────────────────────────────────────────────────
function PermissionsScreen({ onGranted }) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const request = async () => {
    setStatus("requesting");
    setErrorMsg("");
    try {
      const stream = await acquireCameraStream();
      stopMediaStream(stream);
      await requestGeolocationOnce();
      
      try {
        const loc = await getGeolocationCoordinates({ timeout: 5000 });
        if (loc.ok && loc.coords) {
          const locStr = `${loc.coords.latitude}, ${loc.coords.longitude}`;
          localStorage.setItem("user_location", locStr);
        }
      } catch (e) {
        console.error("Failed to capture location coordinates", e);
      }

      setStatus("idle");
      onGranted();
    } catch (err) {
      setStatus("error");
      setErrorMsg(cameraErrorToTranslationKey(err));
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-14" dir={i18n.dir()}>
      <GlobalStyle />
      <div />
      <div className="flex flex-col items-center text-center fade-up w-full max-w-sm">
        <div className="flex gap-5 mb-8">
          {[
            { icon: <Camera className="w-7 h-7" style={{ color: '#1a8a3c' }} />, label: "Camera" },
            { icon: <MapPin className="w-7 h-7" style={{ color: '#1a8a3c' }} />, label: "Location" },
          ].map(p => (
            <div key={p.label} className="flex-1 bg-green-50 rounded-2xl py-6 flex flex-col items-center gap-2">
              {p.icon}
              <span className="text-xs font-semibold text-gray-700">{t(p.label)}</span>
            </div>
          ))}
        </div>
        <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3" style={{ fontWeight: 700 }}>{t("Allow Access")}</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          {t("We need camera and GPS permissions to capture and geo-tag your vehicle photos.")}
        </p>
        {status === "error" && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600 text-left flex gap-2">
            <AlertCircle className="shrink-0 w-4 h-4 mt-0.5" /><span>{t(errorMsg)}</span>
          </div>
        )}
        {status === "requesting" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" /> {t("Requesting permissions…")}
          </div>
        )}
      </div>
      <button onClick={request} disabled={status === "requesting"}
        className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform disabled:opacity-60"
        style={{ fontWeight: 700 }}>
        {t("Grant Permissions")}
      </button>
    </div>
  );
}

// ─── SCREEN 5 : CAMERA CAPTURE ───────────────────────────────────────────────
function CameraCapture({ step, stepIndex, totalSteps, onCapture, onBack }) {
  const { t, i18n } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [streamReady, setStreamReady] = useState(false);
  const streamRef = useRef(null);
  const [streamObj, setStreamObj] = useState(null);
  const [streamErrorKey, setStreamErrorKey] = useState(null);
  const [streamRetryToken, setStreamRetryToken] = useState(0);

  const needsLandscape = step.aspect === "landscape";

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Acquire camera stream — re-runs for each step so the camera stays alive
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync reset before async camera open */
    let active = true;
    setStreamReady(false);
    setStreamErrorKey(null);
    setStreamObj(null);
    streamRef.current = null;
    /* eslint-enable react-hooks/set-state-in-effect */

    acquireCameraStream({
      width: { ideal: 1280 },
      height: { ideal: 720 },
    })
      .then((stream) => {
        if (!active) {
          stopMediaStream(stream);
          return;
        }
        streamRef.current = stream;
        setStreamObj(stream);
        setStreamReady(true);
      })
      .catch((err) => {
        if (!active) return;
        setStreamErrorKey(cameraErrorToTranslationKey(err));
      });

    return () => {
      active = false;
      stopMediaStream(streamRef.current);
      streamRef.current = null;
    };
  }, [stepIndex, streamRetryToken]);

  useEffect(() => {
    const v = videoRef.current;
    const s = streamObj;
    if (!v || !s) return;
    v.srcObject = s;
    const p = v.play?.();
    if (p && typeof p.then === "function") p.catch(() => { });
  }, [streamObj]);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current, c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.9);
    // Do NOT stop the stream here — the cleanup in useEffect handles it
    // when stepIndex changes or the component unmounts
    onCapture(dataUrl);
  };

  const orientationOk = !needsLandscape || isLandscape;

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden" dir={i18n.dir()}>
      <GlobalStyle />
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {streamErrorKey && (
        <div className="absolute inset-0 z-30 bg-black/90 flex flex-col items-center justify-center px-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mb-3 shrink-0" />
          <p className="text-white text-sm mb-4 leading-relaxed">{t(streamErrorKey)}</p>
          <button
            type="button"
            onClick={() => setStreamRetryToken((x) => x + 1)}
            className="w-full max-w-xs py-3 rounded-xl bg-white text-black font-syne font-bold text-sm active:scale-95 transition-transform"
          >
            {t("Try again")}
          </button>
        </div>
      )}

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-5 pt-5 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-white font-syne font-bold text-base flex-1" style={{ fontWeight: 700 }}>{t(step.label)}</span>
          <span className="text-white/60 text-xs">{stepIndex + 1} / {totalSteps}</span>
        </div>
        <div className="flex gap-1.5 justify-center mt-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === stepIndex ? 24 : 8, background: i < stepIndex ? '#1a8a3c' : i === stepIndex ? 'white' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
      </div>

      {/* Orientation warning */}
      {!orientationOk && (
        <div className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-5">
            <RotateCcw className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="font-syne text-white text-xl font-bold mb-2" style={{ fontWeight: 700 }}>{t("Rotate to Landscape")}</h3>
          <p className="text-white/60 text-sm">{t("For this photo, hold your phone horizontally")}</p>
        </div>
      )}

      {/* Frame guide */}
      {orientationOk && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white/40 rounded-2xl"
            style={{ width: needsLandscape ? '85%' : '65%', height: needsLandscape ? '55%' : '65%' }}>
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="absolute w-5 h-5"
                style={{
                  top: i < 2 ? 0 : 'auto', bottom: i >= 2 ? 0 : 'auto',
                  left: i % 2 === 0 ? 0 : 'auto', right: i % 2 === 1 ? 0 : 'auto',
                  borderTop: i < 2 ? '2px solid #1a8a3c' : 'none',
                  borderBottom: i >= 2 ? '2px solid #1a8a3c' : 'none',
                  borderLeft: i % 2 === 0 ? '2px solid #1a8a3c' : 'none',
                  borderRight: i % 2 === 1 ? '2px solid #1a8a3c' : 'none',
                  margin: '-1px',
                }} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-5 pt-8 pb-8">
        <p className="text-white/70 text-xs text-center mb-4">{t(step.instruction)}</p>
        <button onClick={capture} disabled={!streamReady || !orientationOk}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-sm flex items-center justify-center gap-2 kfh-bg disabled:opacity-40 active:scale-95 transition-transform"
          style={{ fontWeight: 700 }}>
          <Camera className="w-4 h-4" />
          {t("Capture")} {t(step.label)} ({stepIndex + 1}/{totalSteps})
        </button>
      </div>
    </div>
  );
}

// ─── Fullscreen Image Viewer Modal ─────────────────────────────────────────────
function FullscreenImageViewer({ imageUrl, onClose }) {
  const [zoom, setZoom] = useState(1);

  if (!imageUrl) return null;

  const handleZoomIn = (e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.5, 5)); };
  const handleZoomOut = (e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.5, 0.5)); };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center overflow-auto touch-pan-x touch-pan-y" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white">
        <X className="w-6 h-6" />
      </button>
      
      <div className="relative w-full h-full flex items-center justify-center" style={{ transform: `scale(${zoom})`, transition: 'transform 0.2s ease-out', transformOrigin: 'center center' }}>
        <img src={imageUrl} alt="Fullscreen" className="max-w-full max-h-full object-contain pointer-events-none" />
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-6 py-3 rounded-full z-20" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleZoomOut} className="text-white hover:text-green-400 transition p-2" title="Zoom Out">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6" />
          </svg>
        </button>
        <span className="text-white text-sm font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="text-white hover:text-green-400 transition p-2" title="Zoom In">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 6 : REVIEW & SUBMIT ──────────────────────────────────────────────
function ReviewSubmit({ photos, onSubmit, onRetakeSingle, onRetakeAll, isSubmitting }) {
  const { t, i18n } = useTranslation();
  const [fullscreenImage, setFullscreenImage] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={i18n.dir()}>
      <GlobalStyle />
      <div className="bg-white px-6 pt-10 pb-6 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full kfh-bg flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-syne text-xl font-bold text-gray-900 mb-1" style={{ fontWeight: 700 }}>{t("Review Your Photos")}</h2>
        <p className="text-gray-500 text-sm">{t("Make sure all vehicle sides are clearly visible")}</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {photos.map((photo, i) => (
          <div key={photo.sideId} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-gray-800 text-sm">{t(photo.label)}</span>
              <button onClick={() => onRetakeSingle(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white kfh-bg active:scale-95 transition-transform">
                <RotateCcw className="w-3 h-3" /> {t("Retake")}
              </button>
            </div>
            <div 
              className="mx-4 mb-4 rounded-xl overflow-hidden border-2 kfh-border aspect-video bg-black cursor-pointer relative group"
              onClick={() => setFullscreenImage(photo.dataUrl)}
            >
              <img src={photo.dataUrl} alt={t(photo.label)} className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-semibold">{t("Tap to view")}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {fullscreenImage && (
        <FullscreenImageViewer 
          imageUrl={fullscreenImage} 
          onClose={() => setFullscreenImage(null)} 
        />
      )}

      <div className="px-5 mt-6 space-y-3">
        <button onClick={onSubmit} disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ fontWeight: 700 }}>
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin mx-1" /> {t("Submitting…")}</> : t('Submit Assessment')}
        </button>
        <button onClick={onRetakeAll} disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-gray-700 font-syne font-semibold text-base bg-white border border-gray-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ fontWeight: 600 }}>
          <RotateCcw className="w-4 h-4 mx-1" /> {t("Retake All Photos")}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 7 : ASSESSMENT RESULTS ────────────────────────────────────────────
function AssessmentResults({ reqId, photos, damageResults, isLoading, error }) {
  const { t, i18n } = useTranslation();
  const photoCount = (photos || []).filter((p) => p?.dataUrl).length;

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-5" dir={i18n.dir()}>
        <GlobalStyle />
        <Loader2 className="w-10 h-10 text-green-600 animate-spin mb-4" />
        <p className="text-sm text-gray-600">{t("Submitting…")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-5" dir={i18n.dir()}>
        <GlobalStyle />
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="font-syne text-lg font-bold text-gray-900 mb-2">{t("Something went wrong")}</h2>
          <p className="text-sm text-gray-600 mb-6">{typeof error === "string" ? error : t("Could not open the camera. Please try again.")}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5"
      dir={i18n.dir()}
      data-inspection-results={damageResults != null ? "1" : "0"}
    >
      <GlobalStyle />
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm p-8 text-center">

        <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <p className="text-xs font-semibold text-green-600 uppercase tracking-widest mb-1">{t("Complete")}</p>
        <h2 className="font-syne text-xl font-bold text-gray-900 mb-2">{t("Assessment submitted")}</h2>
        <p className="text-sm text-gray-500 mb-2 leading-relaxed">
          {t("Your vehicle inspection has been received and is under review.")}
        </p>
        <p className="text-xs text-gray-400 mb-6">
          {photoCount} {t("photo")}{photoCount !== 1 ? "s" : ""} {t("total")}
        </p>

        <button type="button" className="w-full py-3 rounded-xl kfh-bg text-white text-sm font-semibold">
          {t("Done")}
        </button>

      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { t, i18n } = useTranslation();
  const { user_id, unique_id } = useParams();
  const [authState, setAuthState] = useState("loading");
  const [screen, setScreen] = useState("landing");
  const [captureIndex, setCaptureIndex] = useState(0);
  const [photos, setPhotos] = useState([]); // Manual photos (license_plate, chassis_no)
  const [wsPhotos, setWsPhotos] = useState([]); // WebSocket-captured side photos
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reqId] = useState(() => "KFH-" + Date.now().toString(36).toUpperCase());
  const [inspectionId, setInspectionId] = useState(null); // ID from verify-link response
  const [damageResults, setDamageResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [isUploadingOcr, setIsUploadingOcr] = useState(false);
  const [unreadableData, setUnreadableData] = useState(null);
  const [retakeSideId, setRetakeSideId] = useState(null);
  const [fakeImgDetected, setFakeImgDetected] = useState(false);

  // ── Auth check ───────────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!user_id || !unique_id) { setAuthState("failed"); return; }
      setAuthState("loading");
      try {
        const res = await verifyInspectionLink({ user_id: Number(user_id), unique_id });
        if (cancelled) return;
        if (res?.is_expired) setAuthState("expired");
        else if (res?.is_verified) {
          setAuthState("ok");
          // Store the inspection ID for the damage-results API
          if (res.id) setInspectionId(res.id);
          else if (res.inspection_id) setInspectionId(res.inspection_id);
        }
        else setAuthState("failed");
      } catch { if (!cancelled) setAuthState("failed"); }
    };
    run();
    return () => { cancelled = true; };
  }, [user_id, unique_id]);

  const proceedCapture = (finalDataUrl) => {
    const step = MANUAL_STEPS[captureIndex];
    const updated = [...photos];
    updated[captureIndex] = { sideId: step.id, label: step.label, dataUrl: finalDataUrl };
    setPhotos(updated);

    if (captureIndex < MANUAL_STEPS.length - 1) {
      setCaptureIndex(i => i + 1);
    } else {
      // All manual steps done — transition to WebSocket side detection
      setScreen("ws-camera");
    }
  };

  // ── Manual capture handler (license plate & chassis) ────────────────────────
  const handleCapture = async (dataUrl) => {
    const step = MANUAL_STEPS[captureIndex];
    const needsRotation = step.id === "license_plate" || step.id === "chassis_no";

    // Rotate license plate & chassis images 90° anti-clockwise
    const finalDataUrl = needsRotation ? await rotateImageCCW90(dataUrl) : dataUrl;

    // OCR upload for license plate & chassis number
    if (needsRotation && unique_id) {
      setIsUploadingOcr(true);
      try {
        const blob = dataUrlToBlob(finalDataUrl);
        const imageFile = new File([blob], "image.jpg", { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("unique_id", unique_id);
        formData.append("type", step.id);
        formData.append("image", imageFile);

        const loc = localStorage.getItem("user_location") || "";
        if (loc) {
          formData.append("location", loc);
        }

        const response = await uploadInspectionOcr(formData);
        
        if (response?.detected_text === "UNREADABLE") {
          setUnreadableData({ finalDataUrl });
          return;
        }
      } catch (err) {
        // swallow — capture flow must not be blocked
      } finally {
        setIsUploadingOcr(false);
      }
    }

    proceedCapture(finalDataUrl);
  };

  // ── WebSocket capture complete handler ───────────────────────────────────────
  const handleWsCaptured = (sidePhotos) => {
    // sidePhotos: [{ sideId, label, dataUrl }, ...] for front, rear, left, right
    setWsPhotos(sidePhotos);
    setScreen("review");
  };

  // ── Combined photos for review ──────────────────────────────────────────────
  const allPhotos = [...photos, ...wsPhotos];

  // ── Retake handlers ─────────────────────────────────────────────────────────
  const handleRetakeSingle = (index) => {
    if (index < MANUAL_STEPS.length) {
      // Retake a manual photo
      setCaptureIndex(index);
      setScreen("camera");
    } else {
      // Retake a WS-captured photo
      const sideIdx = index - MANUAL_STEPS.length;
      const sideId = ["front", "rear", "left", "right"][sideIdx];
      setRetakeSideId(sideId);
      setScreen("ws-camera");
    }
  };

  const handleRetakeAll = () => {
    setPhotos([]);
    setWsPhotos([]);
    setCaptureIndex(0);
    setScreen("camera");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResultsLoading(true);
    setResultsError(null);
    setDamageResults(null);

    try {
      if (!unique_id) throw new Error('Missing unique_id');

      const formData = new FormData();
      formData.append('unique_id', unique_id);

      // Attach images for upload (only the 4 side photos are required)
      allPhotos.forEach((photo) => {
        if (!photo?.dataUrl || !photo?.sideId) return;
        if (!['front', 'rear', 'left', 'right'].includes(photo.sideId)) return;
        const file = new File([dataUrlToBlob(photo.dataUrl)], `${photo.sideId}.jpg`, { type: 'image/jpeg' });
        formData.append(photo.sideId, file);
      });

      const loc = localStorage.getItem("user_location") || "";
      if (loc) {
        formData.append("location", loc);
      }
      formData.append("fake_img_detection", fakeImgDetected ? "true" : "false");

      // Upload all captured images
      await uploadDamageImages(formData);

      // Trigger assessment by sending only unique_id
      await startAssessment({ unique_id });

      // Fetch damage results (requires inspectionId from verify link)
      if (inspectionId) {
        const results = await getDamageResults(inspectionId);
        setDamageResults(results);
      }
    } catch (err) {
      console.error('Failed to submit assessment:', err);
      setResultsError(err?.data?.detail || err?.message || 'Failed to submit assessment');
    } finally {
      setResultsLoading(false);
      setIsSubmitting(false);
      setScreen("results");
    }
  };

  // ── Auth gates ────────────────────────────────────────────────────────────────
  if (authState === "loading") return (
    <div className="min-h-screen flex items-center justify-center bg-white" dir={i18n.dir()}>
      <GlobalStyle />
      <div className="text-center">
        <div className="mx-auto mb-4 w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-600 font-medium">{t("Authenticating link…")}</p>
      </div>
    </div>
  );

  if (authState === "expired") return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 text-center" dir={i18n.dir()}>
      <GlobalStyle />
      <div>
        <h1 className="font-syne text-2xl font-bold text-gray-900 mb-3">{t("Link Expired")}</h1>
        <p className="text-sm text-gray-600 max-w-sm">{t("This inspection link has expired. Please contact the administrator to request a new link.")}</p>
      </div>
    </div>
  );

  if (authState === "failed") return (
    <div className="min-h-screen flex items-center justify-center bg-white px-6 text-center" dir={i18n.dir()}>
      <GlobalStyle />
      <div>
        <h1 className="font-syne text-2xl font-bold text-gray-900 mb-3">{t("Authentication Failed")}</h1>
        <p className="text-sm text-gray-600 max-w-sm">{t("We could not verify this inspection link. Please check the link or contact the administrator.")}</p>
      </div>
    </div>
  );

  // ── Screens ───────────────────────────────────────────────────────────────────
  if (screen === "landing") return <Landing onStart={() => setScreen("tips")} />;
  if (screen === "tips") return <TipsScreen onNext={() => setScreen("autorotation")} />;
  if (screen === "autorotation") return <AutoRotationScreen onNext={() => setScreen("permissions")} />;
  if (screen === "permissions") return (
    <PermissionsScreen onGranted={() => { setCaptureIndex(0); setPhotos([]); setWsPhotos([]); setScreen("camera"); }} />
  );
  if (screen === "camera") return (
    <>
      <CameraCapture
        step={MANUAL_STEPS[captureIndex]}
        stepIndex={captureIndex}
        totalSteps={MANUAL_STEPS.length}
        onCapture={handleCapture}
        onBack={() => captureIndex === 0 ? setScreen("permissions") : setCaptureIndex(i => i - 1)}
      />
      {isUploadingOcr && (
        <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-green-500 animate-spin mb-4" />
          <p className="text-white text-sm font-medium">{t("Verifying image...")}</p>
        </div>
      )}

      {unreadableData && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col items-center justify-center px-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
            <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t("Text Not Detected")}</h3>
            <p className="text-sm text-gray-600 mb-6">{t("We couldn't read the text clearly. Would you like to retake the photo or continue?")}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setUnreadableData(null)}
                className="w-full py-3 rounded-xl bg-green-600 text-white font-bold"
              >
                {t("Retake Photo")}
              </button>
              <button 
                onClick={() => {
                  proceedCapture(unreadableData.finalDataUrl);
                  setUnreadableData(null);
                }}
                className="w-full py-3 rounded-xl bg-gray-100 text-gray-700 font-bold"
              >
                {t("Continue to Next Step")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
  if (screen === "ws-camera") {
    if (!user_id || !unique_id) {
      return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center px-7 text-center" dir={i18n.dir()}>
          <GlobalStyle />
          <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
          <h2 className="font-syne text-xl font-bold text-gray-900 mb-2">{t("Missing link data")}</h2>
          <p className="text-gray-600 text-sm leading-relaxed mb-8 max-w-sm">
            {t("This step needs a valid inspection link (user id and session id). Use the link you were sent or contact support.")}
          </p>
          <button
            type="button"
            onClick={() => {
              setCaptureIndex(MANUAL_STEPS.length - 1);
              setScreen("camera");
            }}
            className="w-full max-w-sm py-4 rounded-2xl text-white font-syne font-bold kfh-bg"
          >
            {t("Go back")}
          </button>
        </div>
      );
    }
    // Build initialCapturedSides map
    const initialCapturedSides = {};
    wsPhotos.forEach((p) => {
      initialCapturedSides[p.sideId] = p.dataUrl;
    });

    return (
      <VehicleSideCapture
        userId={user_id}
        uniqueId={unique_id}
        initialCapturedSides={initialCapturedSides}
        initialStep={retakeSideId ? ["front", "rear", "left", "right"].indexOf(retakeSideId) : 0}
        targetSideId={retakeSideId}
        onAllCaptured={(updatedPhotos, wasFake) => {
          if (wasFake) {
            setFakeImgDetected(true);
          }
          if (retakeSideId) {
            setWsPhotos((prev) =>
              prev.map((p) => {
                const match = updatedPhotos.find((up) => up.sideId === p.sideId);
                return match ? match : p;
              })
            );
            setRetakeSideId(null);
          } else {
            setWsPhotos(updatedPhotos);
          }
          setScreen("review");
        }}
        onBack={() => {
          setRetakeSideId(null);
          setCaptureIndex(MANUAL_STEPS.length - 1);
          setScreen("camera");
        }}
      />
    );
  }
  if (screen === "review") return (
    <ReviewSubmit
      photos={allPhotos}
      onSubmit={handleSubmit}
      onRetakeSingle={handleRetakeSingle}
      onRetakeAll={handleRetakeAll}
      isSubmitting={isSubmitting}
    />
  );
  if (screen === "results") return (
    <AssessmentResults
      photos={allPhotos}
      damageResults={damageResults}
      reqId={reqId}
      isLoading={resultsLoading}
      error={resultsError}
    />
  );
}