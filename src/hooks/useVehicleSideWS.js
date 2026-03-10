import { useRef, useState, useCallback, useEffect } from "react";

/**
 * WebSocket-based live vehicle side detection hook.
 *
 * Uses a SEND → WAIT → RESPOND → SEND pattern:
 *   1. Send one frame to the server.
 *   2. Wait for the response (no new frames sent while waiting).
 *   3. Process the response (bbox, correct/incorrect, auto-capture).
 *   4. After a small delay, send the next frame.
 *
 * This avoids flooding the server and ensures responses stay in sync.
 */

const SIDE_ORDER = ["front", "rear", "left", "right"];
const SIDE_LABELS = {
    front: "Front of Vehicle",
    rear: "Rear of Vehicle",
    left: "Left Side",
    right: "Right Side",
};
const CORRECT_HOLD_MS = 1000; // hold for 1 second to auto-capture
const SEND_DELAY_MS = 100;   // delay between receiving a response and sending next frame

export default function useVehicleSideWS({ userId, uniqueId, onAllCaptured }) {
    // ── State ──────────────────────────────────────────────────────────────────
    const [currentSideIndex, setCurrentSideIndex] = useState(0);
    const [bbox, setBbox] = useState(null);
    const [lastResponse, setLastResponse] = useState(null);
    const [capturedSides, setCapturedSides] = useState({});
    const [status, setStatus] = useState("idle");
    const [holdProgress, setHoldProgress] = useState(0);

    // ── Refs ───────────────────────────────────────────────────────────────────
    const wsRef = useRef(null);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const sendTimeoutRef = useRef(null);
    const correctSinceRef = useRef(null);
    const holdTimerRef = useRef(null);
    const waitingRef = useRef(false); // true = a frame is in-flight, waiting for response

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
        if (waitingRef.current) return;               // already waiting for a response
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

        const side = SIDE_ORDER[currentSideIndexRef.current];
        if (!side) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || video.readyState < 2) {
            // Video not ready — retry shortly
            sendTimeoutRef.current = setTimeout(sendOneFrame, 200);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const base64 = canvas.toDataURL("image/jpeg", 0.7).split(",")[1];

        waitingRef.current = true;
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
        if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
        if (wsRef.current) {
            wsRef.current.onopen = null;
            wsRef.current.onmessage = null;
            wsRef.current.onerror = null;
            wsRef.current.onclose = null;
            wsRef.current.close();
            wsRef.current = null;
        }
        correctSinceRef.current = null;
        waitingRef.current = false;
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
            waitingRef.current = false;
            // Send the first frame after a short delay to let video stabilize
            sendTimeoutRef.current = setTimeout(sendOneFrame, 300);
        };

        ws.onmessage = (event) => {
            // ── Response received — unlock sending ──
            waitingRef.current = false;

            try {
                const data = JSON.parse(event.data);
                setBbox(data.bbox && Array.isArray(data.bbox) ? data.bbox : null);
                setLastResponse(data);

                if (data.correct) {
                    // First correct detection → start hold timer
                    if (!correctSinceRef.current) {
                        correctSinceRef.current = Date.now();
                        if (holdTimerRef.current) clearInterval(holdTimerRef.current);
                        const start = Date.now();
                        holdTimerRef.current = setInterval(() => {
                            setHoldProgress(Math.min(100, ((Date.now() - start) / CORRECT_HOLD_MS) * 100));
                        }, 50);
                    }

                    const elapsed = Date.now() - correctSinceRef.current;
                    if (elapsed >= CORRECT_HOLD_MS) {
                        // ── AUTO-CAPTURE ──────────────────────────────────────────────
                        if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
                        setHoldProgress(0);
                        correctSinceRef.current = null;

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
                                return; // done — don't send more frames
                            } else {
                                setCurrentSideIndex(nextIndex);
                                currentSideIndexRef.current = nextIndex;
                            }
                        }
                    }

                    // Keep going — send next frame
                    scheduleNextSend();
                } else {
                    // Wrong side — reset hold, send next frame
                    correctSinceRef.current = null;
                    if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
                    setHoldProgress(0);
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
            if (holdTimerRef.current) { clearInterval(holdTimerRef.current); holdTimerRef.current = null; }
            waitingRef.current = false;
            if (statusRef.current !== "done") setStatus("idle");
        };

        wsRef.current = ws;
    }, [userId, uniqueId, sendOneFrame, scheduleNextSend]);

    // ── Disconnect ─────────────────────────────────────────────────────────────
    const disconnect = useCallback(() => {
        cleanup();
        setStatus("idle");
        setHoldProgress(0);
    }, [cleanup]);

    // ── Unmount cleanup (empty deps — only on true unmount) ────────────────────
    useEffect(() => {
        return () => {
            if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
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
        holdProgress,
        status,
        connect,
        disconnect,
    };
}
