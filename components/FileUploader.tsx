"use client";

import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { useController, FieldValues } from "react-hook-form";
import { FileText, Loader2, Plus, X } from "lucide-react";
import { FileUploadFieldProps } from "@/types";
import { cn } from "@/lib/utils";
import { FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const renderPdfFirstPage = async (file: File) => {
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
    ).toString();

    const buffer = await file.arrayBuffer();
    const pdfDocument = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;

    try {
        const page = await pdfDocument.getPage(1);
        const viewport = page.getViewport({ scale: 0.6 });
        const canvas = window.document.createElement("canvas");
        const context = canvas.getContext("2d");

        if (!context) throw new Error("Could not render PDF preview.");

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;

        return canvas.toDataURL("image/png");
    } finally {
        await pdfDocument.destroy();
    }
};

const SourcePreviewCard = ({
    file,
    onRemove,
    disabled,
}: {
    file: File;
    onRemove: (event: React.MouseEvent) => void;
    disabled?: boolean;
}) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const [isPreviewLoading, setIsPreviewLoading] = useState(isPdf);

    useEffect(() => {
        let cancelled = false;

        if (!isPdf) return;

        renderPdfFirstPage(file)
            .then((url) => {
                if (!cancelled) setPreviewUrl(url);
            })
            .catch((error) => {
                console.error("Failed to render PDF preview", error);
                if (!cancelled) setPreviewUrl(null);
            })
            .finally(() => {
                if (!cancelled) setIsPreviewLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [file, isPdf]);

    return (
        <div className="relative flex w-[168px] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-elevated)] shadow-sm">
            <button
                type="button"
                onClick={onRemove}
                disabled={disabled}
                className="absolute right-2 top-2 z-10 flex size-7 items-center justify-center rounded-full bg-[var(--surface-elevated)] text-red-500 shadow-sm ring-1 ring-red-500/15 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
                <X className="size-4" />
                <span className="sr-only">Remove {file.name}</span>
            </button>

            <div className="flex h-32 w-full items-center justify-center bg-[var(--bg-secondary)]">
                {isPdf && isPreviewLoading ? (
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                        <Loader2 className="size-6 animate-spin" />
                        <span className="text-xs font-medium">Previewing</span>
                    </div>
                ) : isPdf && previewUrl ? (
                    <img
                        src={previewUrl}
                        alt={`${file.name} first page preview`}
                        className="h-full w-full object-contain"
                    />
                ) : (
                    <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
                        <FileText className="size-8" />
                        <span className="text-xs font-medium">Source</span>
                    </div>
                )}
            </div>

            <div className="border-t border-[var(--border-subtle)] px-3 py-2">
                <p className="truncate text-xs font-semibold text-[var(--text-primary)]" title={file.name}>
                    {file.name}
                </p>
            </div>
        </div>
    );
};

const toFileArray = (value: unknown, multiple?: boolean) => {
    if (multiple) return Array.isArray(value) ? (value as File[]) : [];
    return value instanceof File ? [value] : [];
};

const FileUploader = <T extends FieldValues>({
    control,
    name,
    label,
    acceptTypes,
    disabled,
    multiple,
    icon: Icon,
    placeholder,
    hint,
}: FileUploadFieldProps<T>) => {
    const {
        field: { onChange, value },
    } = useController({ name, control });

    const inputRef = useRef<HTMLInputElement>(null);
    const inputId = useId();
    const [isDragging, setIsDragging] = useState(false);
    const files = toFileArray(value, multiple);
    const isUploaded = files.length > 0;

    const appendFiles = useCallback(
        (nextFiles: FileList | File[]) => {
            const incomingFiles = Array.from(nextFiles);
            if (incomingFiles.length === 0) return;

            if (!multiple) {
                onChange(incomingFiles[0]);
                return;
            }

            const existingKeys = new Set(files.map((file) => `${file.name}-${file.size}-${file.lastModified}`));
            const uniqueIncomingFiles = incomingFiles.filter(
                (file) => !existingKeys.has(`${file.name}-${file.size}-${file.lastModified}`),
            );

            onChange([...files, ...uniqueIncomingFiles]);
        },
        [files, multiple, onChange],
    );

    const handleFileChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files) {
                appendFiles(event.target.files);
            }

            if (inputRef.current) {
                inputRef.current.value = "";
            }
        },
        [appendFiles],
    );

    const removeFile = useCallback(
        (index: number) => (event: React.MouseEvent) => {
            event.stopPropagation();

            if (!multiple) {
                onChange(null);
                return;
            }

            onChange(files.filter((_, fileIndex) => fileIndex !== index));
        },
        [files, multiple, onChange],
    );

    const handleDrop = useCallback(
        (event: React.DragEvent<HTMLDivElement>) => {
            event.preventDefault();
            setIsDragging(false);

            if (disabled) return;

            appendFiles(event.dataTransfer.files);
        },
        [appendFiles, disabled],
    );

    return (
        <FormItem className="w-full">
            <FormLabel htmlFor={inputId} className="form-label">{label}</FormLabel>
            <FormControl>
                <div
                    className={cn(
                        "upload-dropzone h-auto min-h-[200px] w-full max-w-full overflow-hidden border-2 border-dashed border-[var(--border-medium)] p-5",
                        isUploaded && "upload-dropzone-uploaded",
                        isDragging && "border-[#d97757] bg-[#d97757]/10",
                    )}
                    onClick={() => !disabled && inputRef.current?.click()}
                    onKeyDown={(event) => {
                        if (disabled || (event.key !== "Enter" && event.key !== " ")) return;
                        event.preventDefault();
                        inputRef.current?.click();
                    }}
                    role="button"
                    tabIndex={disabled ? -1 : 0}
                    aria-disabled={disabled}
                    onDragEnter={(event) => {
                        event.preventDefault();
                        if (!disabled) setIsDragging(true);
                    }}
                    onDragOver={(event) => {
                        event.preventDefault();
                        if (!disabled) setIsDragging(true);
                    }}
                    onDragLeave={(event) => {
                        event.preventDefault();
                        setIsDragging(false);
                    }}
                    onDrop={handleDrop}
                >
                    <input
                        id={inputId}
                        type="file"
                        accept={acceptTypes.join(",")}
                        className="hidden"
                        ref={inputRef}
                        onChange={handleFileChange}
                        disabled={disabled}
                        multiple={multiple}
                    />

                    {isUploaded ? (
                        <div className="flex w-full min-w-0 max-w-full flex-col gap-4 overflow-hidden">
                            <div className="source-preview-rail flex w-full min-w-0 max-w-full gap-3 overflow-x-auto overflow-y-hidden pb-3">
                                {files.map((file, index) => (
                                    <SourcePreviewCard
                                        key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                                        file={file}
                                        disabled={disabled}
                                        onRemove={removeFile(index)}
                                    />
                                ))}

                                {multiple && (
                                    <button
                                        type="button"
                                        disabled={disabled}
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            inputRef.current?.click();
                                        }}
                                        className="flex h-[168px] w-[140px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border-medium)] bg-[var(--bg-secondary)] text-sm font-semibold text-[var(--text-muted)] transition hover:border-[#d97757] hover:text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <Plus className="size-5" />
                                        Add more
                                    </button>
                                )}
                            </div>
                            <p className="text-center text-xs font-medium text-[var(--text-muted)]">
                                {multiple
                                    ? `${files.length} source file${files.length === 1 ? "" : "s"} selected`
                                    : "1 source file selected"}
                            </p>
                        </div>
                    ) : (
                        <>
                            <Icon className="upload-dropzone-icon" />
                            <p className="upload-dropzone-text">{isDragging ? "Drop files to upload" : placeholder}</p>
                            <p className="upload-dropzone-hint">{isDragging ? "Release to attach these sources" : hint}</p>
                        </>
                    )}
                </div>
            </FormControl>
            <FormMessage />
        </FormItem>
    );
};

export default FileUploader;
