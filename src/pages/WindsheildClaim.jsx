import { useState, useRef, useEffect } from "react";
import { editInspectionOcr, uploadWindshieldImages, reassessDamageResult, editWindshieldAi, editCorrectIncorrectResult, rotateDamageMedia } from "../api";
import { getUser } from "../utils/auth";
// ─── Helpers ───────────────────────────────────────────────────────────────────────────────
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
  const originalImageRef = useRef(null);

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
          originalImageRef.current = img;
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
        originalImageRef.current = img;
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
    ctx.globalCompositeOperation = "source-over";

    if (tool === "pen") {
      ctx.strokeStyle = color;
    } else if (tool === "eraser") {
      if (originalImageRef.current) {
        const pattern = ctx.createPattern(originalImageRef.current, "no-repeat");
        ctx.strokeStyle = pattern;
      } else {
        ctx.strokeStyle = "#ffffff";
      }
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
    img.onload = () => {
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
    };
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
    </div>
  );
}

// ─── Fullscreen Image Viewer Modal ─────────────────────────────────────────────
function FullscreenImageModal({ imageUrl, label, mediaId, rotateTarget, onClose, onRotateSuccess }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [savingRotate, setSavingRotate] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (zoom <= 1) {
      setPan({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleZoomIn = (e) => { e.stopPropagation(); setZoom(z => Math.min(z + 0.5, 5)); };
  const handleZoomOut = (e) => { e.stopPropagation(); setZoom(z => Math.max(z - 0.5, 0.5)); };
  const handleRotate = (e) => { e.stopPropagation(); setRotation(r => r + 90); };

  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = { x: touch.clientX - pan.x, y: touch.clientY - pan.y };
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.current.x,
      y: touch.clientY - dragStart.current.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleSaveRotation = async (e) => {
    e.stopPropagation();
    if (!mediaId) return;
    setSavingRotate(true);
    let normalizedRotation = rotation % 360;
    if (normalizedRotation < 0) normalizedRotation += 360;
    
    if (normalizedRotation === 0) {
      setSavingRotate(false);
      return;
    }

    try {
      await rotateDamageMedia(mediaId, {
        rotate_angle: normalizedRotation,
        direction: "right",
        rotate_target: rotateTarget || "original"
      });
      setRotation(0);
      if (onRotateSuccess) {
        onRotateSuccess();
      }
    } catch (err) {
      console.error("Rotate error", err);
      alert(err?.message || "Failed to rotate image");
    } finally {
      setSavingRotate(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center overflow-hidden" onClick={onClose}>
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/60 px-6 py-3 rounded-full z-20" onClick={(e) => e.stopPropagation()}>
        <button onClick={handleZoomOut} className="text-white hover:text-green-400 transition" title="Zoom Out">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6" />
          </svg>
        </button>
        <span className="text-white text-sm font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
        <button onClick={handleZoomIn} className="text-white hover:text-green-400 transition" title="Zoom In">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </button>
        <div className="w-px h-6 bg-white/20 mx-2" />
        <button onClick={handleRotate} className="text-white hover:text-green-400 transition" title="Rotate">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        {mediaId && (rotation % 360 !== 0) && (
          <>
            <div className="w-px h-6 bg-white/20 mx-2" />
            <button onClick={handleSaveRotation} disabled={savingRotate} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
              {savingRotate ? "Saving..." : "Save"}
            </button>
          </>
        )}
      </div>

      <button
        onClick={onClose}
        className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-20"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      {label && (
        <div className="absolute top-5 left-5 bg-black/60 px-4 py-2 rounded-xl z-20">
          <span className="text-white text-sm font-semibold">{label}</span>
        </div>
      )}

      <div className="w-full h-full flex items-center justify-center overflow-auto" onClick={(e) => { e.stopPropagation(); onClose(); }}>
        <img
          src={imageUrl}
          alt={label || "Full screen"}
          className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg select-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
            transition: isDragging ? "none" : "transform 0.2s ease-out",
            touchAction: zoom > 1 ? "none" : "auto",
            userSelect: "none",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDragStart={(e) => e.preventDefault()}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    </div>
  );
}

// ─── Field Row ────────────────────────────────────────────────────────────────────
function FieldRow({ label, value, wide }) {
  const isLocation = label === "Location" && value && value !== "—" && value.includes(",");
  return (
    <div className={`flex items-center gap-4 ${wide ? "col-span-2" : ""}`}>
      <span className="text-sm font-medium text-gray-600 w-40 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-lg px-4 py-2.5 text-sm text-gray-800 min-h-[40px] flex items-center justify-between gap-2">
        <span>{value || <span className="text-gray-400">—</span>}</span>
        {isLocation && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value.trim())}`}
            target="_blank"
            rel="noopener noreferrer"
            className="no-print inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            Check Location
          </a>
        )}
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

// ─── Correct / Incorrect Toggle ────────────────────────────────────────────────
// ─── Review Status Toggle ────────────────────────────────────────────────
function CorrectIncorrectToggle({ inspectionId, initialCorrect, initialNotes }) {
  const [correct, setCorrect] = useState(initialCorrect);
  const [notes, setNotes] = useState(initialNotes || "");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await editCorrectIncorrectResult(inspectionId, {
        correct_result: correct === "accepted" || correct === true,
        additional_notes: notes
      });
      setIsEditing(false);
    } catch (err) {
      setError(err?.message || "Failed to save status");
    } finally {
      setSaving(false);
    }
  };

  const statusConfig = {
    pending: { label: "Pending", color: "text-amber-600 bg-amber-50 border-amber-100", activeBg: "bg-amber-500 text-white hover:bg-amber-600" },
    viewed: { label: "Viewed", color: "text-blue-600 bg-blue-50 border-blue-100", activeBg: "bg-blue-600 text-white hover:bg-blue-700" },
    accepted: { label: "Accepted", color: "text-green-600 bg-green-50 border-green-100", activeBg: "bg-green-600 text-white hover:bg-green-700" },
    rejected: { label: "Rejected", color: "text-red-600 bg-red-50 border-red-100", activeBg: "bg-red-600 text-white hover:bg-red-705" }
  };

  const getStatusLabel = (val) => {
    if (val === true || val === "accepted") return "accepted";
    if (val === false || val === "rejected") return "rejected";
    if (val === "viewed") return "viewed";
    if (val === "pending") return "pending";
    return null;
  };

  const currentStatus = getStatusLabel(correct);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6 no-print flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-900 uppercase tracking-wider">Review Status</span>
        {!isEditing && (
          <button onClick={() => setIsEditing(true)} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            Edit Status
          </button>
        )}
      </div>

      {!isEditing ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-gray-600">Current Status:</span>
            {currentStatus ? (
              <span className={`font-bold px-2 py-1 rounded border capitalize ${statusConfig[currentStatus].color}`}>
                {currentStatus}
              </span>
            ) : (
              <span className="text-gray-400 font-medium">— Not Marked —</span>
            )}
          </div>
          {notes && (
            <div className="flex items-start gap-2 text-sm">
              <span className="font-medium text-gray-600 mt-0.5">Notes:</span>
              <span className="text-gray-800 bg-gray-50 px-3 py-2 rounded-lg flex-1 border border-gray-100">{notes}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {Object.entries(statusConfig)
              .filter(([key]) => key === "accepted" || key === "rejected")
              .map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setCorrect(key)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors border ${
                    currentStatus === key
                      ? cfg.activeBg + " border-transparent"
                      : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Add additional notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="flex-1 border border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-4 py-2 text-sm outline-none"
              disabled={saving}
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save"}
            </button>
            <button
              onClick={() => {
                setCorrect(initialCorrect);
                setNotes(initialNotes || "");
                setIsEditing(false);
              }}
              disabled={saving}
              className="px-3 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <span className="text-red-500 text-xs w-full">{error}</span>}
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function WindShieldAssessmentResult({ inspectionRow, ocrData, windshieldData, ocrLoading, ocrError, onBack, onRefresh }) {
  const [editingImage, setEditingImage] = useState(null);
  const [editedAiImage, setEditedAiImage] = useState(null);
  const [editedWsImages, setEditedWsImages] = useState({});
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [showReassessModal, setShowReassessModal] = useState(false);
  const [reassessRotation, setReassessRotation] = useState(false);
  const [reassessmentMsg, setReassessmentMsg] = useState("");
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
    if (editingImage?.wsIndex !== undefined) {
      setEditedWsImages(prev => ({ ...prev, [editingImage.wsIndex]: dataUrl }));
    } else {
      setEditedAiImage(dataUrl);
    }

    // Call the edit-windshield-ai API
    const mediaId = editingImage?.mediaId;
    if (mediaId) {
      setSavingEdit(true);
      try {
        const blob = dataUrlToBlob(dataUrl);
        const imageFile = new File([blob], 'edited_windshield.jpg', { type: 'image/jpeg' });
        const formData = new FormData();
        formData.append('ai_image', imageFile);
        formData.append('ai_result', editingImage?.aiResult || '');
        await editWindshieldAi(mediaId, formData);
        console.log('[WindshieldResult] editWindshieldAi success for mediaId:', mediaId);
      } catch (err) {
        console.error('[WindshieldResult] editWindshieldAi error:', err);
      } finally {
        setSavingEdit(false);
      }
    }
  };

  const handleReassessment = async () => {
    if (!inspectionRow?.unique_verify_id) return;

    setShowReassessModal(false);
    setReassessing(true);
    setReassessmentMsg("");
    try {
      await reassessDamageResult({ 
        unique_id: inspectionRow.unique_verify_id,
        rotation: reassessRotation
      });
      setReassessmentMsg("Reassessment started successfully!");
      setTimeout(() => setReassessmentMsg(""), 3000);
    } catch (err) {
      console.error('[WindshieldResult] Reassessment error:', err);
      setReassessmentMsg(err?.data?.detail || err?.message || "Reassessment failed");
    } finally {
      setReassessing(false);
    }
  };

  const currentUser = getUser();
  const isAdmin = currentUser?.is_staff === true;

  // Extract data from props — inspectionRow has customer/row info, ocrData has OCR results
  const customerName = inspectionRow?.name || "—";
  const customerEmail = inspectionRow?.email || "—";
  const policyNumber = inspectionRow?.policy || "—";
  const location = inspectionRow?.location || "—";
  const fakeImgDetected = inspectionRow?.fakeImgDetection || inspectionRow?.fake_img_detection || windshieldData?.fake_img_detection || false;

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
            Windshield Claim Assessment
          </h1>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={() => setShowReassessModal(true)}
                disabled={reassessing}
                className="no-print flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-sm font-semibold rounded-xl transition-all shadow-sm shadow-blue-200 disabled:opacity-50"
              >
                {reassessing ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                )}
                Reassessment
              </button>
            )}

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
      </div>

      {/* Reassessment Modal */}
      {showReassessModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Start Reassessment</h3>
            <p className="text-gray-500 text-sm mb-6">
              Are you sure you want to start a new assessment for this windshield claim?
            </p>
            
            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
              <div>
                <span className="text-sm font-bold text-gray-800 block">Apply Rotation</span>
                <span className="text-xs text-gray-500">Rotate images automatically</span>
              </div>
              <button 
                onClick={() => setReassessRotation(!reassessRotation)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${reassessRotation ? 'bg-blue-600' : 'bg-gray-300'}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${reassessRotation ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setShowReassessModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleReassessment}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reassessment Status Banner */}
      {reassessmentMsg && (
        <div className="max-w-6xl mx-auto px-6 mt-4 no-print">
          <div className={`px-4 py-3 rounded-xl text-sm font-medium ${reassessmentMsg.includes("success") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {reassessmentMsg}
          </div>
        </div>
      )}

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

        {/* Result Validation */}
        {!ocrLoading && inspectionRow?.id && (
          <CorrectIncorrectToggle
            inspectionId={inspectionRow.id}
            initialCorrect={windshieldData?.review_status ?? windshieldData?.correct_result ?? inspectionRow.correctResult}
            initialNotes={windshieldData?.additional_notes ?? inspectionRow.additionalNotes}
          />
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
              <FieldRow label="Location" value={location} />
              <FieldRow label="Status" value={inspectionRow?.status || "—"} />
              {fakeImgDetected && (
                <FieldRow
                  label="Fake Image detected"
                  value={<span className="text-red-600 font-bold uppercase tracking-wider">Yes</span>}
                />
              )}
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
                <h3 className="text-sm font-bold text-gray-900 mb-3">Plate No</h3>
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
                  label="Plate Number"
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



        {/* Windshield Results */}
        {windshieldData && (
          <SectionCard title="Windshield Assessment Results">
            {(() => {
              const wsData = windshieldData;
              const closeupUrl = buildUrl(wsData.closeup_image);
              const plateUrl = editedWsImages[0] || buildUrl(wsData.plate_image);
              const aiResult = wsData.ai_result || "";
              const isMajor = aiResult.toLowerCase().includes("major");
              const isMinor = aiResult.toLowerCase().includes("minor");
              const hasDamage = isMajor || isMinor || (aiResult && !aiResult.toLowerCase().includes("no"));

              return (
                <div className="border border-gray-100 rounded-2xl p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-bold ${isMajor ? 'bg-red-500' : isMinor ? 'bg-orange-400' : hasDamage ? 'bg-yellow-500' : 'bg-green-500'
                        }`}>
                        W
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Windshield Inspection</h4>
                        <span className={`text-xs font-semibold ${isMajor ? 'text-red-500' : isMinor ? 'text-orange-500' : hasDamage ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                          {hasDamage ? '⚠ Damage Detected' : '✓ No Damage'}
                        </span>
                      </div>
                    </div>
                    {wsData.inspection_id && (
                      <span className="text-xs text-gray-400">ID: {wsData.inspection_id}</span>
                    )}
                  </div>

                  {/* Closeup & Plate Images side by side */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {/* Closeup Image */}
                    <div>
                      <div className="rounded-xl overflow-hidden relative bg-gray-100 aspect-video cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                        onClick={() => closeupUrl && setFullscreenImage({ url: closeupUrl, label: 'Windshield Closeup', mediaId: wsData.id, rotateTarget: 'original' })}>
                        {closeupUrl ? (
                          <img src={closeupUrl} alt="Windshield Closeup" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-3 py-1.5">
                          <span className="text-white text-xs font-medium">Closeup Image</span>
                        </div>
                      </div>
                    </div>

                    {/* Plate / AI Image */}
                    <div>
                      <div className="rounded-xl overflow-hidden relative bg-gray-100 aspect-video group cursor-pointer hover:ring-2 hover:ring-green-400 transition-all"
                        onClick={() => plateUrl && setFullscreenImage({ url: plateUrl, label: 'Windshield Plate', mediaId: wsData.id, rotateTarget: 'ai' })}>
                        {plateUrl ? (
                          <img src={plateUrl} alt="Windshield Plate" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91M3.75 21h16.5a2.25 2.25 0 002.25-2.25V5.25a2.25 2.25 0 00-2.25-2.25H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                            </svg>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 px-3 py-1.5 flex items-center justify-between">
                          <span className="text-white text-xs font-medium">Plate Image</span>
                          {plateUrl && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setEditingImage({ url: buildUrl(wsData.plate_image), wsIndex: 0, mediaId: wsData.id, aiResult: wsData.ai_result || '' }); }}
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

                  {/* AI Result */}
                  {aiResult && (
                    <div className="mt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-40 shrink-0">AI Result</span>
                        <div className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold flex items-center gap-2 ${isMajor
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : isMinor
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : hasDamage
                              ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                              : 'bg-green-50 text-green-700 border border-green-200'
                          }`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${isMajor ? 'bg-red-500' : isMinor ? 'bg-orange-400' : hasDamage ? 'bg-yellow-500' : 'bg-green-500'
                            }`} />
                          {aiResult.charAt(0).toUpperCase() + aiResult.slice(1)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
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
          mediaId={fullscreenImage.mediaId}
          rotateTarget={fullscreenImage.rotateTarget}
          onClose={() => setFullscreenImage(null)}
          onRotateSuccess={() => {
            setFullscreenImage(null);
            if (onRefresh) onRefresh();
          }}
        />
      )}
    </div>
  );
}