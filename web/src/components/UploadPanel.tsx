import { useEffect, useRef, useState, type DragEvent } from "react";
import type { DraftInvoice } from "../../../shared/types"
import { extractInvoice, fetchQuota, QuotaExhaustedError } from "../api";

const MAX_BYTES = 2 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];

interface Props {
    onExtracted: (draft: DraftInvoice, fileName: string) => void;
}

export default function UploadPanel({ onExtracted }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [remaining, setRemaining] = useState<number | null>(null);

    useEffect(() => {
        fetchQuota().then(setRemaining).catch(() => setRemaining(null));
    }, []);

    const exhausted = remaining === 0;
    async function handleFile(file: File) {
        setError(null);
        if (exhausted) return;
        if (!ACCEPTED.includes(file.type)) { setError("Upload a PDF, PNG or JPEG."); return;}
        if (file.size > MAX_BYTES) {setError("That file is over the 2 MB limit."); return;}

        setBusy(true);
        try {
            const { draft, remaining: left} = await extractInvoice(file);
            if (left !== null) setRemaining(left);
            onExtracted(draft, file.name);
        } catch (err) {
            if (err instanceof QuotaExhaustedError) setRemaining(0)
            setError(err instanceof Error ? err.message : "Could not read that document.");
        } finally {
            setBusy(false);
        }
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        if (exhausted) return;
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }
    return (
        <div
            className={dragging ? "dropzone dropsone-active" : "dropzone"}
            onDragOver={(e) => { if (!exhausted) { e.preventDefault(); setDragging(true); }}}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                hidden
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFile(file);
                    e.target.value = "";
                }}
            />

            {busy ? (
                <p className="dropzone-text">Reading document...</p>
            ) : exhausted ? (
                <p className="dropzone-text">Daily scan limit reached. Please enter details manually below.</p>
            ) : (
                <>
                    <p className="dropzone-text">Drop an invoice here, or</p>
                    <button type="button" onClick={() => inputRef.current?.click()}>Choose file</button>
                    <p className="dropzone-hint">PDF, PNG or JPEG | 2 MB max</p>
                </>
            )}

            {remaining !== null && remaining > 0 && (
                <p className={remaining <= 5 ? "quota quota-low": "quota"}>
                    {remaining} document {remaining === 1 ? "scan" : "scans"} left today
                </p>
            )}

            {error && <p className="error">{error}</p>}
        </div>
    )
}
