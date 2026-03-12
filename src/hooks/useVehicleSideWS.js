import { useRef, useState, useCallback, useEffect } from "react";

/**
 * WebSocket-based vehicle side detection hook.
 *
 * New flow:
 *   1. User sees a Capture button (always visible).
 *   2. User clicks Capture → photo is taken and sent to WS for validation.
 *   3. WS responds with correct/incorrect.
 *   4. If correct → captureResult = "success", user clicks Next to proceed.
 *   5. If incorrect → captureResult = "failed", user clicks Again to retry.
 *   6. No automatic frame sending — only sends when user captures.
 */

const SIDE_ORDER = ["front", "rear", "left", "right"];
const SIDE_LABELS = {
    front: "Front of Vehicle",
    rear: "Rear of Vehicle",
    left: "Left Side",
    right: "Right Side",
};

function getNextSide(capturedSides) {
    const allSides = SIDE_ORDER;
    if (!capturedSides) return allSides[0];

    const captured = new Set(Object.keys(capturedSides).filter((k) => capturedSides[k]));
    const remaining = allSides.filter((s) => !captured.has(s));
    if (!remaining.length) return null;

    // If we have one of the left/right sides, prompt for the other next (better UX)
    if (captured.has("left") && !captured.has("right")) return "right";
    if (captured.has("right") && !captured.has("left")) return "left";

    // Otherwise fall back to a fixed order
    return remaining[0];
}

export default function useVehicleSideWS({ userId, uniqueId, onAllCaptured }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [bbox, setBbox] = useState(null);
    const [lastResponse, setLastResponse] = useState(null);
    const [capturedSides, setCapturedSides] = useState({});
    const [status, setStatus] = useState("idle");
    // "idle" | "verifying" | "success" | "failed"
    const [captureResult, setCaptureResult] = useState("idle");
    // Temporarily hold the captured dataUrl until verified
    const [pendingPhoto, setPendingPhoto] = useState(null);
    // The side the server has detected for the pending photo
    const [pendingDetectedSide, setPendingDetectedSide] = useState(null);
    // Track how many attempts per side (for forced progression after repeated failures)
    const [attempts, setAttempts] = useState({});
    // Rotate left/right images on retry (helps when camera is rotated)
    const [rotateLeftRight, setRotateLeftRight] = useState(false);
    // DEBUG: response time tracking (remove later)
    const [responseTimes, setResponseTimes] = useState([]);

    // ── Refs ───────────────────────────────────────────────────────────────────
    const wsRef = useRef(null);
    const pendingPhotoRef = useRef(null);
    const captureResultRef = useRef("idle");
    const attemptsRef = useRef({});
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    // DEBUG: timing refs (remove later)
    const frameSendTimeRef = useRef(null);
    const frameCountRef = useRef(0);

    // Mutable refs — always hold latest values
    const capturedSidesRef = useRef({});
    const onAllCapturedRef = useRef(onAllCaptured);
    const statusRef = useRef("idle");

    const currentSide = getNextSide(capturedSides);
    const currentSideRef = useRef(currentSide);

    useEffect(() => { currentSideRef.current = currentSide; }, [currentSide]);
    useEffect(() => { capturedSidesRef.current = capturedSides; }, [capturedSides]);
    useEffect(() => { onAllCapturedRef.current = onAllCaptured; }, [onAllCaptured]);
    useEffect(() => { statusRef.current = status; }, [status]);
    useEffect(() => { pendingPhotoRef.current = pendingPhoto; }, [pendingPhoto]);
    useEffect(() => { captureResultRef.current = captureResult; }, [captureResult]);
    useEffect(() => { attemptsRef.current = attempts; }, [attempts]);

    // ── Internal cleanup ──────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.onopen = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    const rotateDataUrl = useCallback((dataUrl, degrees) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const cw = img.width;
                const ch = img.height;
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                if (degrees % 180 !== 0) {
                    canvas.width = ch;
                    canvas.height = cw;
                } else {
                    canvas.width = cw;
                    canvas.height = ch;
                }

                ctx.translate(canvas.width / 2, canvas.height / 2);
                ctx.rotate((degrees * Math.PI) / 180);
                ctx.drawImage(img, -cw / 2, -ch / 2);
                resolve(canvas.toDataURL("image/jpeg", 0.9));
            };
            img.src = dataUrl;
        });
    }, []);

    // ── Capture: take photo and send to WS for validation ─────────────────────
    const captureAndVerify = useCallback(async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const side = "any"; // Let the model decide which side is shown

        // Track attempts so we can force progress after repeated failures
        setAttempts((prev) => {
            const key = currentSideRef.current || "any";
            const next = { ...prev, [key]: (prev[key] || 0) + 1 };
            attemptsRef.current = next;
            return next;
        });

        // Take high-quality photo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

        // Rotate left/right images on retry when needed
        const outgoingDataUrl = rotateLeftRight ? await rotateDataUrl(dataUrl, -90) : dataUrl;
        if (rotateLeftRight) setRotateLeftRight(false);

        const base64 = outgoingDataUrl.split(",")[1];

        // Store pending photo
        setPendingPhoto(outgoingDataUrl);
        setCaptureResult("verifying");
        setBbox(null);

        // DEBUG: record send time
        frameSendTimeRef.current = Date.now();
        frameCountRef.current += 1;

        // Send to WS for validation
        wsRef.current.send(JSON.stringify({ type: side, image: base64 }));
    }, [rotateDataUrl, rotateLeftRight]);

    const advanceSide = useCallback((force = false) => {
        const photo = pendingPhotoRef.current;
        const result = captureResultRef.current;
        if (!photo) return;
        if (!force && result !== "success") return;

        const side = currentSideRef.current || "any";
        const updated = { ...capturedSidesRef.current, [side]: photo };
        setCapturedSides(updated);
        capturedSidesRef.current = updated;

        setPendingPhoto(null);
        setPendingDetectedSide(null);
        setCaptureResult("idle");
        setBbox(null);
        setLastResponse(null);
        setRotateLeftRight(false);

        // Reset attempt counter for this side when moving on
        setAttempts((prev) => {
            const next = { ...prev };
            delete next[side];
            attemptsRef.current = next;
            return next;
        });

        const nextSide = getNextSide(updated);
        if (!nextSide) {
            setStatus("done");
            if (wsRef.current) {
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
            const cb = onAllCapturedRef.current;
            if (cb) {
                cb(SIDE_ORDER.map((s) => ({
                    sideId: s,
                    label: SIDE_LABELS[s],
                    dataUrl: updated[s],
                })));
            }
        }
    }, []);

    const acceptAndNext = useCallback(() => {
        advanceSide(false);
    }, [advanceSide]);

    // ── Retry: user clicks Try Again after failed verification ─────────────────
    const retryCapture = useCallback(() => {
        setPendingPhoto(null);
        setCaptureResult("idle");
        setBbox(null);
        setLastResponse(null);
    }, []);

    // ── Connect ────────────────────────────────────────────────────────────────
    const connect = useCallback(() => {
        if (wsRef.current) return;

        setStatus("connecting");
        const url = `wss://api.dezzex.ae/ws/car-side/${userId}/${uniqueId}/`;
        console.log("[WS] Connecting to", url);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log("[WS] Connected ✓");
            setStatus("connected");
        };

        ws.onmessage = (event) => {
            // DEBUG: calculate response time (remove later)
            const responseMs = frameSendTimeRef.current ? Date.now() - frameSendTimeRef.current : null;
            if (responseMs !== null) {
                setResponseTimes(prev => {
                    const entry = { frame: frameCountRef.current, ms: responseMs, time: new Date().toLocaleTimeString() };
                    return [...prev.slice(-9), entry];
                });
            }

            try {
                const data = JSON.parse(event.data);
                setBbox(data.bbox && Array.isArray(data.bbox) ? data.bbox : null);
                setLastResponse(data);

                const detectedSide = data.detected || currentSideRef.current;
                setPendingDetectedSide(detectedSide);

                const attemptKey = currentSideRef.current || "any";
                const attemptsForSide = attemptsRef.current[attemptKey] || 0;

                const alreadyCaptured = detectedSide && !!capturedSidesRef.current[detectedSide];
                const isSuccess = data.correct || (detectedSide && !alreadyCaptured);

                if (data.correct) {
                    setCaptureResult("success");
                } else {
                    setCaptureResult("failed");

                    // Rotate for left/right when detection is wrong (mobile orientation)
                    if (detectedSide === "left" || detectedSide === "right") {
                        setRotateLeftRight(true);
                    }

                    // If the user has tried 3+ times for this side, auto-advance to keep flow moving
                    if (attemptsForSide >= 3) {
                        setTimeout(() => {
                            advanceSide(true);
                        }, 600);
                    }
                }
            } catch (err) {
                console.warn("[WS] Parse error:", err);
                setCaptureResult("failed");
            }
        };

        ws.onerror = (err) => {
            console.error("[WS] Error:", err);
            setStatus("error");
        };

        ws.onclose = (event) => {
            console.log("[WS] Closed:", event.code, event.reason);
            if (statusRef.current !== "done") setStatus("idle");
        };

        wsRef.current = ws;
    }, [userId, uniqueId]);

    // ── Disconnect ─────────────────────────────────────────────────────────────
    const disconnect = useCallback(() => {
        cleanup();
        setStatus("idle");
        setCaptureResult("idle");
        setPendingPhoto(null);
        setPendingDetectedSide(null);
        setRotateLeftRight(false);
    }, [cleanup]);

    // ── Unmount cleanup ────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.onopen = null;
                wsRef.current.onmessage = null;
                wsRef.current.onerror = null;
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []);

    return {
        videoRef,
        canvasRef,
        currentSide,
        sideOrder: SIDE_ORDER,
        sideLabels: SIDE_LABELS,
        bbox,
        lastResponse,
        capturedSides,
        captureResult,
        pendingPhoto,
        responseTimes, // DEBUG: remove later
        status,
        connect,
        disconnect,
        captureAndVerify,
        acceptAndNext,
        retryCapture,
    };
}

