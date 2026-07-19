import { useRef, useState, type DragEvent } from "react";
import type { DraftInvoice } from "../../../shared/types"
import { extractInvoice } from "../api";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];

interface Props {
    onExtracted: (draft: DraftInvoice, fileName: string) => void;
}

export default function UploadPanel({ onExtracted }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleFile(file: File) {
        setError(null);

        if (!ACCEPTED.includes(file.type)) {
            setError("Upload a PDF, PNG or JPEG.");
            return;
        }
        if (file.size > MAX_BYTES) {
            setError("That file is over the 5 MB limit.");
            return;
        }

        setBusy(true);
        try {
            const draft = await extractInvoice(file);
            onExtracted(draft, file.name);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not read that document.");
        } finally {
            setBusy(false);
        }
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    }
    return (
        <div
            className={dragging ? "dropzone dropsone-active" : "dropzone"}
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
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
            ) : (
                <>
                    <p className="dropzone-text">Drop an invoice here, or</p>
                    <button type="button" onClick={() => inputRef.current?.click()}>
                        Choose file
                    </button>
                    <p className="dropzone-hint">PDF, PNG or JPEG | 5 MB max</p>
                </>
            )}

            {error && <p className="error">{error}</p>}
        </div>
    )
}
