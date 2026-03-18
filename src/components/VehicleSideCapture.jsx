import { useEffect, useRef, useState, useCallback } from "react";
import { ArrowLeft, Camera, Loader2, Wifi, WifiOff, CheckCircle, XCircle, RotateCcw, ChevronRight } from "lucide-react";
import useVehicleSideWS from "../hooks/useVehicleSideWS";

import { useTranslation } from "react-i18next";

/**
 * VehicleSideCapture — full-screen camera view with manual capture + WS verification.
 *
 * Flow:
 *   1. Camera feed shown with a Capture button always visible.
 *   2. User taps Capture → photo taken and sent to WS.
 *   3. WS validates → "Photo Captured ✓ / Next" or "Try Again".
 *   4. Repeats for all 4 sides.
 */
export default function VehicleSideCapture({ userId, uniqueId, onAllCaptured, onBack, existingPhotos }) {
    const { t, i18n } = useTranslation();
    const streamRef = useRef(null);
    const [streamReady, setStreamReady] = useState(false);
    const [capturedFlash, setCapturedFlash] = useState(false);
    const [showLandscapeModal, setShowLandscapeModal] = useState(true);

    const {
        videoRef,
        canvasRef,
        currentSide,
        currentSideIndex,
        sideOrder,
        sideLabels,
        bbox,
        lastResponse,
        capturedSides,
        captureResult,
        pendingPhoto,
        status,
        connect,
        disconnect,
        captureAndVerify,
        acceptAndNext,
        retryCapture,
    } = useVehicleSideWS({
        userId,
        uniqueId,
        onAllCaptured,
    });

    // Track the previous side to detect transitions (flash effect)
    const prevSideIndexRef = useRef(currentSideIndex);
    useEffect(() => {
        if (currentSideIndex > prevSideIndexRef.current && currentSideIndex <= sideOrder.length) {
            setCapturedFlash(true);
            const t = setTimeout(() => setCapturedFlash(false), 600);
            prevSideIndexRef.current = currentSideIndex;
            return () => clearTimeout(t);
        }
        prevSideIndexRef.current = currentSideIndex;
    }, [currentSideIndex, sideOrder.length]);

    // Acquire camera stream
    useEffect(() => {
        let active = true;
        setStreamReady(false);

        navigator.mediaDevices
            .getUserMedia({
                video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
            })
            .then((stream) => {
                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setStreamReady(true);
            })
            .catch(() => { });

        return () => {
            active = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        };
    }, [videoRef]);

    // Connect to WebSocket once camera stream is ready and the modal is dismissed
    const hasConnectedRef = useRef(false);
    useEffect(() => {
        if (streamReady && !showLandscapeModal && !hasConnectedRef.current) {
            hasConnectedRef.current = true;
            connect();
        }
    }, [streamReady, showLandscapeModal, connect]);

    // Draw bounding box on overlay canvas
    const overlayCanvasRef = useRef(null);

    const drawBbox = useCallback(() => {
        const overlayCanvas = overlayCanvasRef.current;
        const video = videoRef.current;
        if (!overlayCanvas || !video) return;

        const ctx = overlayCanvas.getContext("2d");
        const rect = video.getBoundingClientRect();
        overlayCanvas.width = rect.width;
        overlayCanvas.height = rect.height;
        ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

        if (!bbox || bbox.length < 4) return;

        // The backend `bbox` coordinates are relative to the -90 degree rotated image (where Width = vh, Height = vw)
        // We must inversely transform these coordinates back to the native unrotated video layout (Width = vw, Height = vh)
        const [rx1, ry1, rx2, ry2] = bbox;
        const vw = video.videoWidth || 1;
        const vh = video.videoHeight || 1;

        // Inverse map: rotated_X maps to native_Y, rotated_Y maps to native_(vw - X)
        const x1 = vw - ry2;
        const y1 = rx1;
        const x2 = vw - ry1;
        const y2 = rx2;

        const scaleX = rect.width / vw;
        const scaleY = rect.height / vh;
        const drawX = x1 * scaleX;
        const drawY = y1 * scaleY;
        const drawW = (x2 - x1) * scaleX;
        const drawH = (y2 - y1) * scaleY;

        const isCorrect = lastResponse?.correct;

        ctx.strokeStyle = isCorrect ? "#22c55e" : "#ef4444";
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(drawX, drawY, drawW, drawH);

        const cornerLen = 20;
        ctx.lineWidth = 4;
        ctx.strokeStyle = isCorrect ? "#22c55e" : "#f97316";

        ctx.beginPath(); ctx.moveTo(drawX, drawY + cornerLen); ctx.lineTo(drawX, drawY); ctx.lineTo(drawX + cornerLen, drawY); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(drawX + drawW - cornerLen, drawY); ctx.lineTo(drawX + drawW, drawY); ctx.lineTo(drawX + drawW, drawY + cornerLen); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(drawX, drawY + drawH - cornerLen); ctx.lineTo(drawX, drawY + drawH); ctx.lineTo(drawX + cornerLen, drawY + drawH); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(drawX + drawW - cornerLen, drawY + drawH); ctx.lineTo(drawX + drawW, drawY + drawH); ctx.lineTo(drawX + drawW, drawY + drawH - cornerLen); ctx.stroke();

        const label = lastResponse?.detected
            ? `${t(lastResponse.detected).toUpperCase()} ${isCorrect ? "✓" : "✗"}`
            : "";
        if (label) {
            ctx.font = "bold 14px 'DM Sans', sans-serif";
            const metrics = ctx.measureText(label);
            const labelH = 24;
            const labelW = metrics.width + 16;
            const lx = drawX;
            const ly = drawY - labelH - 4;
            ctx.fillStyle = isCorrect ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)";
            ctx.beginPath(); ctx.roundRect(lx, ly, labelW, labelH, 6); ctx.fill();
            ctx.fillStyle = "#fff";
            ctx.fillText(label, lx + 8, ly + 17);
        }
    }, [bbox, lastResponse, videoRef]);

    useEffect(() => { drawBbox(); }, [drawBbox]);
    useEffect(() => {
        const handler = () => drawBbox();
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, [drawBbox]);

    const isComplete = status === "done";
    const isConnected = status === "connected";

    return (
        <div className="h-screen bg-black flex flex-col relative overflow-hidden" dir={i18n.dir()}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; }
        .font-syne { font-family: 'Syne', sans-serif; }

        @keyframes fadeUp { from { opacity:0; transform:translateY(18px); } to { opacity:1; transform:translateY(0); } }
        @keyframes captureFlash { 0% { opacity:0.8; } 100% { opacity:0; } }
        @keyframes pulse-btn {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,0.3); }
          50% { box-shadow: 0 0 0 8px rgba(255,255,255,0); }
        }

        .fade-up { animation: fadeUp .45s ease both; }
        .capture-flash { animation: captureFlash 0.6s ease-out forwards; }
        .pulse-btn { animation: pulse-btn 2s ease-in-out infinite; }

        .side-pill {
          padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.05em; transition: all 0.3s ease; white-space: nowrap;
        }
        .side-pill.completed { background: rgba(34,197,94,0.2); color: #22c55e; border: 1px solid rgba(34,197,94,0.3); }
        .side-pill.active { background: rgba(255,255,255,0.15); color: #fff; border: 1px solid rgba(255,255,255,0.4); backdrop-filter: blur(4px); }
        .side-pill.pending { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.1); }

        .status-badge {
          display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px;
          border-radius: 20px; font-size: 11px; font-weight: 600; backdrop-filter: blur(8px);
        }
        .status-badge.connected { background: rgba(34,197,94,0.15); color: #22c55e; border: 1px solid rgba(34,197,94,0.25); }
        .status-badge.connecting { background: rgba(234,179,8,0.15); color: #eab308; border: 1px solid rgba(234,179,8,0.25); }
        .status-badge.error { background: rgba(239,68,68,0.15); color: #ef4444; border: 1px solid rgba(239,68,68,0.25); }

        .instruction-card {
          background: rgba(0,0,0,0.6); backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 16px 20px;
        }
      `}</style>

            {/* Video frame — 70vh tall, 4:3 aspect ratio, centered */}
            <div
                className="absolute left-1/2"
                style={{
                    top: "10vh",
                    height: "60vh",
                    transform: "translateX(-50%)",
                    width: "min(90vw, calc(70vh * 4 / 3))",
                    background: "rgba(0,0,0,.35)",
                    border: "2px solid rgba(255,255,255,.25)",
                    borderRadius: 18,
                    overflow: "hidden",
                    boxShadow: "0 18px 42px rgba(0,0,0,.55)",
                    zIndex: 1
                }}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Overlay canvas for bounding box */}
                <canvas ref={overlayCanvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }} />
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {/* Capture flash effect */}
            {capturedFlash && (
                <div className="absolute inset-0 bg-white capture-flash pointer-events-none" style={{ zIndex: 30 }} />
            )}

            {/* ─── Header ─── */}
            <div
                className="absolute top-0 left-0 right-0 z-10 px-5 pt-5 pb-6"
                style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)" }}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={onBack}
                            className="w-9 h-9 rounded-full flex items-center justify-center"
                            style={{ background: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)" }}
                        >
                            <ArrowLeft className="w-4 h-4 text-white" />
                        </button>
                        <div>
                            <span className="font-syne text-white text-sm font-bold" style={{ fontWeight: 700 }}>
                                {t("Vehicle Side Detection")}
                            </span>
                            <div className="text-white/50 text-[10px] mt-0.5">{t("Capture & verify each side")}</div>
                        </div>
                    </div>

                    <div className={`status-badge ${status === "connected" ? "connected" : status === "connecting" ? "connecting" : status === "error" ? "error" : "connecting"}`}>
                        {status === "connected" ? (<><Wifi className="w-3 h-3" /> {t("Live")}</>) :
                            status === "connecting" ? (<><Loader2 className="w-3 h-3 animate-spin" /> {t("Connecting")}</>) :
                                status === "error" ? (<><WifiOff className="w-3 h-3" /> {t("Error")}</>) :
                                    (<><Loader2 className="w-3 h-3 animate-spin" /> {t("Starting")}</>)}
                    </div>
                </div>

                {/* Side progress pills */}
                <div className="flex gap-2 justify-center flex-wrap">
                    {sideOrder.map((side, i) => {
                        const isCaptured = !!capturedSides[side];
                        const isActive = i === currentSideIndex && !isComplete;
                        return (
                            <div key={side} className={`side-pill ${isCaptured ? "completed" : isActive ? "active" : "pending"}`}>
                                {isCaptured && <CheckCircle className="inline w-3 h-3 mr-1 -mt-0.5" />}
                                {t(sideLabels[side])}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ─── Bottom section ─── */}
            <div
                className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-8 pb-6"
                style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)" }}
            >
                {!isComplete && currentSide ? (
                    <div className="instruction-card fade-up">
                        {/* Header: current side info */}
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <Camera className="w-4 h-4 text-green-400" />
                                <span className="text-white font-syne text-sm font-bold" style={{ fontWeight: 700 }}>
                                    {t(sideLabels[currentSide])}
                                </span>
                            </div>
                            <span className="text-white/40 text-xs">
                                {currentSideIndex + 1} / {sideOrder.length}
                            </span>
                        </div>

                        {/* Result feedback area */}
                        {captureResult === "verifying" && (
                            <div className="flex items-center gap-3 mb-4 py-3 px-4 rounded-xl" style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.2)" }}>
                                <Loader2 className="w-5 h-5 text-yellow-400 animate-spin shrink-0" />
                                <div>
                                    <span className="text-yellow-400 text-sm font-semibold block">{t("Verifying…")}</span>
                                    <span className="text-white/50 text-xs">{t("Checking if this is the correct side")}</span>
                                </div>
                            </div>
                        )}

                        {captureResult === "success" && (
                            <div className="flex items-center gap-3 mb-4 py-3 px-4 rounded-xl" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
                                <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                                <div className="flex-1">
                                    <span className="text-green-400 text-sm font-semibold block">{t("Photo Captured ✓")}</span>
                                    <span className="text-white/50 text-xs">
                                        {lastResponse?.detected && `${t("Detected:")} ${t(lastResponse.detected)}`}
                                    </span>
                                </div>
                            </div>
                        )}

                        {captureResult === "failed" && (
                            <div className="flex items-center gap-3 mb-4 py-3 px-4 rounded-xl" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                                <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                                <div className="flex-1">
                                    <span className="text-red-400 text-sm font-semibold block">{t("Wrong side detected")}</span>
                                    <span className="text-white/50 text-xs">
                                        {lastResponse?.detected
                                            ? `${t("Got")} "${t(lastResponse.detected)}", ${t("expected")} "${t(sideLabels[currentSide])}"`
                                            : t("Please try again")}
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Instruction text when idle */}
                        {captureResult === "idle" && (
                            <p className="text-white/60 text-xs mb-4 leading-relaxed">
                                {t("Point your camera at the")} <strong className="text-white/90">{t(sideLabels[currentSide])}</strong> {t("of the vehicle and tap")} <strong className="text-white/90">{t("Capture")}</strong>.
                            </p>
                        )}

                        {/* Action buttons */}
                        <div className="flex gap-3">
                            {/* Capture / Try Again button */}
                            {(captureResult === "idle" || captureResult === "failed") && (
                                <button
                                    onClick={captureResult === "failed" ? retryCapture : captureAndVerify}
                                    disabled={!isConnected}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${!isConnected
                                        ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                                        : captureResult === "failed"
                                            ? "bg-orange-500 hover:bg-orange-600 text-white pulse-btn"
                                            : "bg-white text-black hover:bg-gray-100 pulse-btn"
                                        }`}
                                >
                                    {captureResult === "failed" ? (
                                        <><RotateCcw className="w-4 h-4 mx-1" /> {t("Click Again")}</>
                                    ) : (
                                        <><Camera className="w-4 h-4 mx-1" /> {t("Capture")}</>
                                    )}
                                </button>
                            )}

                            {/* Verifying state — disabled button */}
                            {captureResult === "verifying" && (
                                <button disabled className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-gray-700 text-gray-400 cursor-not-allowed">
                                    <Loader2 className="w-4 h-4 animate-spin mx-1" /> {t("Verifying…")}
                                </button>
                            )}

                            {/* Success state — Next button */}
                            {captureResult === "success" && (
                                <button
                                    onClick={acceptAndNext}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-green-500 hover:bg-green-600 text-white transition-all pulse-btn"
                                >
                                    {currentSideIndex + 1 >= sideOrder.length ? (
                                        <><CheckCircle className="w-4 h-4 mx-1" /> {t("Finish")}</>
                                    ) : (
                                        <><ChevronRight className="w-4 h-4 mx-1" /> {t("Next")}</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                ) : isComplete ? (
                    <div className="instruction-card fade-up text-center">
                        <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                        <span className="text-white font-syne text-base font-bold block mb-1" style={{ fontWeight: 700 }}>
                            {t("All Sides Captured!")}
                        </span>
                        <p className="text-white/60 text-xs">{t("Processing your photos…")}</p>
                    </div>
                ) : null}
            </div>

            {/* Landscape Instruction Modal */}
            {showLandscapeModal && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="bg-gray-900 border border-white/20 p-6 rounded-2xl w-full max-w-sm text-center fade-up shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                            <RotateCcw className="w-8 h-8 text-white" />
                        </div>
                        <h3 className="text-xl font-syne font-bold text-white mb-2">{t("Capture in Landscape")}</h3>
                        <p className="text-white/70 text-sm mb-6 leading-relaxed">
                            {t("For the most accurate recognition, please hold your phone horizontally (Landscape mode) when capturing the four sides of the vehicle.")}
                        </p>
                        <button
                            onClick={() => setShowLandscapeModal(false)}
                            className="w-full py-3 bg-white text-black font-bold rounded-xl active:scale-95 transition-transform"
                        >
                            {t("I understand")}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
