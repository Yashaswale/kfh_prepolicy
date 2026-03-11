import { useRef, useState, useCallback, useEffect } from "react";

/**
 * WebSocket-based live vehicle side detection hook.
 *
 * Uses a SEND → WAIT → RESPOND pattern:
 *   1. Send one frame to the server.
 *   2. Wait for the response (no new frames sent while waiting).
 *   3. Process the response:
 *      - If correct side detected → set readyToCapture = true, STOP sending frames.
 *      - User must manually click "Capture" to take the photo.
 *      - After capture, resume sending frames for the next side.
 *   4. If wrong side → send next frame after a short delay.
 */

const SIDE_ORDER = ["front", "rear", "left", "right"];
const SIDE_LABELS = {
    front: "Front of Vehicle",
    rear: "Rear of Vehicle",
    left: "Left Side",
    right: "Right Side",
};
const SEND_DELAY_MS = 100;

export default function useVehicleSideWS({ userId, uniqueId, onAllCaptured }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [currentSideIndex, setCurrentSideIndex] = useState(0);
    const [bbox, setBbox] = useState(null);
    const [lastResponse, setLastResponse] = useState(null);
    const [capturedSides, setCapturedSides] = useState({});
    const [status, setStatus] = useState("idle");
    const [readyToCapture, setReadyToCapture] = useState(false);
    // DEBUG: response time tracking (remove later)
    const [responseTimes, setResponseTimes] = useState([]);

    // ── Refs ───────────────────────────────────────────────────────────────────
    const wsRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const sendTimeoutRef = useRef(null);
    const waitingRef = useRef(false);
    // DEBUG: timestamp when frame was sent (remove later)
    const frameSendTimeRef = useRef(null);
    const frameCountRef = useRef(0);

    // Mutable refs — always hold latest values (avoids stale closures)
    const currentSideIndexRef = useRef(0);
    const capturedSidesRef = useRef({});
    const onAllCapturedRef = useRef(onAllCaptured);
    const statusRef = useRef("idle");

    // Keep refs in sync
    useEffect(() => { currentSideIndexRef.current = currentSideIndex; }, [currentSideIndex]);
    useEffect(() => { capturedSidesRef.current = capturedSides; }, [capturedSides]);
    useEffect(() => { onAllCapturedRef.current = onAllCaptured; }, [onAllCaptured]);
    useEffect(() => { statusRef.current = status; }, [status]);

    const currentSide = SIDE_ORDER[currentSideIndex] || null;

    // ── Send exactly one frame ────────────────────────────────────────────────
    const sendOneFrame = useCallback(() => {
        if (waitingRef.current) return;
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const side = SIDE_ORDER[currentSideIndexRef.current];
        if (!side) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            sendTimeoutRef.current = setTimeout(sendOneFrame, 200);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

        waitingRef.current = true;
        frameSendTimeRef.current = Date.now(); // DEBUG: record send time
        frameCountRef.current += 1; // DEBUG
        wsRef.current.send(JSON.stringify({ type: side, image: base64 }));
    }, []);

    // ── Schedule next frame send ──────────────────────────────────────────────
    const scheduleNextSend = useCallback(() => {
        if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = setTimeout(sendOneFrame, SEND_DELAY_MS);
    }, [sendOneFrame]);

    // ── Internal cleanup ──────────────────────────────────────────────────────
    const cleanup = useCallback(() => {
        if (sendTimeoutRef.current) { clearTimeout(sendTimeoutRef.current); sendTimeoutRef.current = null; }
        if (wsRef.current) {
            wsRef.current.onopen = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        waitingRef.current = false;
    }, []);

    // ── Manual capture (called by UI button) ──────────────────────────────────
    const captureCurrentSide = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

        const side = SIDE_ORDER[currentSideIndexRef.current];
        const updated = { ...capturedSidesRef.current, [side]: dataUrl };
        setCapturedSides(updated);
        capturedSidesRef.current = updated;
        setBbox(null);
        setReadyToCapture(false);
        setLastResponse(null);

        const nextIndex = currentSideIndexRef.current + 1;
        if (nextIndex >= SIDE_ORDER.length) {
            // ── ALL SIDES DONE ──
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
            // Resume sending frames for the next side
            scheduleNextSend();
        }
    }, [scheduleNextSend]);

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
            waitingRef.current = false;
            sendTimeoutRef.current = setTimeout(sendOneFrame, 300);
        };

        ws.onmessage = (event) => {
            waitingRef.current = false;

            // DEBUG: calculate response time (remove later)
            const responseMs = frameSendTimeRef.current ? Date.now() - frameSendTimeRef.current : null;
            if (responseMs !== null) {
                setResponseTimes(prev => {
                    const entry = { frame: frameCountRef.current, ms: responseMs, time: new Date().toLocaleTimeString() };
                    return [...prev.slice(-9), entry]; // keep last 10
                });
            }

            try {
                const data = JSON.parse(event.data);
                setBbox(data.bbox && Array.isArray(data.bbox) ? data.bbox : null);
                setLastResponse(data);

                if (data.correct) {
                    // Correct side detected → stop sending, wait for user to capture
                    setReadyToCapture(true);
                    // Do NOT schedule next send — user must click Capture
                } else {
                    // Wrong side — keep sending
                    setReadyToCapture(false);
                    scheduleNextSend();
                }
            } catch (err) {
                console.warn("[WS] Parse error:", err);
                scheduleNextSend();
            }
        };

        ws.onerror = (err) => {
            console.error("[WS] Error:", err);
            setStatus("error");
            waitingRef.current = false;
        };

        ws.onclose = (event) => {
            console.log("[WS] Closed:", event.code, event.reason);
            if (sendTimeoutRef.current) { clearTimeout(sendTimeoutRef.current); sendTimeoutRef.current = null; }
            waitingRef.current = false;
            if (statusRef.current !== "done") setStatus("idle");
        };

        wsRef.current = ws;
    }, [userId, uniqueId, sendOneFrame, scheduleNextSend]);

    // ── Disconnect ─────────────────────────────────────────────────────────────
    const disconnect = useCallback(() => {
        cleanup();
        setStatus("idle");
        setReadyToCapture(false);
    }, [cleanup]);

    // ── Unmount cleanup ────────────────────────────────────────────────────────
    useEffect(() => {
        return () => {
            if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
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
        readyToCapture,
        responseTimes, // DEBUG: remove later
        status,
        connect,
        disconnect,
        captureCurrentSide,
    };
}
