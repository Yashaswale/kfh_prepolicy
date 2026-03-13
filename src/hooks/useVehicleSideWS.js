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
    // Track capture step: 0=front,1=rear,2=any,3=any
    const [captureStep, setCaptureStep] = useState(0);
    const captureStepRef = useRef(captureStep);
    // Track how many attempts per step (for forced progression after repeated failures)
    const [attempts, setAttempts] = useState({});

    // ── Refs ───────────────────────────────────────────────────────────────────
    const wsRef = useRef(null);
    const pendingPhotoRef = useRef(null);
    const captureResultRef = useRef("idle");
    const attemptsRef = useRef({});
    const videoRef = useRef(null);
    const canvasRef = useRef(null);

    // Mutable refs — always hold latest values
    const capturedSidesRef = useRef({});
    const onAllCapturedRef = useRef(onAllCaptured);
    const statusRef = useRef("idle");
    const advanceSideRef = useRef(null);

    const currentSideIndex = captureStep;
    const currentSide = SIDE_ORDER[currentSideIndex] || null;
    const currentSideRef = useRef(currentSide);

    useEffect(() => { currentSideRef.current = currentSide; }, [currentSide]);
    useEffect(() => { captureStepRef.current = captureStep; }, [captureStep]);
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

        const side = currentSideRef.current || "any";

        // Track attempts so we can force progress after repeated failures
        setAttempts((prev) => {
            const key = `step_${captureStepRef.current}`;
            const next = { ...prev, [key]: (prev[key] || 0) + 1 };
            attemptsRef.current = next;
            return next;
        });

        // Take high-quality photo and rotate 90 degrees anticlockwise
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext("2d").drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);

        // Always rotate images 90 degrees anticlockwise
        const outgoingDataUrl = await rotateDataUrl(dataUrl, -90);

        const base64 = outgoingDataUrl.split(",")[1];

        // Store pending photo
        setPendingPhoto(outgoingDataUrl);
        setCaptureResult("verifying");
        setBbox(null);

        // Send to WS for validation
        wsRef.current.send(JSON.stringify({ type: side, image: base64 }));
    }, [rotateDataUrl]);

    const advanceSide = useCallback((force = false) => {
        const photo = pendingPhotoRef.current;
        const result = captureResultRef.current;
        if (!photo) return;
        if (!force && result !== "success") return;

        // Store the photo against the currently expected side
        const side = currentSideRef.current;
        const updated = { ...capturedSidesRef.current, [side]: photo };
        setCapturedSides(updated);
        capturedSidesRef.current = updated;

        setPendingPhoto(null);
        pendingPhotoRef.current = null; // synchronous update to prevent race conditions
        setPendingDetectedSide(null);
        setCaptureResult("idle");
        setBbox(null);
        setLastResponse(null);

        // Reset attempt counter for this step when moving on
        setAttempts((prev) => {
            const next = { ...prev };
            delete next[`step_${captureStepRef.current}`];
            attemptsRef.current = next;
            return next;
        });

        const nextStep = captureStepRef.current + 1;
        setCaptureStep(nextStep);
        captureStepRef.current = nextStep; // Keep ref immediately updated too

        if (nextStep >= 4) {
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

    useEffect(() => {
        advanceSideRef.current = advanceSide;
    }, [advanceSide]);

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
            try {
                const data = JSON.parse(event.data);
                setBbox(data.bbox && Array.isArray(data.bbox) ? data.bbox : null);
                setLastResponse(data);

                const detectedSide = data.detected || currentSideRef.current;
                setPendingDetectedSide(detectedSide);

                const attemptKey = `step_${captureStepRef.current}`;
                const attemptsForSide = attemptsRef.current[attemptKey] || 0;

                const expectedSide = currentSideRef.current;
                
                // Success implies it's explicitly correct from the backend, 
                // or the detected side matches what we expect
                const isSuccess = data.correct === true || 
                                 (data.detected && data.detected.toLowerCase() === expectedSide.toLowerCase());

                if (isSuccess) {
                    setCaptureResult("success");
                } else {
                    setCaptureResult("failed");

                    // If the user has tried 3+ times for this side, auto-advance to keep flow moving
                    if (attemptsForSide >= 3) {
                        setTimeout(() => {
                            if (advanceSideRef.current) advanceSideRef.current(true);
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
        status,
        connect,
        disconnect,
        captureAndVerify,
        acceptAndNext,
        retryCapture,
    };
}

