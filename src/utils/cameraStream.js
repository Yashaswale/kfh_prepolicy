/**
 * Mobile-friendly camera access: strict rear-camera constraints often fail on iOS/Android
 * or when another tab holds the camera. We try progressively looser constraints.
 */
export async function acquireCameraStream(videoExtra = {}) {
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error("Camera API not available");
    err.name = "NotSupportedError";
    throw err;
  }

  const base = typeof videoExtra === "object" && videoExtra !== null ? videoExtra : {};
  const attempts = [
    { video: { facingMode: { ideal: "environment" }, ...base } },
    { video: { facingMode: "environment", ...base } },
    { video: { facingMode: { ideal: "user" }, ...base } },
    { video: Object.keys(base).length ? { ...base } : true },
  ];

  let lastError;
  for (const constraints of attempts) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export function stopMediaStream(stream) {
  stream?.getTracks?.().forEach((t) => t.stop());
}

/**
 * Prompt for location without blocking the rest of the flow on denial / timeout.
 */
export function requestGeolocationOnce(options = {}) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => resolve({ ok: true }),
      () => resolve({ ok: false }),
      {
        timeout: 15000,
        maximumAge: 0,
        enableHighAccuracy: false,
        ...options,
      }
    );
  });
}

export function getGeolocationCoordinates(options = {}) {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ ok: false, error: "Not supported" });
      return;
    }

    const firstOptions = {
      timeout: 10000,
      maximumAge: 300000, // 5 minutes cached position
      enableHighAccuracy: true,
      ...options,
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          ok: true,
          coords: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          }
        });
      },
      (err) => {
        console.warn("First geolocation attempt failed, trying low-accuracy fallback...", err);
        // Fallback: try with enableHighAccuracy: false, longer timeout and cache
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              ok: true,
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
              }
            });
          },
          (err2) => {
            console.error("Fallback geolocation attempt failed:", err2);
            resolve({ ok: false, error: err2.message });
          },
          {
            timeout: 15000,
            maximumAge: 600000, // 10 minutes cache
            enableHighAccuracy: false,
          }
        );
      },
      firstOptions
    );
  });
}

/** i18n translation key (same string in en/ar resources) */
export function cameraErrorToTranslationKey(err) {
  if (!err) return "Could not open the camera. Please try again.";
  const name = err.name || "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "Camera permission denied. Please allow camera access in your browser settings.";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "No camera was found on this device.";
  }
  if (name === "NotReadableError" || name === "TrackStartError" || name === "AbortError") {
    return "Camera is in use or unavailable. Close other apps using the camera and try again.";
  }
  if (name === "NotSupportedError" || name === "TypeError") {
    return "Camera is not supported in this browser.";
  }
  return "Could not open the camera. Please try again.";
}
