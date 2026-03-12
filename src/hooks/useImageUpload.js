import { useState, useCallback, useRef } from "react";
import { normalizeAndCompressImage } from "../utils/imageUtils";

/**
 * useImageUpload
 * ──────────────
 * Custom hook that wraps `normalizeAndCompressImage` with React state
 * management. Handles:
 *   - File validation (only images accepted)
 *   - EXIF orientation correction (upright for all device rotations)
 *   - Compression (≤ 2 MB, ≤ 1920 px)
 *   - Loading and error states
 *   - Preview URL generation
 *   - Cleanup of object URLs to prevent memory leaks
 *
 * @returns {object} hook API
 *
 * @example
 * const { processImage, file, previewUrl, isProcessing, error, reset } = useImageUpload();
 *
 * // In a form submit:
 * const formData = new FormData();
 * formData.append("photo", file);  // file is a corrected File object
 *
 * // Or attach the ref to an <input type="file">:
 * <input ref={inputRef} type="file" accept="image/*" capture="environment"
 *        onChange={(e) => processImage(e.target.files[0])} />
 */
export default function useImageUpload() {
    const [file, setFile]             = useState(null);   // normalized File
    const [previewUrl, setPreviewUrl] = useState(null);   // object URL for <img src>
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError]           = useState(null);   // string | null

    // Keep a ref to the last object URL so we can revoke it on the next call
    const prevPreviewRef = useRef(null);

    /**
     * processImage
     * ────────────
     * Main entry point. Pass a File from an input's FileList.
     *
     * @param {File|null|undefined} rawFile
     * @returns {Promise<File|null>} The normalized File, or null on failure.
     */
    const processImage = useCallback(async (rawFile) => {
        // Reset previous state
        setError(null);
        setFile(null);

        // Revoke previous preview URL to avoid memory leaks
        if (prevPreviewRef.current) {
            URL.revokeObjectURL(prevPreviewRef.current);
            prevPreviewRef.current = null;
            setPreviewUrl(null);
        }

        if (!rawFile) return null;

        // Quick client-side MIME check before heavier processing
        if (!rawFile.type.startsWith("image/")) {
            setError(`"${rawFile.name}" is not a supported image file.`);
            return null;
        }

        setIsProcessing(true);

        try {
            const normalizedFile = await normalizeAndCompressImage(rawFile);

            // Generate a preview URL for UI display
            const url = URL.createObjectURL(normalizedFile);
            prevPreviewRef.current = url;

            setFile(normalizedFile);
            setPreviewUrl(url);

            return normalizedFile;
        } catch (err) {
            const message =
                err?.message ||
                "An unexpected error occurred while processing the image.";
            console.error("[useImageUpload] Processing failed:", err);
            setError(message);
            return null;
        } finally {
            setIsProcessing(false);
        }
    }, []);

    /**
     * reset
     * ─────
     * Clears all state and revokes preview URLs.
     * Call this when the user cancels or you need to clear the form.
     */
    const reset = useCallback(() => {
        if (prevPreviewRef.current) {
            URL.revokeObjectURL(prevPreviewRef.current);
            prevPreviewRef.current = null;
        }
        setFile(null);
        setPreviewUrl(null);
        setIsProcessing(false);
        setError(null);
    }, []);

    return {
        /** Normalized + compressed File, ready for FormData. Null until processImage succeeds. */
        file,
        /** Object URL suitable for <img src={previewUrl} />. Null until processImage succeeds. */
        previewUrl,
        /** True while the image is being corrected and compressed. */
        isProcessing,
        /** Error string if processing failed, otherwise null. */
        error,
        /** Call with a File (e.g. from e.target.files[0]) to process it. */
        processImage,
        /** Clears all state. */
        reset,
    };
}
