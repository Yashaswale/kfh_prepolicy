import imageCompression from "browser-image-compression";

/**
 * EXIF Orientation → canvas transform lookup.
 *
 * EXIF spec:
 *   1 = upright (no change)
 *   2 = flip horizontal
 *   3 = rotate 180°
 *   4 = flip vertical
 *   5 = rotate 90° CW  + flip horizontal  (transpose)
 *   6 = rotate 90° CW
 *   7 = rotate 90° CCW + flip horizontal  (transverse)
 *   8 = rotate 90° CCW
 *
 * Common camera cases:
 *   iPhone portrait            → orientation 6  (rotate 90° CW)
 *   iPhone landscape left      → orientation 1  (no rotation needed)
 *   iPhone landscape right     → orientation 3  (rotate 180°)
 *   Android portrait           → orientation 6
 *   Android landscape upside-down → orientation 8
 */
const EXIF_TRANSFORMS = {
    1: { rotate: 0,   flipX: false, flipY: false },
    2: { rotate: 0,   flipX: true,  flipY: false },
    3: { rotate: 180, flipX: false, flipY: false },
    4: { rotate: 0,   flipX: false, flipY: true  },
    5: { rotate: 90,  flipX: true,  flipY: false },
    6: { rotate: 90,  flipX: false, flipY: false },
    7: { rotate: 270, flipX: true,  flipY: false },
    8: { rotate: 270, flipX: false, flipY: false },
};

// ─── EXIF parser ────────────────────────────────────────────────────────────

/**
 * Reads the EXIF Orientation tag directly from raw image bytes.
 * Handles both little-endian (II / Intel) and big-endian (MM / Motorola) TIFF.
 *
 * @param {ArrayBuffer} buffer
 * @returns {number} 1–8 (defaults to 1 = upright when tag is missing/unreadable)
 */
function readExifOrientation(buffer) {
    try {
        const view = new DataView(buffer);

        // Must be a JPEG (SOI = 0xFFD8)
        if (view.getUint16(0) !== 0xffd8) return 1;

        let offset = 2;

        while (offset + 4 <= view.byteLength) {
            const marker      = view.getUint16(offset);
            const segmentLen  = view.getUint16(offset + 2); // includes the 2-byte length field

            // APP1 marker — may contain EXIF
            if (marker === 0xffe1) {
                const dataStart = offset + 4; // skip marker (2) + length (2)

                // Verify "Exif\0\0" header
                const header = String.fromCharCode(
                    view.getUint8(dataStart),
                    view.getUint8(dataStart + 1),
                    view.getUint8(dataStart + 2),
                    view.getUint8(dataStart + 3),
                );
                if (header !== "Exif") break; // not an EXIF APP1 segment

                // TIFF header begins right after "Exif\0\0" (6 bytes)
                const tiff   = dataStart + 6;
                const isLE   = view.getUint16(tiff) === 0x4949; // "II" = little-endian

                // IFD0 offset is relative to the start of the TIFF header
                const ifd0   = tiff + view.getUint32(tiff + 4, isLE);
                const count  = view.getUint16(ifd0, isLE);

                for (let i = 0; i < count; i++) {
                    const entry = ifd0 + 2 + i * 12;
                    if (entry + 12 > view.byteLength) break;

                    const tag = view.getUint16(entry, isLE);

                    // 0x0112 = Orientation tag
                    if (tag === 0x0112) {
                        // Value is a SHORT (uint16) stored in the 4-byte value/offset field.
                        // For big-endian, the uint16 occupies bytes 8-9 of the entry.
                        // For little-endian, same bytes but reversed — getUint16 handles it.
                        const val = view.getUint16(entry + 8, isLE);
                        return val >= 1 && val <= 8 ? val : 1;
                    }
                }
                break;
            }

            // Skip to next segment
            offset += 2 + segmentLen;
        }
    } catch {
        // Corrupt EXIF — treat as upright
    }
    return 1;
}

// ─── Canvas helpers ─────────────────────────────────────────────────────────

/**
 * THE KEY FIX: uses `createImageBitmap` with `imageOrientation: "none"` to
 * decode the image WITHOUT the browser's automatic EXIF orientation correction.
 *
 * Problem with the old approach (new Image() → draw to canvas):
 *   Modern browsers apply `image-orientation: from-image` by default.
 *   So `img.naturalWidth/naturalHeight` and the canvas pixels are ALREADY
 *   rotated by the browser. If we then ALSO rotate by EXIF value, we get
 *   double rotation → wrong output.
 *
 * Fix: `createImageBitmap(blob, { imageOrientation: "none" })` gives us the
 *   raw, unrotated pixel data from the file. We apply the EXIF transform once,
 *   producing a correctly-oriented canvas.
 *
 * @param {Blob|File} blob
 * @param {number}    orientation  EXIF orientation 1–8
 * @returns {Promise<HTMLCanvasElement>}
 */
async function createOrientedCanvas(blob, orientation) {
    const { rotate, flipX, flipY } = EXIF_TRANSFORMS[orientation] ?? EXIF_TRANSFORMS[1];
    const isRotated = rotate === 90 || rotate === 270;

    // --------------------------------------------------------------------------
    // Get RAW pixels — no browser auto-orientation.
    // `imageOrientation: "none"` is supported in Chrome 79+, Firefox 90+,
    // Safari 15+. For older browsers the option is silently ignored, which may
    // produce double-rotation; the try/catch below handles that gracefully.
    // --------------------------------------------------------------------------
    let bitmap;
    try {
        bitmap = await createImageBitmap(blob, { imageOrientation: "none" });
    } catch {
        // Older browser: createImageBitmap doesn't accept options.
        // Fall back — auto-orientation is already applied, so skip our rotation.
        bitmap = await createImageBitmap(blob);
        // Draw raw (browser already corrected it), no extra transform needed.
        const fallbackCanvas = document.createElement("canvas");
        fallbackCanvas.width  = bitmap.width;
        fallbackCanvas.height = bitmap.height;
        fallbackCanvas.getContext("2d").drawImage(bitmap, 0, 0);
        bitmap.close();
        return fallbackCanvas;
    }

    const srcW = bitmap.width;   // raw pixel width  (pre-rotation)
    const srcH = bitmap.height;  // raw pixel height (pre-rotation)

    // Canvas dimensions swap for 90/270° rotations
    const canvas    = document.createElement("canvas");
    canvas.width    = isRotated ? srcH : srcW;
    canvas.height   = isRotated ? srcW : srcH;

    const ctx = canvas.getContext("2d");

    // Apply transform around the canvas centre
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    if (rotate) ctx.rotate((rotate * Math.PI) / 180);
    if (flipX)  ctx.scale(-1,  1);
    if (flipY)  ctx.scale( 1, -1);
    ctx.drawImage(bitmap, -srcW / 2, -srcH / 2);
    ctx.restore();

    bitmap.close(); // free GPU memory

    return canvas;
}

/**
 * Converts a canvas to a File/Blob.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {string} fileName
 * @param {string} [mimeType="image/jpeg"]
 * @param {number} [quality=0.92]
 * @returns {Promise<File>}
 */
function canvasToFile(canvas, fileName, mimeType = "image/jpeg", quality = 0.92) {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new Error("canvas.toBlob() produced null — canvas may be tainted or empty."));
                    return;
                }
                resolve(new File([blob], fileName, { type: mimeType }));
            },
            mimeType,
            quality,
        );
    });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * normalizeAndCompressImage
 * ─────────────────────────
 * Fixes EXIF orientation and compresses an image file before upload.
 *
 * Pipeline:
 *   1. Validate — must be an image file.
 *   2. Parse EXIF orientation from raw bytes (DataView, no library dependency).
 *   3. If orientation ≠ 1:
 *      a. Decode the file to RAW pixels using `createImageBitmap({ imageOrientation: "none" })`
 *         — this bypasses the browser's automatic EXIF correction, preventing double-rotation.
 *      b. Draw onto a canvas with the exact counter-rotation needed.
 *      c. Export the canvas as a new JPEG File (no EXIF → always orientation 1).
 *   4. Compress with `browser-image-compression`:
 *      - maxSizeMB: 2
 *      - maxWidthOrHeight: 1920px
 *      - exifOrientation: 1 (tells the library "already upright — don't rotate again")
 *   5. Return a File ready for FormData / fetch.
 *
 * @param {File} file  Raw file from <input type="file"> or camera capture.
 * @returns {Promise<File>}
 * @throws {Error} if file is not an image or processing fails.
 *
 * @example
 * const normalized = await normalizeAndCompressImage(inputFile);
 * const fd = new FormData();
 * fd.append("photo", normalized);
 * await fetch("/api/upload", { method: "POST", body: fd });
 */
export async function normalizeAndCompressImage(file) {
    // ── 1. Validate ─────────────────────────────────────────────────────────
    if (!file || !file.type.startsWith("image/")) {
        throw new Error(
            `Invalid file: "${file?.name ?? "(none)"}" is not an image (type: "${file?.type ?? "unknown"}").`,
        );
    }

    // ── 2. Read EXIF orientation (raw bytes, no library) ────────────────────
    const buffer      = await file.arrayBuffer();
    const orientation = readExifOrientation(buffer);

    console.debug(`[imageUtils] EXIF orientation = ${orientation} for "${file.name}"`);

    // ── 3. Correct orientation ───────────────────────────────────────────────
    let workingFile = file;

    if (orientation !== 1) {
        const correctedCanvas = await createOrientedCanvas(file, orientation);
        // Canvas output carries NO EXIF → implicitly orientation 1
        workingFile = await canvasToFile(correctedCanvas, file.name, "image/jpeg");
        console.debug(`[imageUtils] Orientation corrected (${orientation} → 1) for "${file.name}"`);
    }

    // ── 4. Compress ──────────────────────────────────────────────────────────
    const compressedBlob = await imageCompression(workingFile, {
        maxSizeMB:        2,
        maxWidthOrHeight: 1920,
        useWebWorker:     true,
        fileType:         "image/jpeg",
        initialQuality:   0.85,
        // Critical: the file we're passing is already orientation-1.
        // Tell the library NOT to apply any further EXIF rotation.
        exifOrientation:  1,
    });

    const outName = file.name.replace(/\.[^.]+$/, "") + "_normalized.jpg";
    const result  = new File([compressedBlob], outName, { type: "image/jpeg" });

    console.debug(
        `[imageUtils] Done: "${file.name}" ${(file.size / 1024).toFixed(0)} KB → ` +
        `"${outName}" ${(result.size / 1024).toFixed(0)} KB`,
    );

    return result;
}
