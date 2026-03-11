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

export default function useVehicleSideWS({ userId, uniqueId, onAllCaptured }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [currentSideIndex, setCurrentSideIndex] = useState(0);
    const [bbox, setBbox] = useState(null);
    const [lastResponse, setLastResponse] = useState(null);
    const [capturedSides, setCapturedSides] = useState({});
    const [status, setStatus] = useState("idle");
    // "idle" | "verifying" | "success" | "failed"
    const [captureResult, setCaptureResult] = useState("idle");
    // Temporarily hold the captured dataUrl until verified
    const [pendingPhoto, setPendingPhoto] = useState(null);
    // DEBUG: response time tracking (remove later)
    const [responseTimes, setResponseTimes] = useState([]);

    // ── Refs ───────────────────────────────────────────────────────────────────
    const wsRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    // DEBUG: timing refs (remove later)
    const frameSendTimeRef = useRef(null);
    const frameCountRef = useRef(0);

    // Mutable refs — always hold latest values
    const currentSideIndexRef = useRef(0);
    const capturedSidesRef = useRef({});
    const onAllCapturedRef = useRef(onAllCaptured);
    const statusRef = useRef("idle");

    useEffect(() => { currentSideIndexRef.current = currentSideIndex; }, [currentSideIndex]);
    useEffect(() => { capturedSidesRef.current = capturedSides; }, [capturedSides]);
    useEffect(() => { onAllCapturedRef.current = onAllCaptured; }, [onAllCaptured]);
    useEffect(() => { statusRef.current = status; }, [status]);

    const currentSide = SIDE_ORDER[currentSideIndex] || null;

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

    // ── Capture: take photo and send to WS for validation ─────────────────────
    const captureAndVerify = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const side = SIDE_ORDER[currentSideIndexRef.current];
        if (!side) return;

        // Take high-quality photo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        const base64 = dataUrl.split(",")[1];

        // Store pending photo
        setPendingPhoto(dataUrl);
        setCaptureResult("verifying");
        setBbox(null);

        // DEBUG: record send time
        frameSendTimeRef.current = Date.now();
        frameCountRef.current += 1;

        // Send to WS for validation
        wsRef.current.send(JSON.stringify({ type: side, image: base64 }));
    }, []);

    // ── Accept: user clicks Next after successful verification ────────────────
    const acceptAndNext = useCallback(() => {
        if (captureResult !== "success" || !pendingPhoto) return;

        const side = SIDE_ORDER[currentSideIndexRef.current];
        const updated = { ...capturedSidesRef.current, [side]: pendingPhoto };
        setCapturedSides(updated);
        capturedSidesRef.current = updated;
        setPendingPhoto(null);
        setCaptureResult("idle");
        setBbox(null);
        setLastResponse(null);

        const nextIndex = currentSideIndexRef.current + 1;
        if (nextIndex >= SIDE_ORDER.length) {
            setStatus("done");
            setCurrentSideIndex(nextIndex);

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
        } else {
            setCurrentSideIndex(nextIndex);
            currentSideIndexRef.current = nextIndex;
        }
    }, [captureResult, pendingPhoto]);

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

                if (data.correct) {
                    setCaptureResult("success");
                } else {
                    setCaptureResult("failed");
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
        currentSideIndex,
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
