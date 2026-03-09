import { useRef, useState, useCallback, useEffect } from "react";

/**
 * WebSocket-based live vehicle side detection hook.
 *
 * Flow:
 *  1. Opens a WS connection to wss://api.dezzex.ae/ws/car-side/{user_id}/{unique_id}/
 *  2. Every 500 ms grabs a frame from the video element, converts to base64, and sends it.
 *  3. Receives { expected, detected, correct, bbox } responses.
 *  4. When the correct side is detected continuously for 2 s, auto-captures the photo.
 *  5. Advances through the sides: front → rear → left → right.
 *  6. When all 4 sides are captured, closes the WS.
 *
 * Key design: all callbacks use refs to avoid stale closures with WebSocket handlers.
 */

const SIDE_ORDER = ["front", "rear", "left", "right"];
const SIDE_LABELS = {
    front: "Front of Vehicle",
    rear: "Rear of Vehicle",
    left: "Left Side",
    right: "Right Side",
};
const CORRECT_HOLD_MS = 2000; // hold for 2 seconds to auto-capture
const FRAME_INTERVAL_MS = 500;

export default function useVehicleSideWS({ userId, uniqueId, onAllCaptured }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [currentSideIndex, setCurrentSideIndex] = useState(0);
    const [bbox, setBbox] = useState(null);
    const [lastResponse, setLastResponse] = useState(null);
    const [capturedSides, setCapturedSides] = useState({});
    const [status, setStatus] = useState("idle"); // idle | connecting | connected | error | done
    const [holdProgress, setHoldProgress] = useState(0); // 0-100

    // ── Refs ───────────────────────────────────────────────────────────────────
    const wsRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const frameIntervalRef = useRef(null);
    const correctSinceRef = useRef(null);
    const holdTimerRef = useRef(null);

    // Mutable refs that always hold the latest values (avoids stale closures)
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

    // ── Frame capture ──────────────────────────────────────────────────────────
    const captureFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) return null;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(video, 0, 0);
        return canvas.toDataURL("image/jpeg", 0.85);
    }, []);

    // ── Hold timer helpers ─────────────────────────────────────────────────────
    const stopHoldTimer = useCallback(() => {
        if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        setHoldProgress(0);
    }, []);

    const startHoldTimer = useCallback(() => {
        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
        const start = Date.now();
        holdTimerRef.current = setInterval(() => {
            const pct = Math.min(100, ((Date.now() - start) / CORRECT_HOLD_MS) * 100);
            setHoldProgress(pct);
        }, 50);
    }, []);

    // ── Internal cleanup (does not touch state, just closes resources) ────────
    const cleanup = useCallback(() => {
        if (frameIntervalRef.current) {
            clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = null;
        }
        if (holdTimerRef.current) {
            clearInterval(holdTimerRef.current);
            holdTimerRef.current = null;
        }
        if (wsRef.current) {
            // Remove handlers first to avoid state updates during cleanup
            wsRef.current.onopen = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        correctSinceRef.current = null;
    }, []);

    // ── Connect ────────────────────────────────────────────────────────────────
    const connect = useCallback(() => {
        // Guard against double-connect
        if (wsRef.current) return;

        setStatus("connecting");
        const url = `wss://api.dezzex.ae/ws/car-side/${userId}/${uniqueId}/`;
        console.log("[WS] Connecting to", url);
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log("[WS] Connected");
            setStatus("connected");

            // Start the frame-sending loop
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
            frameIntervalRef.current = setInterval(() => {
                // Read latest state from refs — no stale closure
                if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

                const side = SIDE_ORDER[currentSideIndexRef.current];
                if (!side) return;

                const video = videoRef.current;
                const canvas = canvasRef.current;
                if (!video || !canvas || video.readyState < 2) return;

                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext("2d").drawImage(video, 0, 0);
                const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

                wsRef.current.send(JSON.stringify({ type: side, image: base64 }));
            }, FRAME_INTERVAL_MS);
        };

        ws.onmessage = (event) => {
            // This handler reads everything from refs — never stale
            try {
                const data = JSON.parse(event.data);
                setBbox(data.bbox && Array.isArray(data.bbox) ? data.bbox : null);
                setLastResponse(data);

                if (data.correct) {
                    // Start hold timer on first correct detection
                    if (!correctSinceRef.current) {
                        correctSinceRef.current = Date.now();
                        // Inline hold timer start
                        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
                        const start = Date.now();
                        holdTimerRef.current = setInterval(() => {
                            const pct = Math.min(100, ((Date.now() - start) / CORRECT_HOLD_MS) * 100);
                            setHoldProgress(pct);
                        }, 50);
                    }

                    const elapsed = Date.now() - correctSinceRef.current;
                    if (elapsed >= CORRECT_HOLD_MS) {
                        // ── AUTO-CAPTURE ──
                        if (holdTimerRef.current) {
                            clearInterval(holdTimerRef.current);
                            holdTimerRef.current = null;
                        }
                        setHoldProgress(0);
                        correctSinceRef.current = null;

                        // Capture high-quality frame
                        const video = videoRef.current;
                        const canvas = canvasRef.current;
                        if (video && canvas && video.readyState >= 2) {
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            canvas.getContext("2d").drawImage(video, 0, 0);
                            const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

                            const side = SIDE_ORDER[currentSideIndexRef.current];
                            const updated = { ...capturedSidesRef.current, [side]: dataUrl };
                            setCapturedSides(updated);
                            capturedSidesRef.current = updated;
                            setBbox(null);

                            const nextIndex = currentSideIndexRef.current + 1;
                            if (nextIndex >= SIDE_ORDER.length) {
                                // All sides captured — done!
                                setStatus("done");
                                setCurrentSideIndex(nextIndex);

                                // Stop frame loop
                                if (frameIntervalRef.current) {
                                    clearInterval(frameIntervalRef.current);
                                    frameIntervalRef.current = null;
                                }

                                // Close WS
                                if (wsRef.current) {
                                    wsRef.current.onclose = null; // prevent onclose handler from re-triggering
                                    wsRef.current.close();
                                    wsRef.current = null;
                                }

                                // Notify parent (read from ref for latest callback)
                                const cb = onAllCapturedRef.current;
                                if (cb) {
                                    const photos = SIDE_ORDER.map((s) => ({
                                        sideId: s,
                                        label: SIDE_LABELS[s],
                                        dataUrl: updated[s],
                                    }));
                                    cb(photos);
                                }
                            } else {
                                setCurrentSideIndex(nextIndex);
                                currentSideIndexRef.current = nextIndex;
                            }
                        }
                    }
                } else {
                    // Wrong side — reset the hold
                    correctSinceRef.current = null;
                    if (holdTimerRef.current) {
                        clearInterval(holdTimerRef.current);
                        holdTimerRef.current = null;
                    }
                    setHoldProgress(0);
                }
            } catch (err) {
                console.warn("[WS] Message parse error:", err);
            }
        };

        ws.onerror = (err) => {
            console.error("[WS] Error:", err);
            setStatus("error");
        };

        ws.onclose = (event) => {
            console.log("[WS] Closed:", event.code, event.reason);
            if (frameIntervalRef.current) {
                clearInterval(frameIntervalRef.current);
                frameIntervalRef.current = null;
            }
            if (holdTimerRef.current) {
                clearInterval(holdTimerRef.current);
                holdTimerRef.current = null;
            }
            // Only set idle if we didn't explicitly finish
            if (statusRef.current !== "done") {
                setStatus("idle");
            }
        };

        wsRef.current = ws;
    }, [userId, uniqueId]); // Only depends on URL params — stable!

    // ── Disconnect ─────────────────────────────────────────────────────────────
    const disconnect = useCallback(() => {
        cleanup();
        setStatus("idle");
        setHoldProgress(0);
    }, [cleanup]);

    // ── Unmount cleanup ────────────────────────────────────────────────────────
    // Use a ref to avoid the cleanup effect re-running on dependency changes
    useEffect(() => {
        return () => {
            // Directly clean up resources on unmount — no dependency on callback refs
            if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
            if (holdTimerRef.current) clearInterval(holdTimerRef.current);
            if (wsRef.current) {
                wsRef.current.onopen = null;
                wsRef.current.onmessage = null;
                wsRef.current.onerror = null;
                wsRef.current.onclose = null;
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, []); // Empty deps — only runs on true unmount

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
        holdProgress,
        status,
        connect,
        disconnect,
    };
}
