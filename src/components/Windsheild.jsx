import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle, RotateCcw, ChevronRight, MapPin, Shield, AlertCircle, Check, X, ArrowLeft, Loader2, Trash2, Wind } from "lucide-react";
import { getDamageResults, uploadInspectionOcr } from "../api";
import WindShieldAssessmentResult from "../pages/WindsheildClaim";

// ─── STEPS ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "license_plate", label: "License Plate", instruction: "Position the plate clearly within the frame", aspect: "portrait" },
  { id: "chassis_no", label: "Chassis Number", instruction: "Position the chassis number within the frame", aspect: "portrait" },
  { id: "windshield_plate", label: "Windshield with Plate", instruction: "Hold landscape — capture full windshield with plate visible", aspect: "landscape" },
  { id: "windshield_damage", label: "Windshield Damage Closeup", instruction: "Move closer — fill the frame with the damaged area", aspect: "portrait" },
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
    .ws-blue { color: #1e6fa8; }
    .ws-blue-bg { background: #1e6fa8; }
    .ws-blue-border { border-color: #1e6fa8; }
    .ws-blue-light { background: #eef5fb; }
    @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
    @keyframes pulse-ring { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.12);opacity:.2} }
    @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
    @keyframes crackPulse { 0%,100%{opacity:1} 50%{opacity:.5} }
    .fade-up  { animation: fadeUp .45s ease both; }
    .fade-up-1{ animation: fadeUp .45s .1s ease both; }
    .fade-up-2{ animation: fadeUp .45s .2s ease both; }
    .fade-up-3{ animation: fadeUp .45s .3s ease both; }
    .pulse-ring-blue::before { content:''; position:absolute; inset:-8px; border-radius:inherit; border:2px solid #1e6fa8; animation:pulse-ring 2s ease-in-out infinite; }
    .shimmer-ws { background: linear-gradient(90deg,#1e6fa8 0%,#2d9be0 40%,#1e6fa8 80%); background-size:200% 100%; }
    .shimmer-ws:active { animation: shimmer 1s linear; }
    .crack-anim { animation: crackPulse 2.5s ease-in-out infinite; }
    video { display:block; }
  `}</style>
);

// ─── KFH LOGO ─────────────────────────────────────────────────────────────────
const KFHLogo = () => (
  <div className="fade-up flex items-center gap-2 mt-4">
    <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
      <path d="M19 3 L33 10.5 L33 27.5 L19 35 L5 27.5 L5 10.5 Z" fill="none" stroke="#1a8a3c" strokeWidth="2" />
      <path d="M13 19 L17 23 L25 15" stroke="#1a8a3c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className="font-syne text-xl tracking-widest" style={{ fontWeight: 800, letterSpacing: '0.15em' }}>
      <span style={{ color: '#1a8a3c' }}>KFH</span>
      <span className="text-gray-400 text-xs ml-1" style={{ fontWeight: 400, letterSpacing: '0.2em' }}>TAKAFUL</span>
    </span>
  </div>
);

// ─── WINDSHIELD SVG ICON ──────────────────────────────────────────────────────
const WindshieldIcon = ({ size = 48, color = "#1e6fa8", crack = false }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    {/* car outline */}
    <path d="M6 32 L6 22 L12 14 L36 14 L42 22 L42 32 Q42 35 39 35 L9 35 Q6 35 6 32Z"
      stroke={color} strokeWidth="2" fill="none" />
    {/* windshield glass */}
    <path d="M10 22 L14 16 L34 16 L38 22Z" fill={color} opacity="0.15" />
    <path d="M10 22 L14 16 L34 16 L38 22Z" stroke={color} strokeWidth="1.5" fill="none" />
    {/* crack */}
    {crack && (
      <path d="M22 17 L20 20 L24 22 L21 26" stroke="#e53e3e" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" className="crack-anim" />
    )}
    {/* wheels */}
    <circle cx="14" cy="35" r="4" stroke={color} strokeWidth="2" fill="none" />
    <circle cx="34" cy="35" r="4" stroke={color} strokeWidth="2" fill="none" />
  </svg>
);

// ─── STEP INDICATOR PILL ──────────────────────────────────────────────────────
const StepPill = ({ step, index, current }) => {
  const done = index < current;
  const active = index === current;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
        ${done ? 'kfh-bg text-white' : active ? 'ws-blue-bg text-white' : 'bg-gray-100 text-gray-400'}`}
        style={{ fontWeight: 700 }}>
        {done ? <Check className="w-4 h-4" /> : index + 1}
      </div>
      <span className={`text-xs text-center leading-tight max-w-14 ${active ? 'ws-blue font-semibold' : done ? 'text-gray-500' : 'text-gray-300'}`}
        style={{ fontSize: '9px', maxWidth: '52px' }}>
        {step.label}
      </span>
    </div>
  );
};

// ─── SCREEN 1: LANDING ───────────────────────────────────────────────────────
function Landing({ onStart }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-12">
      <GlobalStyle />
      <KFHLogo />

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm">
        {/* Icon */}
        <div className="fade-up-1 relative mb-8">
          <div className="w-24 h-24 rounded-full flex items-center justify-center pulse-ring-blue relative"
            style={{ background: '#eef5fb' }}>
            <WindshieldIcon size={52} color="#1e6fa8" crack={true} />
          </div>
        </div>

        {/* Badge */}
        <div className="fade-up-1 inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-4"
          style={{ background: '#eef5fb', border: '1px solid #b3d4ed' }}>
          <Wind className="w-3.5 h-3.5 ws-blue" />
          <span className="text-xs font-semibold ws-blue uppercase tracking-wide">Windshield Claim</span>
        </div>

        <h1 className="fade-up-1 font-syne text-2xl font-bold text-gray-900 text-center mb-3" style={{ fontWeight: 700 }}>
          Windshield Damage<br />Inspection
        </h1>
        <p className="fade-up-2 text-gray-500 text-center text-sm leading-relaxed mb-10">
          Capture your vehicle details and windshield damage photos to process your claim quickly
        </p>

        <div className="fade-up-2 w-full space-y-3 mb-10">
          {[
            { icon: <Camera className="w-4 h-4" style={{ color: '#1e6fa8' }} />, text: "License plate & chassis number photos" },
            { icon: <WindshieldIcon size={16} color="#1e6fa8" />, text: "Full windshield with plate visible" },
            { icon: <Camera className="w-4 h-4" style={{ color: '#1e6fa8' }} />, text: "Close-up of the damaged area" },
            { icon: <MapPin className="w-4 h-4" style={{ color: '#1e6fa8' }} />, text: "GPS location will be recorded" },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-3"
              style={{ background: '#eef5fb' }}>
              <div className="mt-0.5 flex-shrink-0">{item.icon}</div>
              <span className="text-sm text-gray-600">{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fade-up-3 w-full max-w-sm">
        <button onClick={onStart}
          className="shimmer-ws w-full text-white font-syne font-bold py-4 rounded-2xl text-base tracking-wide shadow-lg active:scale-95 transition-transform"
          style={{ fontWeight: 700 }}>
          Start Assessment
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 2: DOS & DON'TS ──────────────────────────────────────────────────
const DOS_TIPS = [
  { img: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=200&q=60", text: "Ensure good lighting — natural daylight is best" },
  { img: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=200&q=60", text: "Keep the full windshield in frame" },
  { img: "https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=200&q=60", text: "Get close enough to show crack or chip details" },
  { img: "https://images.unsplash.com/photo-1555215695-3004980ad54e?w=200&q=60", text: "Make sure the license plate is readable" },
];
const DONTS_TIPS = [
  { img: "https://images.unsplash.com/photo-1621274147744-cfb5694bb233?w=200&q=60", text: "Don't shoot with glare or reflections on glass" },
  { img: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=200&q=60", text: "Don't obscure the damage with your hand" },
  { img: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=200&q=60", text: "Don't submit blurry close-up shots" },
];

function TipsScreen({ onNext }) {
  const [page, setPage] = useState(0);
  const tips = page === 0 ? DOS_TIPS : DONTS_TIPS;

  return (
    <div className="min-h-screen bg-white flex flex-col px-6 py-10">
      <GlobalStyle />
      <div className="flex items-center justify-between mb-6 fade-up">
        <div className="flex gap-2">
          {[0, 1].map(i => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === page ? 32 : 16, background: i === page ? '#1e6fa8' : '#e2e8f0' }} />
          ))}
        </div>
        <span className="text-xs text-gray-400 font-medium">{page === 0 ? "Do's" : "Don'ts"}</span>
      </div>

      <div className="mb-6 fade-up">
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3 ${page === 0 ? 'ws-blue-light' : 'bg-red-50'}`}>
          {page === 0
            ? <Check className="w-4 h-4 ws-blue" />
            : <X className="w-4 h-4 text-red-500" />}
          <span className={`text-sm font-semibold ${page === 0 ? 'ws-blue' : 'text-red-500'}`}>
            Photo Tips – {page === 0 ? "Do's" : "Don'ts"}
          </span>
        </div>
        <p className="text-gray-500 text-sm">Follow these guidelines for the best claim results.</p>
      </div>

      <div className="flex-1 space-y-4 fade-up-1">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-3">
            <img src={tip.img} alt="" className="w-20 h-14 object-cover rounded-xl flex-shrink-0" />
            <p className="text-sm text-gray-700 font-medium leading-snug">{tip.text}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 fade-up-2">
        {page === 0 ? (
          <button onClick={() => setPage(1)}
            className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base ws-blue-bg active:scale-95 transition-transform"
            style={{ fontWeight: 700 }}>
            Next
          </button>
        ) : (
          <button onClick={onNext}
            className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base ws-blue-bg active:scale-95 transition-transform"
            style={{ fontWeight: 700 }}>
            Got It — Continue <ChevronRight className="inline w-4 h-4 ml-1" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── SCREEN 3: AUTO-ROTATION ──────────────────────────────────────────────────
function AutoRotationScreen({ onNext }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-14">
      <GlobalStyle />
      <div />
      <div className="flex flex-col items-center text-center fade-up">
        <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-8" style={{ background: '#eef5fb' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M8 20 A12 12 0 1 1 20 32" stroke="#1e6fa8" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8 26 L8 20 L14 20" stroke="#1e6fa8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="15" y="10" width="12" height="20" rx="2" stroke="#1e6fa8" strokeWidth="2" />
          </svg>
        </div>
        <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3" style={{ fontWeight: 700 }}>Turn Off Auto-Rotation</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-xs">
          Before we begin, please turn off your phone's auto-rotation feature.
        </p>
        <div className="w-full rounded-2xl px-5 py-4" style={{ background: '#eef5fb', border: '1px solid #b3d4ed' }}>
          <p className="text-sm text-gray-600 text-center leading-relaxed">
            This ensures the camera stays in the correct orientation while you take photos.
          </p>
        </div>
      </div>
      <button onClick={onNext}
        className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base ws-blue-bg active:scale-95 transition-transform"
        style={{ fontWeight: 700 }}>
        Next
      </button>
    </div>
  );
}

// ─── SCREEN 4: PERMISSIONS ────────────────────────────────────────────────────
function PermissionsScreen({ onGranted }) {
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
    <div className="min-h-screen bg-white flex flex-col items-center justify-between px-7 py-14">
      <GlobalStyle />
      <div />
      <div className="flex flex-col items-center text-center fade-up w-full max-w-sm">
        <div className="flex gap-5 mb-8">
          {[
            { icon: <Camera className="w-7 h-7 ws-blue" />, label: "Camera" },
            { icon: <MapPin className="w-7 h-7 ws-blue" />, label: "Location" },
          ].map(p => (
            <div key={p.label} className="flex-1 rounded-2xl py-6 flex flex-col items-center gap-2"
              style={{ background: '#eef5fb' }}>
              {p.icon}
              <span className="text-xs font-semibold text-gray-700">{p.label}</span>
            </div>
          ))}
        </div>
        <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3" style={{ fontWeight: 700 }}>Allow Access</h2>
        <p className="text-gray-500 text-sm leading-relaxed mb-6">
          We need camera and GPS permissions to capture and geo-tag your windshield photos.
        </p>
        {status === "error" && (
          <div className="w-full bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm text-red-600 text-left">
            <AlertCircle className="inline w-4 h-4 mr-1 mb-0.5" />{errorMsg}
          </div>
        )}
        {status === "requesting" && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Requesting permissions…
          </div>
        )}
      </div>
      <button onClick={request} disabled={status === "requesting"}
        className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base ws-blue-bg active:scale-95 transition-transform disabled:opacity-60"
        style={{ fontWeight: 700 }}>
        Grant Permissions
      </button>
    </div>
  );
}

// ─── SCREEN 5: CAMERA CAPTURE ────────────────────────────────────────────────
function CameraCapture({ step, stepIndex, onCapture, onBack }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  const [streamReady, setStreamReady] = useState(false);
  const [streamObj, setStreamObj] = useState(null);

  const needsLandscape = true; // All photos require landscape mode
  const isCloseup = step.id === "windshield_damage";

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
    const ctx = c.getContext("2d");

    // Rotate 90 degrees anticlockwise: swap width/height and rotate
    c.width = v.videoHeight;
    c.height = v.videoWidth;

    // Save context state
    ctx.save();

    // Translate and rotate for 90 degrees anticlockwise
    ctx.translate(0, c.height);
    ctx.rotate(-Math.PI / 2);

    // Draw the rotated image
    ctx.drawImage(v, 0, 0, v.videoWidth, v.videoHeight);

    // Restore context state
    ctx.restore();

    const dataUrl = c.toDataURL("image/jpeg", 0.9);
    streamObj?.getTracks().forEach(t => t.stop());
    onCapture(dataUrl);
  };

  const orientationOk = !needsLandscape || isLandscape;

  return (
    <div className="h-screen bg-black flex flex-col relative overflow-hidden">
      <GlobalStyle />
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent px-5 pt-5 pb-10">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <span className="text-white font-syne font-bold text-base flex-1" style={{ fontWeight: 700 }}>{step.label}</span>
          <span className="text-white/50 text-xs">{stepIndex + 1}/{STEPS.length}</span>
        </div>

        {/* Step pills */}
        <div className="flex items-start justify-between gap-1 px-1">
          {STEPS.map((s, i) => (
            <StepPill key={s.id} step={s} index={i} current={stepIndex} />
          ))}
        </div>
      </div>

      {/* Orientation warning */}
      {!orientationOk && (
        <div className="absolute inset-0 z-20 bg-black/85 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(30,111,168,0.2)' }}>
            <RotateCcw className="w-8 h-8" style={{ color: '#7ec8f0' }} />
          </div>
          <h3 className="font-syne text-white text-xl font-bold mb-2" style={{ fontWeight: 700 }}>Rotate to Landscape</h3>
          <p className="text-white/60 text-sm">Hold your phone horizontally to capture the photo</p>
        </div>
      )}

      {/* Frame guide — different shape for closeup vs wide */}
      {orientationOk && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isCloseup ? (
            /* Closeup: tight portrait frame with crosshair */
            <div className="relative border-2 rounded-2xl flex items-center justify-center"
              style={{ width: '70%', height: '55%', borderColor: 'rgba(30,111,168,0.6)' }}>
              {/* Corner marks */}
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  width: 20, height: 20,
                  top: i < 2 ? -1 : 'auto', bottom: i >= 2 ? -1 : 'auto',
                  left: i % 2 === 0 ? -1 : 'auto', right: i % 2 === 1 ? -1 : 'auto',
                  borderTop: i < 2 ? '2px solid #2d9be0' : 'none',
                  borderBottom: i >= 2 ? '2px solid #2d9be0' : 'none',
                  borderLeft: i % 2 === 0 ? '2px solid #2d9be0' : 'none',
                  borderRight: i % 2 === 1 ? '2px solid #2d9be0' : 'none',
                }} />
              ))}
              {/* Crosshair dot */}
              <div className="w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(45,155,224,0.3)', border: '2px solid #2d9be0' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#2d9be0' }} />
              </div>
            </div>
          ) : needsLandscape ? (
            /* Wide windshield frame — trapezoidal hint */
            <div className="relative border-2 rounded-2xl"
              style={{ width: '88%', height: '52%', borderColor: 'rgba(30,111,168,0.6)' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  width: 20, height: 20,
                  top: i < 2 ? -1 : 'auto', bottom: i >= 2 ? -1 : 'auto',
                  left: i % 2 === 0 ? -1 : 'auto', right: i % 2 === 1 ? -1 : 'auto',
                  borderTop: i < 2 ? '2px solid #2d9be0' : 'none',
                  borderBottom: i >= 2 ? '2px solid #2d9be0' : 'none',
                  borderLeft: i % 2 === 0 ? '2px solid #2d9be0' : 'none',
                  borderRight: i % 2 === 1 ? '2px solid #2d9be0' : 'none',
                }} />
              ))}
              {/* Plate tag reminder */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-white/10 rounded-lg px-2 py-1 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-white text-xs">Plate must be visible</span>
              </div>
            </div>
          ) : (
            /* Standard portrait frame */
            <div className="relative border-2 rounded-2xl"
              style={{ width: '65%', height: '65%', borderColor: 'rgba(30,111,168,0.6)' }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{
                  position: 'absolute',
                  width: 20, height: 20,
                  top: i < 2 ? -1 : 'auto', bottom: i >= 2 ? -1 : 'auto',
                  left: i % 2 === 0 ? -1 : 'auto', right: i % 2 === 1 ? -1 : 'auto',
                  borderTop: i < 2 ? '2px solid #2d9be0' : 'none',
                  borderBottom: i >= 2 ? '2px solid #2d9be0' : 'none',
                  borderLeft: i % 2 === 0 ? '2px solid #2d9be0' : 'none',
                  borderRight: i % 2 === 1 ? '2px solid #2d9be0' : 'none',
                }} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Closeup tip banner */}
      {isCloseup && orientationOk && (
        <div className="absolute top-1/4 left-4 right-4 z-10 flex items-center gap-2 bg-blue-900/60 backdrop-blur-sm rounded-xl px-3 py-2">
          <WindshieldIcon size={18} color="#7ec8f0" crack={true} />
          <span className="text-blue-100 text-xs">Move in close — fill frame with the crack or chip</span>
        </div>
      )}

      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/80 to-transparent px-5 pt-8 pb-8">
        <p className="text-white/70 text-xs text-center mb-4">{step.instruction}</p>
        <button onClick={capture} disabled={!streamReady || !orientationOk}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 active:scale-95 transition-transform ws-blue-bg"
          style={{ fontWeight: 700 }}>
          <Camera className="w-4 h-4" />
          Capture {step.label} ({stepIndex + 1}/{STEPS.length})
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 6: REVIEW & SUBMIT ────────────────────────────────────────────────
function ReviewSubmit({ photos, onSubmit, onRetakeSingle, onRetakeAll, isSubmitting }) {
  // Separate windshield steps for visual grouping
  const docPhotos = photos.filter(p => p.sideId === "license_plate" || p.sideId === "chassis_no");
  const wsPhotos = photos.filter(p => p.sideId === "windshield_plate" || p.sideId === "windshield_damage");

  const PhotoCard = ({ photo, index }) => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <span className="font-semibold text-gray-800 text-sm block">{photo.label}</span>
          {(photo.sideId === "windshield_plate" || photo.sideId === "windshield_damage") && (
            <span className="text-xs" style={{ color: '#1e6fa8' }}>Windshield</span>
          )}
        </div>
        <button onClick={() => onRetakeSingle(index)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white ws-blue-bg active:scale-95 transition-transform">
          <RotateCcw className="w-3 h-3" /> Retake
        </button>
      </div>
      <div className="mx-4 mb-4 rounded-xl overflow-hidden aspect-video bg-black"
        style={{ border: (photo.sideId === "windshield_plate" || photo.sideId === "windshield_damage") ? '2px solid #1e6fa8' : '2px solid #1a8a3c' }}>
        <img src={photo.dataUrl} alt={photo.label} className="w-full h-full object-contain" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <GlobalStyle />

      <div className="bg-white px-6 pt-10 pb-6 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ws-blue-bg">
          <CheckCircle className="w-7 h-7 text-white" />
        </div>
        <h2 className="font-syne text-xl font-bold text-gray-900 mb-1" style={{ fontWeight: 700 }}>Review Your Photos</h2>
        <p className="text-gray-500 text-sm">Ensure all photos are clear before submitting</p>
      </div>

      <div className="px-5 mt-5 space-y-4">
        {/* Vehicle Documents */}
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Vehicle Documents</p>
        {docPhotos.map((photo) => (
          <PhotoCard key={photo.sideId} photo={photo} index={photos.findIndex(p => p.sideId === photo.sideId)} />
        ))}

        {/* Windshield Photos */}
        <div className="flex items-center gap-2 mt-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest">Windshield Photos</p>
          <WindshieldIcon size={14} color="#1e6fa8" crack={true} />
        </div>
        {wsPhotos.map((photo) => (
          <PhotoCard key={photo.sideId} photo={photo} index={photos.findIndex(p => p.sideId === photo.sideId)} />
        ))}
      </div>

      <div className="px-5 mt-6 space-y-3">
        <button onClick={onSubmit} disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-white font-syne font-bold text-base ws-blue-bg active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          style={{ fontWeight: 700 }}>
          {isSubmitting ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting…</> : 'Submit Claim'}
        </button>
        <button onClick={onRetakeAll} disabled={isSubmitting}
          className="w-full py-4 rounded-2xl text-gray-700 font-syne font-semibold text-base bg-white border border-gray-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
          style={{ fontWeight: 600 }}>
          <RotateCcw className="w-4 h-4" /> Retake All Photos
        </button>
      </div>
    </div>
  );
}

// ─── SCREEN 7: SUCCESS ────────────────────────────────────────────────────────
function SuccessScreen({ reqId }) {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-7 text-center">
      <GlobalStyle />
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6 fade-up ws-blue-bg">
        <Check className="w-10 h-10 text-white" />
      </div>
      <h2 className="font-syne text-2xl font-bold text-gray-900 mb-3 fade-up-1" style={{ fontWeight: 700 }}>Submission Successful</h2>
      <p className="text-gray-500 text-sm leading-relaxed mb-8 fade-up-1">
        Your claim has been submitted successfully. Our team will review and contact you shortly.
      </p>
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
export default function WindshieldClaim() {
  const [screen, setScreen] = useState("landing");
  const [captureIndex, setCaptureIndex] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [retakeIndex, setRetakeIndex] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reqId] = useState(() => "WS-" + Date.now().toString(36).toUpperCase());

  // Results state
  const [inspectionId, setInspectionId] = useState(null);
  const [damageResults, setDamageResults] = useState(null);
  const [resultsLoading, setResultsLoading] = useState(false);
  const [resultsError, setResultsError] = useState(null);
  const [ocrData, setOcrData] = useState(null);

  const handleCapture = (dataUrl) => {
    const idx = retakeIndex !== null ? retakeIndex : captureIndex;
    const step = STEPS[idx];
    const newPhoto = { sideId: step.id, label: step.label, dataUrl };

    if (retakeIndex !== null) {
      const updated = [...photos];
      updated[retakeIndex] = newPhoto;
      setPhotos(updated);
      setRetakeIndex(null);
      setScreen("review");
      return;
    }

    const updated = [...photos];
    updated[captureIndex] = newPhoto;
    setPhotos(updated);

    if (captureIndex < STEPS.length - 1) {
      setCaptureIndex(i => i + 1);
    } else {
      setScreen("review");
    }
  };

  const handleRetakeSingle = (index) => {
    setRetakeIndex(index);
    setCaptureIndex(index);
    setScreen("camera");
  };

  const handleRetakeAll = () => {
    setPhotos([]);
    setCaptureIndex(0);
    setRetakeIndex(null);
    setScreen("camera");
  };

  // Helper: convert dataUrl to Blob
  const dataUrlToBlob = (dataUrl) => {
    const [header, data] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)[1];
    const bytes = atob(data);
    const arr = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
    return new Blob([arr], { type: mime });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setResultsLoading(true);
    setResultsError(null);
    setDamageResults(null);
    setOcrData(null);

    try {
      // Upload all photos via OCR endpoint
      // Get unique_id from URL search params if available
      const urlParams = new URLSearchParams(window.location.search);
      const uniqueId = urlParams.get('unique_id') || urlParams.get('id') || '';

      let uploadedId = inspectionId;

      for (const photo of photos) {
        if (!photo?.dataUrl) continue;
        const blob = dataUrlToBlob(photo.dataUrl);
        const imageFile = new File([blob], `${photo.sideId}.jpg`, { type: "image/jpeg" });

        const formData = new FormData();
        if (uniqueId) formData.append("unique_id", uniqueId);
        formData.append("type", photo.sideId);
        formData.append("image", imageFile);

        try {
          const res = await uploadInspectionOcr(formData);
          // Capture the inspection ID from upload response if available
          if (res?.id && !uploadedId) {
            uploadedId = res.id;
            setInspectionId(res.id);
          }
          if (res?.inspection_id && !uploadedId) {
            uploadedId = res.inspection_id;
            setInspectionId(res.inspection_id);
          }
        } catch {
          // swallow — individual upload failures shouldn't block the flow
        }
      }

      // Fetch damage results if we have an inspection ID
      if (uploadedId) {
        try {
          const results = await getDamageResults(uploadedId);
          setDamageResults(results);
          // Also set the results as ocrData for the WindShieldAssessmentResult component
          if (Array.isArray(results)) {
            setOcrData(results);
          }
        } catch (err) {
          console.error('Failed to fetch damage results:', err);
          setResultsError(err?.message || 'Failed to fetch assessment results');
        }
      }
    } catch (err) {
      console.error('Submit error:', err);
      setResultsError(err?.message || 'Submission failed');
    } finally {
      setResultsLoading(false);
      setIsSubmitting(false);
      setScreen("results");
    }
  };

  if (screen === "landing") return <Landing onStart={() => setScreen("tips")} />;
  if (screen === "tips") return <TipsScreen onNext={() => setScreen("autorotation")} />;
  if (screen === "autorotation") return <AutoRotationScreen onNext={() => setScreen("permissions")} />;
  if (screen === "permissions") return (
    <PermissionsScreen onGranted={() => { setCaptureIndex(0); setPhotos([]); setScreen("camera"); }} />
  );
  if (screen === "camera") return (
    <CameraCapture
      step={STEPS[captureIndex]}
      stepIndex={captureIndex}
      onCapture={handleCapture}
      onBack={() => {
        if (retakeIndex !== null) { setRetakeIndex(null); setScreen("review"); return; }
        captureIndex === 0 ? setScreen("permissions") : setCaptureIndex(i => i - 1);
      }}
    />
  );
  if (screen === "review") return (
    <ReviewSubmit
      photos={photos}
      onSubmit={handleSubmit}
      onRetakeSingle={handleRetakeSingle}
      onRetakeAll={handleRetakeAll}
      isSubmitting={isSubmitting}
    />
  );
  if (screen === "results") return (
    <WindShieldAssessmentResult
      inspectionRow={{
        name: "—",
        email: "—",
        policy: "—",
        status: "Submitted",
        damage: damageResults?.damage_level || damageResults?.damage || null,
      }}
      ocrData={ocrData}
      windshieldData={damageResults}
      ocrLoading={resultsLoading}
      ocrError={resultsError}
      onBack={() => setScreen("review")}
    />
  );
}