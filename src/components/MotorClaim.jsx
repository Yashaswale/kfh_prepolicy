import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Camera, CheckCircle, RotateCcw, ChevronRight, MapPin, Shield, AlertCircle, Check, X, ArrowLeft, Loader2, Plus, Trash2, ImagePlus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { uploadDamageImages, startAssessment, uploadInspectionOcr } from "../api";
import VehicleSideCapture from "./VehicleSideCapture";

// ─── REQUIRED STEPS (license + chassis) ───────────────────────────────────────────
const REQUIRED_STEPS = [
  { id: "license_plate", label: "License Plate",  instruction: "Position the plate within the frame",  aspect: "portrait" },
  { id: "chassis_no",    label: "Chassis Number", instruction: "Position the chassis number within the frame", aspect: "portrait" },
];

// ─── GLOBAL STYLES ────────────────────────────────────────────────────────────
const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'DM Sans', sans-serif; background: #f8faf8; overflow-x: hidden; }
    .font-syne { font-family: 'Syne', sans-serif; }
    .kfh-green { color: #1a8a3c; }
    .kfh-bg { background: #1a8a3c; }
    .kfh-border { border-color: #1a8a3c; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.12);opacity:.2} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes slideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
    .fade-up  { animation: fadeUp .45s ease both; }
    .fade-up-1{ animation: fadeUp .45s .1s ease both; }
    .fade-up-2{ animation: fadeUp .45s .2s ease both; }
    .fade-up-3{ animation: fadeUp .45s .3s ease both; }
    .slide-up { animation: slideUp .35s cubic-bezier(.22,1,.36,1) both; }
    .pulse-ring::before { content:''; position:absolute; inset:-8px; border-radius:inherit; border:2px solid #1a8a3c; animation:pulse-ring 2s ease-in-out infinite; }
    .shimmer-btn { background: linear-gradient(90deg,#1a8a3c 0%,#23b352 40%,#1a8a3c 80%); background-size:200% 100%; }
    .shimmer-btn:active { animation: shimmer 1s linear; }
    video { display:block; }
  `}</style>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────
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

function rotateImageCCW90(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.height;
      canvas.height = img.width;
      const ctx = canvas.getContext("2d");
      ctx.translate(0, canvas.height);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.src = dataUrl;
  });
}

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

// ─── SCREEN 1: LANDING ───────────────────────────────────────────────────────
function Landing({ onStart }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-12" dir={i18n.dir()}>
      <GlobalStyle />
      <KFHHeader />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        <div className="fade-up-1 relative mb-8">
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center pulse-ring relative">
            <Camera className="w-10 h-10" style={{color:'#1a8a3c'}} />
          </div>
        </div>

        <div className="fade-up-1 inline-flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-full px-3 py-1.5 mb-4">
          <div className="w-2 h-2 rounded-full bg-orange-400" />
          <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Motor Claim</span>
        </div>

        <h1 className="fade-up-1 font-syne text-2xl font-bold text-gray-900 text-center mb-3" style={{fontWeight:700, whiteSpace: 'pre-wrap'}}>
          {t("Motor Claim Inspection")}
        </h1>
        <p className="fade-up-2 text-gray-500 text-center text-sm leading-relaxed mb-10">
          Capture required photos and any additional damage evidence for your motor claim assessment
        </p>

        <div className="fade-up-2 w-full space-y-3 mb-10">
          {[
            { icon: <Camera className="w-4 h-4" style={{color:'#1a8a3c'}}/>, text: "License plate + chassis number photos" },
            { icon: <Camera className="w-4 h-4" style={{color:'#1a8a3c'}}/>, text: "Front/Rear/Left/Right side capture via live guidance" },
            { icon: <Plus className="w-4 h-4" style={{color:'#1a8a3c'}}/>,   text: "Add unlimited extra damage photos" },
            { icon: <MapPin className="w-4 h-4" style={{color:'#1a8a3c'}}/>, text: t("GPS location will be recorded") },
            { icon: <Shield className="w-4 h-4" style={{color:'#1a8a3c'}}/>, text: t("Securely submitted for assessment") },
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
          style={{fontWeight:700}}>
          {t("Start Assessment")}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 2: DOS & DON'TS ──────────────────────────────────────────────────
const DOS_TIPS = [
  { img: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200&q=60", text: "Ensure good lighting conditions" },
  { img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&q=60", text: "Keep the vehicle within the frame guide" },
  { img: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&q=60", text: "Capture all visible damage clearly" },
  { img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200&q=60", text: "Ensure the entire vehicle is visible" },
];
const DONTS_TIPS = [
  { img: "https://images.unsplash.com/photo-1621274147744-cfb5694bb233?w=200&q=60", text: "Don't shoot in direct harsh sunlight" },
  { img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&q=60", text: "Don't cut off parts of the vehicle" },
  { img: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&q=60", text: "Don't use blurry or shaky photos" },
];

function TipsScreen({ onNext }) {
  const [page, setPage] = useState(0);
  const tips = page === 0 ? DOS_TIPS : DONTS_TIPS;

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-10">
      <GlobalStyle />
      <div className="flex items-center justify-between mb-6 fade-up">
        <div className="flex gap-2">
          {[0,1].map(i => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === page ? 32 : 16, background: i === page ? '#1a8a3c' : '#e2e8f0' }} />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium">{page === 0 ? "Do's" : "Don'ts"}</span>
      </div>

      <div className="mb-6 fade-up">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${page === 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          {page === 0 ? <Check className="w-4 h-4" style={{color:'#1a8a3c'}} /> : <X className="w-4 h-4 text-red-500" />}
          <span className={`text-sm font-semibold ${page === 0 ? 'kfh-green' : 'text-red-500'}`}>
            Photo Tips – {page === 0 ? "Do's" : "Don'ts"}
          </span>
        </div>
        <p className="text-gray-500 text-sm">Follow these guidelines for the best results.</p>
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
            style={{fontWeight:700}}>
            {t("Next")}
          </button>
        ) : (
          <button onClick={onNext}
            className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform flex items-center justify-center"
            style={{fontWeight:700}}>
            {t("Got It — Continue")} <ChevronRight className="w-4 h-4 mx-1" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN 3: AUTO-ROTATION ──────────────────────────────────────────────────
function AutoRotationScreen({ onNext }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-14" dir={i18n.dir()}>
      <GlobalStyle />
      <div />
      <div className="flex flex-col items-center text-center fade-up">
        <div className="w-20 h-20 rounded-2xl bg-green-50 flex items-center justify-center mb-8">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M8 20 A12 12 0 1 1 20 32" stroke="#1a8a3c" strokeWidth="2.5" strokeLinecap="round"/>
            <path d="M8 26 L8 20 L14 20" stroke="#1a8a3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <rect x="15" y="10" width="12" height="20" rx="2" stroke="#1a8a3c" strokeWidth="2"/>
          </svg>
        </div>
        <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3" style={{fontWeight:700}}>{t("Turn Off Auto-Rotation")}</h2>
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
        style={{fontWeight:700}}>
        {t("Next")}
      </button>
    </div>
  );
}

// ─── SCREEN 4: PERMISSIONS ────────────────────────────────────────────────────
function PermissionsScreen({ onGranted }) {
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const request = async () => {
    setStatus("requesting");
    try {
      await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => onGranted(), () => onGranted(), { timeout: 5000 });
      } else {
        onGranted();
      }
    } catch {
      setStatus("error");
      setErrorMsg("Camera permission denied. Please allow camera access in your browser settings.");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-14" dir={i18n.dir()}>
      <GlobalStyle />
      <div />
      <div className="flex flex-col items-center text-center fade-up w-full max-w-sm">
        <div className="flex gap-5 mb-8">
          {[
            { icon: <Camera className="w-7 h-7" style={{color:'#1a8a3c'}}/>, label: "Camera" },
            { icon: <MapPin className="w-7 h-7" style={{color:'#1a8a3c'}}/>, label: "Location" },
          ].map(p => (
            <div key={p.label} className="flex-1 bg-green-50 rounded-2xl py-6 flex flex-col items-center gap-2">
              {p.icon}
              <span className="text-xs font-semibold text-gray-700">{t(p.label)}</span>
            </div>
          ))}
        </div>
        <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3" style={{fontWeight:700}}>{t("Allow Access")}</h2>
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
        style={{fontWeight:700}}>
        {t("Grant Permissions")}
      </button>
    </div>
  );
}

// ─── SCREEN 5: CAMERA CAPTURE ────────────────────────────────────────────────
function CameraCapture({ step, stepIndex, totalRequired, isExtra, extraLabel, onCapture, onBack }) {
  const { t, i18n } = useTranslation();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [streamReady, setStreamReady] = useState(false);
  const [streamObj, setStreamObj] = useState(null);

  const needsLandscape = !isExtra && step?.aspect === "landscape";
  const label = isExtra ? extraLabel : step?.label;
  const instruction = isExtra ? t("Capture any additional damage or details") : step?.instruction;

  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let active = true;
    let currentStream = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }).then(stream => {
      if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
      currentStream = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setStreamObj(stream);
      setStreamReady(true);
    });
    return () => {
      active = false;
      currentStream?.getTracks().forEach(t => t.stop());
    };
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current;
    const c = canvasRef.current;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    c.getContext("2d").drawImage(v, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.9);
    onCapture(dataUrl);
  };

  const orientationOk = !needsLandscape || isLandscape;

  // Progress: show required dots + extra indicator
  const dotCount = totalRequired;

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden" dir={i18n.dir()}>
      <GlobalStyle />
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/70 to-transparent px-5 pt-5 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1">
            <span className="text-white font-syne font-bold text-base block" style={{fontWeight:700}}>{t(label)}</span>
            {isExtra && (
              <span className="text-orange-300 text-xs">{t("Additional Photo")}</span>
            )}
          </div>
          {!isExtra && (
            <span className="text-white/60 text-xs">{stepIndex + 1} / {totalRequired}</span>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center mt-2 items-center">
          {Array.from({length: dotCount}).map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === stepIndex && !isExtra ? 24 : 8,
                background: i < stepIndex || (isExtra && i < dotCount)
                  ? '#1a8a3c'
                  : i === stepIndex && !isExtra
                    ? 'white'
                    : 'rgba(255,255,255,0.3)'
              }} />
          ))}
          {isExtra && (
            <div className="h-1.5 w-6 rounded-full bg-orange-400 ml-1" />
          )}
        </div>
      </div>

      {/* Orientation warning */}
      {!orientationOk && (
        <div className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-yellow-500/20 flex items-center justify-center mb-5">
            <RotateCcw className="w-8 h-8 text-yellow-400" />
          </div>
          <h3 className="font-syne text-white text-xl font-bold mb-2" style={{fontWeight:700}}>{t("Rotate to Landscape")}</h3>
          <p className="text-white/60 text-sm">{t("For this photo, hold your phone horizontally")}</p>
        </div>
      )}

      {/* Frame guide */}
      {orientationOk && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="border-2 border-white/40 rounded-2xl"
            style={{ width: needsLandscape ? '85%' : '65%', height: needsLandscape ? '55%' : '65%' }}>
            {[0,1,2,3].map(i => (
              <div key={i} className={`absolute w-5 h-5`}
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
        <p className="text-white/70 text-xs text-center mb-4">{t(instruction)}</p>
        <button onClick={capture} disabled={!streamReady || !orientationOk}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-sm flex items-center justify-center gap-2 kfh-bg disabled:opacity-40 active:scale-95 transition-transform"
          style={{fontWeight:700}}>
          <Camera className="w-4 h-4" />
          {isExtra ? t("Capture Additional Photo") : `${t("Capture")} ${t(label)} (${stepIndex + 1}/${totalRequired})`}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 6: ADD MORE PHOTOS ────────────────────────────────────────────────
function AddMorePhotos({ requiredPhotos, wsPhotos, extraPhotos, onAddMore, onDeleteExtra, onRetakeSides, onContinue }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={i18n.dir()}>
      <GlobalStyle />

      {/* Header */}
      <div className="bg-white px-6 pt-10 pb-6 shadow-sm">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full kfh-bg flex items-center justify-center mx-1">
            <Check className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-syne text-lg font-bold text-gray-900" style={{fontWeight:700}}>{t("Required Photos Done")}</h2>
          <p className="text-xs text-gray-400">{requiredPhotos.length + wsPhotos.length} {t("of")} {requiredPhotos.length + wsPhotos.length} {t("captured")}</p>
          </div>
        </div>

        {/* Orange banner */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3 flex items-start gap-3">
          <ImagePlus className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-orange-700 mb-0.5">{t("Add damage photos?")}</p>
            <p className="text-xs text-orange-600 leading-relaxed">
              {t("You can add any number of additional photos showing specific damage, interior, or other details to strengthen your claim.")}
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 mt-5">
        {/* Required photos summary */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">{t("Required Photos")}</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {requiredPhotos.map((photo) => (
            <div key={photo.sideId} className="bg-white rounded-2xl overflow-hidden shadow-sm">
              <div className="aspect-video bg-black">
                <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-cover" />
              </div>
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700 truncate">{t(photo.label)}</span>
                <CheckCircle className="w-4 h-4 flex-shrink-0" style={{color:'#1a8a3c'}} />
              </div>
            </div>
          ))}
        </div>

        {/* Vehicle side photos (WS capture) */}
        {wsPhotos.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t("Vehicle Side Photos")} ({wsPhotos.length})
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {wsPhotos.map((photo) => (
                <div key={photo.sideId} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                  <div className="aspect-video bg-black">
                    <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-cover" />
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 truncate">{t(photo.label)}</span>
                    <button
                      onClick={onRetakeSides}
                      className="px-2 py-1 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors mx-1"
                    >
                      {t("Retake")}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Extra photos */}
        {extraPhotos.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
              {t("Additional Photos")} ({extraPhotos.length})
            </p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {extraPhotos.map((photo, i) => (
                <div key={photo.sideId} className="bg-white rounded-2xl overflow-hidden shadow-sm slide-up relative">
                  <div className="aspect-video bg-black">
                    <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-cover" />
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-700 truncate">{t(photo.label)}</span>
                    <button onClick={() => onDeleteExtra(i)}
                      className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform">
                      <Trash2 className="w-3 h-3 text-red-400" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Add more button */}
        <button onClick={onAddMore}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 text-green-700 font-syne font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform mb-4"
          style={{fontWeight:600}}>
          <Plus className="w-5 h-5 mx-1" />
          {t("Add")}{" "}{extraPhotos.length > 0 ? t('Another') : t('Additional')}{" "}{t("Photo")}
        </button>
      </div>

      {/* Continue CTA */}
      <div className="px-5">
        <button onClick={onContinue}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform shadow-lg flex items-center justify-center gap-2"
          style={{fontWeight:700}}>
          {t("Review & Submit")}
          <ChevronRight className="w-5 h-5 mx-1" />
        </button>
        <p className="text-center text-xs text-gray-400 mt-3">
          {extraPhotos.length === 0 ? t("No additional photos — you can still submit") : `${extraPhotos.length} ${t("additional photo")}${extraPhotos.length > 1 ? 's' : ''} ${t("added")}`}
        </p>
      </div>
    </div>
  );
}

// ─── SCREEN 7: REVIEW & SUBMIT ────────────────────────────────────────────────
function ReviewSubmit({ requiredPhotos, wsPhotos, extraPhotos, onSubmit, onRetakeSingle, onRetakeExtra, onDeleteExtra, onAddMore, onRetakeSides, onRetakeAll, isSubmitting }) {
  const { t, i18n } = useTranslation();
  const allPhotos = [...requiredPhotos, ...wsPhotos, ...extraPhotos];

  return (
    <div className="min-h-screen bg-gray-50 pb-10" dir={i18n.dir()}>
      <GlobalStyle />

      <div className="bg-white px-6 pt-10 pb-6 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full kfh-bg flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-syne text-xl font-bold text-gray-900 mb-1" style={{fontWeight:700}}>{t("Review Your Photos")}</h2>
        <p className="text-gray-500 text-sm">
          {allPhotos.length} {t("photo")}{allPhotos.length !== 1 ? 's' : ''} {t("total")} · {requiredPhotos.length + wsPhotos.length} {t("required")} · {extraPhotos.length} {t("additional")}
        </p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Required */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{t("Required Photos")}</p>
        {requiredPhotos.map((photo, i) => (
          <div key={photo.sideId} className="bg-white rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-semibold text-gray-800 text-sm">{t(photo.label)}</span>
              <button onClick={() => onRetakeSingle(i)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white kfh-bg active:scale-95 transition-transform">
                <RotateCcw className="w-3 h-3" /> {t("Retake")}
              </button>
            </div>
            <div className="mx-4 mb-4 rounded-xl overflow-hidden border-2 kfh-border aspect-video bg-black">
              <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-contain" />
            </div>
          </div>
        ))}

        {/* Vehicle sides (WS capture) */}
        {wsPhotos.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-2">
              {t("Vehicle Side Photos")} ({wsPhotos.length})
            </p>
            {wsPhotos.map((photo) => (
              <div key={photo.sideId} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-semibold text-gray-800 text-sm">{t(photo.label)}</span>
                  <button onClick={onRetakeSides}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white kfh-bg active:scale-95 transition-transform">
                    <RotateCcw className="w-3 h-3" /> {t("Retake")}
                  </button>
                </div>
                <div className="mx-4 mb-4 rounded-xl overflow-hidden border-2 kfh-border aspect-video bg-black">
                  <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-contain" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Extra */}
        {extraPhotos.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-2">
              {t("Additional Photos")} ({extraPhotos.length})
            </p>
            {extraPhotos.map((photo, i) => (
              <div key={photo.sideId} className="bg-white rounded-2xl overflow-hidden shadow-sm">
                <div className="flex items-center justify-between px-4 py-3">
                  <span className="font-semibold text-gray-800 text-sm">{t(photo.label)}</span>
                  <div className="flex gap-2">
                    <button onClick={() => onRetakeExtra(i)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white kfh-bg active:scale-95 transition-transform">
                      <RotateCcw className="w-3 h-3" /> {t("Retake")}
                    </button>
                    <button onClick={() => onDeleteExtra(i)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-red-500 active:scale-95 transition-transform">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="mx-4 mb-4 rounded-xl overflow-hidden border-2 border-orange-300 aspect-video bg-black">
                  <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-contain" />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Add more from review */}
        <button onClick={onAddMore}
          className="w-full py-3 rounded-2xl border-2 border-dashed border-green-300 bg-green-50 text-green-700 font-syne font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
          style={{fontWeight:600}}>
          <Plus className="w-4 h-4 mx-1" /> {t("Add More Photos")}
        </button>
      </div>

      {/* Actions */}
      <div className="px-5 mt-6 space-y-3">
        <button onClick={onSubmit} disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base kfh-bg active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          style={{fontWeight:700}}>
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin mx-1" /> {t("Submitting…")}</> : t('Submit Assessment')}
        </button>
        <button onClick={onRetakeAll} disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-gray-700 font-syne font-semibold text-base bg-white border border-gray-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          style={{fontWeight:600}}>
          <RotateCcw className="w-4 h-4 mx-1" /> {t("Retake All Photos")}
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 8: SUCCESS ────────────────────────────────────────────────────────
function SuccessScreen({ reqId, totalPhotos }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-7 text-center" dir={i18n.dir()}>
      <GlobalStyle />
      <div className="w-20 h-20 rounded-full kfh-bg flex items-center justify-center mb-6 fade-up">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3 fade-up-1" style={{fontWeight:700}}>{t("Submission Successful")}</h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-8 fade-up-1">
        {t("Your claim has been submitted successfully. Our team will review and contact you shortly.")}
      </p>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function MotorClaim() {
  const params = useParams();
  const userId = params.user_id || params.userId || null;
  const uniqueId = params.unique_id || params.uniqueId || localStorage.getItem("unique_id") || null;

  const [screen, setScreen] = useState("landing");
  const [captureIndex, setCaptureIndex] = useState(0);     // index into REQUIRED_STEPS
  const [requiredPhotos, setRequiredPhotos] = useState([]); // license + chassis
  const [wsPhotos, setWsPhotos] = useState([]);           // side photos from WS capture
  const [extraPhotos, setExtraPhotos] = useState([]);     // unlimited additional photos
  const [retakeTarget, setRetakeTarget] = useState(null); // { type:'required'|'extra', index }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [extraCount, setExtraCount] = useState(0);        // running counter for naming
  const [reqId] = useState(() => "MC-" + Date.now().toString(36).toUpperCase());

  // ── Camera capture handler ──
  const handleCapture = async (dataUrl) => {
    // Rotate license plate / chassis photos (as in Preclaim) for consistent OCR upload
    const step = REQUIRED_STEPS[captureIndex];
    const needsRotation = step?.id === "license_plate" || step?.id === "chassis_no";
    const finalDataUrl = needsRotation ? await rotateImageCCW90(dataUrl) : dataUrl;

    // Retaking a specific photo
    if (retakeTarget) {
      if (retakeTarget.type === "required") {
        const updated = [...requiredPhotos];
        updated[retakeTarget.index] = { ...updated[retakeTarget.index], dataUrl: finalDataUrl };
        setRequiredPhotos(updated);
      } else {
        const updated = [...extraPhotos];
        updated[retakeTarget.index] = { ...updated[retakeTarget.index], dataUrl: finalDataUrl };
        setExtraPhotos(updated);
      }
      setRetakeTarget(null);
      setScreen("review");
      return;
    }

    // Adding extra photo
    if (screen === "camera_extra") {
      const n = extraCount + 1;
      setExtraCount(n);
      setExtraPhotos((prev) => [
        ...prev,
        {
          sideId: `extra_${n}`,
          label: `Additional Photo ${n}`,
          dataUrl: finalDataUrl,
        },
      ]);
      setScreen("addmore");
      return;
    }

    // Required photo flow (license, chassis)
    if (!step) return;
    const newPhoto = { sideId: step.id, label: step.label, dataUrl: finalDataUrl };
    const updated = [...requiredPhotos];
    updated[captureIndex] = newPhoto;
    setRequiredPhotos(updated);

    if (captureIndex < REQUIRED_STEPS.length - 1) {
      setCaptureIndex((i) => i + 1);
    } else {
      setScreen("ws-camera");
    }
  };

  const handleRetakeRequired = (index) => {
    setRetakeTarget({ type: "required", index });
    setCaptureIndex(index);
    setScreen("camera_required_retake");
  };

  const handleRetakeExtra = (index) => {
    setRetakeTarget({ type: "extra", index });
    setScreen("camera_extra");
  };

  const handleDeleteExtra = (index) => {
    setExtraPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (!uniqueId) {
      alert("Missing unique_id for submission. Please open this page with a valid link.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Upload OCR for license plate + chassis (do not send these to the damage images endpoint)
      for (const photo of requiredPhotos) {
        if (!photo?.dataUrl || !photo?.sideId) continue;
        const blob = dataUrlToBlob(photo.dataUrl);
        const imageFile = new File([blob], "image.jpg", { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("unique_id", uniqueId);
        formData.append("type", photo.sideId);
        formData.append("image", imageFile);

        try {
          await uploadInspectionOcr(formData);
        } catch {
          // swallow — OCR upload should not block main flow
        }
      }

      // Upload damage images (only the 4 side photos + any optional extras)
      const formData = new FormData();
      formData.append("unique_id", uniqueId);

      wsPhotos.forEach((photo) => {
        if (!photo?.dataUrl || !photo?.sideId) return;
        const file = new File([dataUrlToBlob(photo.dataUrl)], `${photo.sideId}.jpg`, { type: "image/jpeg" });
        formData.append(photo.sideId, file);
      });

      extraPhotos.forEach((photo) => {
        if (!photo?.dataUrl) return;
        const file = new File([dataUrlToBlob(photo.dataUrl)], `${photo.sideId}.jpg`, { type: "image/jpeg" });
        formData.append('other', file);
      });

      await uploadDamageImages(formData);

      await startAssessment({ unique_id: uniqueId });
      setScreen("success");
    } catch (err) {
      console.error("Failed to submit motor claim:", err);
      alert(err?.data?.detail || err?.message || "Failed to submit claim. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetakeAll = () => {
    setRequiredPhotos([]);
    setWsPhotos([]);
    setExtraPhotos([]);
    setCaptureIndex(0);
    setExtraCount(0);
    setRetakeTarget(null);
    setScreen("camera");
  };

  const handleWsCaptured = (sidePhotos) => {
    setWsPhotos(sidePhotos);
    setScreen("addmore");
  };

  // ── Routing ──
  if (screen === "landing")    return <Landing onStart={() => setScreen("tips")} />;
  if (screen === "tips")       return <TipsScreen onNext={() => setScreen("autorotation")} />;
  if (screen === "autorotation") return <AutoRotationScreen onNext={() => setScreen("permissions")} />;
  if (screen === "permissions") return (
    <PermissionsScreen onGranted={() => { setCaptureIndex(0); setRequiredPhotos([]); setExtraPhotos([]); setScreen("camera"); }} />
  );

  if (screen === "camera" || screen === "camera_required_retake") return (
    <CameraCapture
      step={REQUIRED_STEPS[captureIndex]}
      stepIndex={captureIndex}
      totalRequired={REQUIRED_STEPS.length}
      isExtra={false}
      onCapture={handleCapture}
      onBack={() => {
        if (retakeTarget) { setRetakeTarget(null); setScreen("review"); return; }
        captureIndex === 0 ? setScreen("permissions") : setCaptureIndex(i => i - 1);
      }}
    />
  );

  if (screen === "ws-camera") return (
    <VehicleSideCapture
      userId={userId}
      uniqueId={uniqueId}
      onAllCaptured={handleWsCaptured}
      onBack={() => {
        // Return to manual license/chassis capture
        setCaptureIndex(REQUIRED_STEPS.length - 1);
        setScreen("camera");
      }}
    />
  );

  if (screen === "camera_extra") return (
    <CameraCapture
      step={null}
      stepIndex={REQUIRED_STEPS.length - 1}
      totalRequired={REQUIRED_STEPS.length}
      isExtra={true}
      extraLabel={`Additional Photo ${extraCount + (retakeTarget ? 0 : 1)}`}
      onCapture={handleCapture}
      onBack={() => { setRetakeTarget(null); setScreen(retakeTarget ? "review" : "addmore"); }}
    />
  );

  if (screen === "addmore") return (
    <AddMorePhotos
      requiredPhotos={requiredPhotos}
      wsPhotos={wsPhotos}
      extraPhotos={extraPhotos}
      onAddMore={() => setScreen("camera_extra")}
      onDeleteExtra={handleDeleteExtra}
      onRetakeSides={() => { setWsPhotos([]); setScreen("ws-camera"); }}
      onContinue={() => setScreen("review")}
    />
  );

  if (screen === "review") return (
    <ReviewSubmit
      requiredPhotos={requiredPhotos}
      wsPhotos={wsPhotos}
      extraPhotos={extraPhotos}
      onSubmit={handleSubmit}
      onRetakeSingle={handleRetakeRequired}
      onRetakeExtra={handleRetakeExtra}
      onDeleteExtra={handleDeleteExtra}
      onAddMore={() => setScreen("camera_extra")}
      onRetakeSides={() => { setWsPhotos([]); setScreen("ws-camera"); }}
      onRetakeAll={handleRetakeAll}
      isSubmitting={isSubmitting}
    />
  );

  if (screen === "success") return (
    <SuccessScreen reqId={reqId} totalPhotos={requiredPhotos.length + wsPhotos.length + extraPhotos.length} />
  );
}