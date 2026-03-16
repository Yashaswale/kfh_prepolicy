import { useState, useRef, useEffect } from "react";
import { editInspectionOcr, editDamageAi } from "../api";

// ─── Canvas Image Editor Modal ────────────────────────────────────────────────
function ImageEditorModal({ imageUrl, onClose, onSave }) {
    const canvasRef = useRef(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState("pen");
    const [color, setColor] = useState("#ef4444");
    const [lineWidth, setLineWidth] = useState(3);
    const [history, setHistory] = useState([]);
    const [imageLoaded, setImageLoaded] = useState(false);
    const lastPos = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");

        // Proxy media URLs through Vite dev server to bypass CORS
        const proxyUrl = imageUrl.replace('https://api.dezzex.ae/media/', '/media/');

        // Set initial canvas size so it's visible
        canvas.width = 700;
        canvas.height = 400;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, 700, 400);
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Loading image...', 350, 200);

        // Fetch image as blob to bypass CORS restrictions
        fetch(proxyUrl)
            .then(res => res.blob())
            .then(blob => {
                const objectUrl = URL.createObjectURL(blob);
                const img = new Image();
                img.onload = () => {
                    canvas.width = img.naturalWidth || 700;
                    canvas.height = img.naturalHeight || 400;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    setHistory([canvas.toDataURL()]);
                    setImageLoaded(true);
                    URL.revokeObjectURL(objectUrl);
                };
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl);
                    loadFallback();
                };
                img.src = objectUrl;
            })
            .catch(() => {
                loadFallback();
            });

        function loadFallback() {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
                canvas.width = img.naturalWidth || 700;
                canvas.height = img.naturalHeight || 400;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                setHistory([canvas.toDataURL()]);
                setImageLoaded(true);
            };
            img.onerror = () => {
                ctx.fillStyle = '#333';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                ctx.fillStyle = '#f44';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Failed to load image', canvas.width / 2, canvas.height / 2);
            };
            img.src = proxyUrl;
        }
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

// ─── Fullscreen Image Viewer Modal ─────────────────────────────────────────────
function FullscreenImageModal({ imageUrl, label, onClose }) {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center" onClick={onClose}>
            <button
                onClick={onClose}
                className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
            </button>
            {label && (
                <div className="absolute top-5 left-5 bg-black/60 px-4 py-2 rounded-xl">
                    <span className="text-white text-sm font-semibold">{label}</span>
                </div>
            )}
            <img
                src={imageUrl}
                alt={label || "Full screen"}
                className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg"
                onClick={(e) => e.stopPropagation()}
            />
        </div>
    );
}

// ─── Field Row ────────────────────────────────────────────────────────────────────
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

// ─── Editable Field Row (with inline edit + API save) ────────────────────────────
function EditableFieldRow({ label, value, mediaId, onSaved }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value || "");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const inputRef = useRef(null);

    useEffect(() => {
        if (isEditing && inputRef.current) inputRef.current.focus();
    }, [isEditing]);

    const handleSave = async () => {
        if (!mediaId) return;
        setSaving(true);
        setError("");
        try {
            await editInspectionOcr(mediaId, editValue);
            setIsEditing(false);
            if (onSaved) onSaved(editValue);
        } catch (err) {
            setError(err?.message || "Failed to save");
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditValue(value || "");
        setIsEditing(false);
        setError("");
    };

    if (!isEditing) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-600 w-40 shrink-0">{label}</span>
                <div className="flex-1 bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-800 min-h-[40px] flex items-center justify-between">
                    <span>{editValue || value || <span className="text-gray-400">—</span>}</span>
                    {mediaId && (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="no-print ml-2 p-1 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                            title="Edit"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-4">
            <span className="text-sm font-medium text-gray-600 w-40 shrink-0 mt-2.5">{label}</span>
            <div className="flex-1">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") handleCancel(); }}
                        className="flex-1 border border-green-300 focus:border-green-500 focus:ring-2 focus:ring-green-100 rounded-lg px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
                        disabled={saving}
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                        {saving ? (
                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                        ) : 'Save'}
                    </button>
                    <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-3 py-2 rounded-lg text-xs font-medium text-gray-500 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
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
export default function PrePolicyAssessmentResult({ inspectionRow, ocrData, damageData, ocrLoading, ocrError, onBack }) {
    const [editingImage, setEditingImage] = useState(null);
    const [editedAiImage, setEditedAiImage] = useState(null);
    const [editedDamageImages, setEditedDamageImages] = useState({});
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const printRef = useRef(null);

    const handleExportPDF = () => {
        window.print();
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

    const handleSaveEdit = async (dataUrl) => {
        // Update local state immediately
        if (editingImage?.damageIndex !== undefined) {
            setEditedDamageImages(prev => ({ ...prev, [editingImage.damageIndex]: dataUrl }));
        } else {
            setEditedAiImage(dataUrl);
        }

        // Call the edit-damage-ai API
        const mediaId = editingImage?.mediaId;
        if (mediaId) {
            setSavingEdit(true);
            try {
                const blob = dataUrlToBlob(dataUrl);
                const imageFile = new File([blob], 'edited_damage.jpg', { type: 'image/jpeg' });
                const formData = new FormData();
                formData.append('ai_image', imageFile);
                formData.append('ai_result', editingImage?.aiResult || '');
                await editDamageAi(mediaId, formData);
                console.log('[PrePolicy] editDamageAi success for mediaId:', mediaId);
            } catch (err) {
                console.error('[PrePolicy] editDamageAi error:', err);
            } finally {
                setSavingEdit(false);
            }
        }
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
        if (entry.image.startsWith("http")) return entry.image;
        return `${IMAGE_BASE}${entry.image}`;
    };

    // Helper to build full URL from relative paths (for damage results)
    const buildUrl = (path) => {
        if (!path) return null;
        if (path.startsWith("http")) return path;
        return `${IMAGE_BASE}${path}`;
    };

    // Parse damage data
    const damageEntries = Array.isArray(damageData) ? damageData : [];
    const SIDE_LABELS = { front: "Front", rear: "Rear", left: "Left Side", right: "Right Side" };

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
                        Pre-Policy Assessment Result
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
                                <div className="rounded-xl overflow-hidden bg-gray-100 mb-4 aspect-video cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                                    onClick={() => licensePlateImage && setFullscreenImage({ url: licensePlateImage, label: 'License Plate' })}>
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
                                <EditableFieldRow
                                    label="License Number"
                                    value={licensePlateText}
                                    mediaId={licensePlateEntry?.id}
                                />
                            </div>

                            {/* Chassis */}
                            <div>
                                <h3 className="text-sm font-bold text-gray-900 mb-3">Chassis Number</h3>
                                <div className="rounded-xl overflow-hidden bg-gray-100 mb-4 aspect-video cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                                    onClick={() => chassisImage && setFullscreenImage({ url: chassisImage, label: 'Chassis Number' })}>
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
                                <EditableFieldRow
                                    label="Chassis Number"
                                    value={chassisNumberText}
                                    mediaId={chassisEntry?.id}
                                />
                            </div>
                        </div>
                    )}
                </SectionCard>



                {/* AI Damage Inspection Results */}
                {damageEntries.length > 0 && (
                    <SectionCard title="AI Damage Inspection">
                        <div className="space-y-8">
                            {damageEntries.map((entry, idx) => {
                                const originalUrl = buildUrl(entry.original_image);
                                const aiUrl = editedDamageImages[idx] || buildUrl(entry.ai_image);
                                const aiResult = entry.ai_result || {};
                                const parts = Object.entries(aiResult);
                                const hasDamage = parts.some(([, damages]) => Array.isArray(damages) && damages.length > 0);
                                const sideLabel = SIDE_LABELS[entry.type] || entry.type;

                                return (
                                    <div key={entry.id || idx} className="border border-gray-100 rounded-2xl p-5">
                                        {/* Side header */}
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${hasDamage ? 'bg-red-500' : 'bg-green-500'
                                                    }`}>
                                                    {sideLabel.charAt(0)}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-gray-900">{sideLabel}</h4>
                                                    <span className={`text-xs font-semibold ${hasDamage ? 'text-red-500' : 'text-green-600'
                                                        }`}>
                                                        {hasDamage ? '⚠ Damage Detected' : '✓ No Damage'}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                                            </span>
                                        </div>

                                        {/* Original & AI Images side by side */}
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div>
                                                <div className="rounded-xl overflow-hidden relative bg-gray-100 aspect-video cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                                                    onClick={() => originalUrl && setFullscreenImage({ url: originalUrl, label: `${sideLabel} — Original` })}>
                                                    {originalUrl ? (
                                                        <img src={originalUrl} alt={`${sideLabel} original`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-3 py-1.5">
                                                        <span className="text-white text-xs font-medium">Original</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div>
                                                <div className="rounded-xl overflow-hidden relative bg-gray-100 aspect-video group cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                                                    onClick={() => aiUrl && setFullscreenImage({ url: aiUrl, label: `${sideLabel} — AI Analysis` })}>
                                                    {aiUrl ? (
                                                        <img src={aiUrl} alt={`${sideLabel} AI`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                                                            </svg>
                                                        </div>
                                                    )}
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-3 py-1.5 flex items-center justify-between">
                                                        <span className="text-white text-xs font-medium">AI Analysis</span>
                                                        {aiUrl && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setEditingImage({ url: buildUrl(entry.ai_image), damageIndex: idx, mediaId: entry.id, aiResult: JSON.stringify(entry.ai_result || {}) }); }}
                                                                className="no-print flex items-center gap-1 px-2 py-0.5 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-md transition-colors"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Part-by-part breakdown table */}
                                        {parts.length > 0 && (
                                            <div className="rounded-xl border border-gray-100 overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="bg-gray-50 border-b border-gray-100">
                                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Part</th>
                                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Status</th>
                                                            <th className="text-left px-4 py-2.5 font-semibold text-gray-700 text-xs uppercase tracking-wider">Details</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {parts.map(([partName, damages], pi) => {
                                                            const partHasDamage = Array.isArray(damages) && damages.length > 0;
                                                            return (
                                                                <tr key={pi} className="border-b border-gray-50 last:border-b-0">
                                                                    <td className="px-4 py-2.5 text-gray-800 font-medium capitalize">{partName}</td>
                                                                    <td className="px-4 py-2.5">
                                                                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${partHasDamage
                                                                            ? 'bg-red-50 text-red-600 border border-red-200'
                                                                            : 'bg-green-50 text-green-600 border border-green-200'
                                                                            }`}>
                                                                            <span className={`w-1.5 h-1.5 rounded-full ${partHasDamage ? 'bg-red-500' : 'bg-green-500'
                                                                                }`} />
                                                                            {partHasDamage ? 'Damaged' : 'OK'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-2.5 text-gray-500 text-xs">
                                                                        {partHasDamage
                                                                            ? damages.map((d, di) => (
                                                                                <span key={di} className="inline-block bg-red-50 text-red-600 px-2 py-0.5 rounded mr-1 mb-0.5">
                                                                                    {typeof d === 'string' ? d : d.type || d.label || JSON.stringify(d)}
                                                                                </span>
                                                                            ))
                                                                            : <span className="text-green-600">No issues found</span>
                                                                        }
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </SectionCard>
                )}

            </div>

            {/* Editor Modal */}
            {editingImage && (
                <ImageEditorModal
                    imageUrl={typeof editingImage === 'string' ? editingImage : editingImage.url}
                    onClose={() => setEditingImage(null)}
                    onSave={handleSaveEdit}
                />
            )}

            {/* Fullscreen Image Viewer */}
            {fullscreenImage && (
                <FullscreenImageModal
                    imageUrl={fullscreenImage.url}
                    label={fullscreenImage.label}
                    onClose={() => setFullscreenImage(null)}
                />
            )}
        </div>
    );
}