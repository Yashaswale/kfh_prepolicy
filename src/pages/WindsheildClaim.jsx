import { useState, useRef, useEffect } from "react";

// ─── Canvas Image Editor Modal ────────────────────────────────────────────────
function ImageEditorModal({ imageUrl, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pen");
  const [color, setColor] = useState("#ef4444");
  const [lineWidth, setLineWidth] = useState(3);
  const [history, setHistory] = useState([]);
  const lastPos = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      canvas.width = img.naturalWidth || 700;
      canvas.height = img.naturalHeight || 400;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory([canvas.toDataURL()]);
    };
  }, [imageUrl]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = getPos(e);
  };

  const draw = (e) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e);

    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    } else if (tool === "rect") {
      // handled on mouseup
      lastPos.current = lastPos.current;
      return;
    }

    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = (e) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    setHistory((h) => [...h, canvas.toDataURL()]);
    lastPos.current = null;
  };

  const undo = () => {
    if (history.length <= 1) return;
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.src = newHistory[newHistory.length - 1];
    img.onload = () => ctx.drawImage(img, 0, 0);
  };

  const handleSave = () => {
    onSave(canvasRef.current.toDataURL());
    onClose();
  };

  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ffffff", "#000000"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
      <div className="flex flex-col bg-gray-950 rounded-2xl overflow-hidden shadow-2xl w-full max-w-4xl mx-4" style={{ fontFamily: "'DM Sans', sans-serif" }}>
        {/* Toolbar */}
        <div className="flex items-center gap-3 px-5 py-3 bg-gray-900 border-b border-gray-800 flex-wrap">
          <span className="text-white font-semibold text-sm mr-2">Edit Result</span>

          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {[
              { id: "pen", icon: "✏️", label: "Draw" },
              { id: "eraser", icon: "🧹", label: "Erase" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTool(t.id)}
                title={t.label}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${tool === t.id ? "bg-green-600 text-white" : "text-gray-400 hover:text-white"}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => { setColor(c); setTool("pen"); }}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${color === c && tool === "pen" ? "border-white scale-110" : "border-transparent"}`}
                style={{ backgroundColor: c }}
              />
            ))}
            <input type="color" value={color} onChange={(e) => { setColor(e.target.value); setTool("pen"); }}
              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent" title="Custom color" />
          </div>

          {/* Line width */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Size</span>
            <input type="range" min={1} max={20} value={lineWidth} onChange={(e) => setLineWidth(+e.target.value)}
              className="w-20 accent-green-500" />
            <span className="text-gray-400 text-xs w-4">{lineWidth}</span>
          </div>

          <button onClick={undo} className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors">
            ↩ Undo
          </button>
        </div>

        {/* Canvas */}
        <div className="overflow-auto bg-gray-950 p-4 max-h-[60vh] flex items-center justify-center">
          <canvas
            ref={canvasRef}
            className="rounded-lg max-w-full"
            style={{ cursor: tool === "eraser" ? "cell" : "crosshair", display: "block" }}
            onMouseDown={startDraw}
            onMouseMove={draw}
            onMouseUp={endDraw}
            onMouseLeave={endDraw}
            onTouchStart={startDraw}
            onTouchMove={draw}
            onTouchEnd={endDraw}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 bg-gray-900 border-t border-gray-800">
          <button onClick={onClose} className="px-5 py-2 rounded-xl text-sm font-medium text-gray-400 border border-gray-700 hover:bg-gray-800 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-green-600 hover:bg-green-700 transition-colors">
            Save Changes
          </button>
        </div>
      </div>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
    </div>
  );
}

// ─── Field Row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, value, wide }) {
  return (
    <div className={`flex items-center gap-4 ${wide ? "col-span-2" : ""}`}>
      <span className="text-sm font-medium text-gray-600 w-40 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-800 min-h-[40px]">
        {value || <span className="text-gray-400">—</span>}
      </div>
    </div>
  );
}

// ─── Section Card ──────────────────────────────────────────────────────────────
function SectionCard({ title, children }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 mb-6">
      {title && <h2 className="text-base font-bold text-gray-900 uppercase tracking-widest mb-6 pb-3 border-b border-gray-100">{title}</h2>}
      {children}
    </div>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────
function FieldSkeleton() {
  return (
    <div className="flex items-center gap-4 animate-pulse">
      <div className="w-40 h-4 bg-gray-200 rounded shrink-0" />
      <div className="flex-1 h-10 bg-gray-100 rounded-lg" />
    </div>
  );
}

function ImageSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-gray-100 mb-4 aspect-video flex items-center justify-center animate-pulse">
      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
      </svg>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WindShieldAssessmentResult({ inspectionRow, ocrData, ocrLoading, ocrError, onBack }) {
  const [editingImage, setEditingImage] = useState(null);
  const [editedAiImage, setEditedAiImage] = useState(null);
  const printRef = useRef(null);

  const handleExportPDF = () => {
    window.print();
  };

  const handleSaveEdit = (dataUrl) => {
    setEditedAiImage(dataUrl);
  };

  // Extract data from props — inspectionRow has customer/row info, ocrData has OCR results
  const customerName = inspectionRow?.name || "—";
  const customerEmail = inspectionRow?.email || "—";
  const policyNumber = inspectionRow?.policy || "—";

  // ── Parse OCR array response ──────────────────────────────────────────────────
  // API returns: [{ id, type, image, detected_text, created_at }, ...]
  // `type` values: "license_plate", "chassis_no", "windshield_plate", "windshield_damage", etc.
  const IMAGE_BASE = "https://api.dezzex.ae";

  const ocrEntries = Array.isArray(ocrData) ? ocrData : [];

  // Find the LATEST entry for each type (last match wins, in case of duplicates)
  const findEntry = (type) => {
    const matches = ocrEntries.filter((e) => e.type === type);
    return matches.length > 0 ? matches[matches.length - 1] : null;
  };

  const licensePlateEntry = findEntry("license_plate");
  const chassisEntry = findEntry("chassis_no");
  const windshieldPlateEntry = findEntry("windshield_plate");
  const windshieldDamageEntry = findEntry("windshield_damage");

  const buildImageUrl = (entry) => {
    if (!entry?.image) return null;
    // If already absolute, use as-is; otherwise prepend base URL
    if (entry.image.startsWith("http")) return entry.image;
    return `${IMAGE_BASE}${entry.image}`;
  };

  const licensePlateText = licensePlateEntry?.detected_text || "—";
  const chassisNumberText = chassisEntry?.detected_text || "—";
  const licensePlateImage = buildImageUrl(licensePlateEntry);
  const chassisImage = buildImageUrl(chassisEntry);
  const windshieldOriginal = buildImageUrl(windshieldPlateEntry);
  const windshieldAi = buildImageUrl(windshieldDamageEntry);
  const windshieldDamageText = windshieldDamageEntry?.detected_text || null;

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap');
        @media print {
          .no-print { display: none !important; }
          body { background: white; }
          .print-page { padding: 0 !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30 no-print">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-xl hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </button>

          <h1 className="text-sm font-bold tracking-widest uppercase text-gray-800">
            Wind Shield Assessment Result
          </h1>

          <button
            onClick={handleExportPDF}
            className="no-print flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-green-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export As PDF
          </button>
        </div>
      </div>

      {/* Content */}
      <div ref={printRef} className="max-w-6xl mx-auto px-6 py-8 print-page">

        {/* Error banner */}
        {ocrError && (
          <div className="bg-red-50 border border-red-200 rounded-2xl px-6 py-4 mb-6 text-sm text-red-700 flex items-center gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            {ocrError}
          </div>
        )}

        {/* Customer Details */}
        <SectionCard title="Customer Details">
          {ocrLoading ? (
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              {Array.from({ length: 4 }).map((_, i) => <FieldSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-12 gap-y-4">
              <FieldRow label="Full Name" value={customerName} />
              <FieldRow label="Email Address" value={customerEmail} />
              <FieldRow label="Policy No." value={policyNumber} />
              <FieldRow label="Status" value={inspectionRow?.status || "—"} />
            </div>
          )}
        </SectionCard>

        {/* License & Chassis */}
        <SectionCard>
          {ocrLoading ? (
            <div className="grid grid-cols-2 gap-10">
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded mb-3 animate-pulse" />
                <ImageSkeleton />
                <FieldSkeleton />
              </div>
              <div>
                <div className="h-5 w-32 bg-gray-200 rounded mb-3 animate-pulse" />
                <ImageSkeleton />
                <FieldSkeleton />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-10">
              {/* License */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">License Number</h3>
                <div className="rounded-xl overflow-hidden bg-gray-100 mb-4 aspect-video">
                  {licensePlateImage ? (
                    <img src={licensePlateImage} alt="License plate" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                </div>
                <FieldRow label="License Number" value={licensePlateText} />
              </div>

              {/* Chassis */}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-3">Chassis Number</h3>
                <div className="rounded-xl overflow-hidden bg-gray-100 mb-4 aspect-video">
                  {chassisImage ? (
                    <img src={chassisImage} alt="Chassis number" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                </div>
                <FieldRow label="Chassis Number" value={chassisNumberText} />
              </div>
            </div>
          )}
        </SectionCard>

        {/* Wind Shield Section */}
        <SectionCard>
          <h3 className="text-sm font-bold text-gray-900 mb-4">Wind Shield</h3>

          {ocrLoading ? (
            <div className="grid grid-cols-2 gap-6 mb-6">
              <ImageSkeleton />
              <ImageSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-6 mb-6">
              {/* Original */}
              <div>
                <div className="rounded-xl overflow-hidden relative bg-gray-100 aspect-video">
                  {windshieldOriginal ? (
                    <img src={windshieldOriginal} alt="Original windshield" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-4 py-2">
                    <span className="text-white text-xs font-medium">Original Image</span>
                  </div>
                </div>
              </div>

              {/* Windshield Damage */}
              <div>
                <div className="rounded-xl overflow-hidden relative bg-gray-100 aspect-video group">
                  {editedAiImage ? (
                    <img src={editedAiImage} alt="AI result edited" className="w-full h-full object-cover" />
                  ) : windshieldAi ? (
                    <img src={windshieldAi} alt="Windshield damage" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <svg className="w-12 h-12" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}

                  <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-4 py-2 flex items-center justify-between">
                    <span className="text-white text-xs font-medium">Windshield Damage</span>
                    {(windshieldAi || editedAiImage) && (
                      <button
                        onClick={() => setEditingImage(windshieldAi)}
                        className="no-print flex items-center gap-1.5 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg transition-colors"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                        Edit Result
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detected text from windshield damage if available */}
          {!ocrLoading && windshieldDamageText && (
            <div className="mt-4">
              <FieldRow label="Damage Detection" value={windshieldDamageText} />
            </div>
          )}

          {/* Damage details from inspection row */}
          {!ocrLoading && inspectionRow?.damage && (
            <div className="grid grid-cols-2 gap-10 mt-4">
              <div>
                <p className="text-sm font-bold text-gray-900 mb-2">Damage Level</p>
                <div className="bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-800 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full inline-block ${inspectionRow.damage === "Major Damage" ? "bg-red-500" :
                    inspectionRow.damage === "Minor Damage" ? "bg-orange-400" : "bg-gray-400"
                    }`} />
                  {inspectionRow.damage}
                </div>
              </div>
            </div>
          )}
        </SectionCard>

      </div>

      {/* Editor Modal */}
      {editingImage && (
        <ImageEditorModal
          imageUrl={editingImage}
          onClose={() => setEditingImage(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}