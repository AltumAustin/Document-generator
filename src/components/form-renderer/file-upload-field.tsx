"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatFileSize } from "@/lib/utils";

interface FileUploadFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  accept?: string;
  maxSizeMB?: number;
  disabled?: boolean;
}

interface UploadedFile {
  url: string;
  name: string;
  size: number;
}

const DEFAULT_ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.gif,.webp";
const DEFAULT_MAX_SIZE_MB = 10;

export function FileUploadField({
  value,
  onChange,
  accept,
  maxSizeMB,
  disabled = false,
}: FileUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(
    value ? { url: value, name: extractFileName(value), size: 0 } : null
  );

  const acceptTypes = accept || DEFAULT_ACCEPT;
  const maxSize = (maxSizeMB || DEFAULT_MAX_SIZE_MB) * 1024 * 1024;

  function extractFileName(url: string): string {
    try {
      const parts = url.split("/");
      return decodeURIComponent(parts[parts.length - 1] || "Uploaded file");
    } catch {
      return "Uploaded file";
    }
  }

  const validateFile = useCallback(
    (file: File): string | null => {
      if (file.size > maxSize) {
        return `File size exceeds ${maxSizeMB || DEFAULT_MAX_SIZE_MB}MB limit`;
      }

      if (acceptTypes !== "*") {
        const extensions = acceptTypes.split(",").map((t) => t.trim().toLowerCase());
        const fileExt = "." + file.name.split(".").pop()?.toLowerCase();
        const mimeMatch = extensions.some((ext) => {
          if (ext.startsWith(".")) {
            return fileExt === ext;
          }
          return file.type.startsWith(ext.replace("*", ""));
        });
        if (!mimeMatch) {
          return `File type not allowed. Accepted: ${acceptTypes}`;
        }
      }

      return null;
    },
    [acceptTypes, maxSize, maxSizeMB]
  );

  const uploadFile = useCallback(
    async (file: File) => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress since fetch does not natively support it
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || "Upload failed");
        }

        const data = await response.json();
        setUploadProgress(100);

        const uploaded: UploadedFile = {
          url: data.url,
          name: file.name,
          size: file.size,
        };

        setUploadedFile(uploaded);
        onChange(data.url);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Upload failed. Please try again."
        );
      } finally {
        setIsUploading(false);
        setTimeout(() => setUploadProgress(0), 500);
      }
    },
    [onChange, validateFile]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled && !isUploading) {
        setIsDragging(true);
      }
    },
    [disabled, isUploading]
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      if (disabled || isUploading) return;

      const file = e.dataTransfer.files?.[0];
      if (file) {
        uploadFile(file);
      }
    },
    [disabled, isUploading, uploadFile]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        uploadFile(file);
      }
      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [uploadFile]
  );

  const handleRemove = useCallback(() => {
    setUploadedFile(null);
    setError(null);
    onChange(null);
  }, [onChange]);

  // Show uploaded file state
  if (uploadedFile && !isUploading) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-input bg-background p-3">
        <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{uploadedFile.name}</p>
          {uploadedFile.size > 0 && (
            <p className="text-xs text-muted-foreground">
              {formatFileSize(uploadedFile.size)}
            </p>
          )}
        </div>
        {!disabled && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            className="shrink-0"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Remove file</span>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
        className={cn(
          "relative flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-6 transition-colors cursor-pointer",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
          (disabled || isUploading) && "cursor-not-allowed opacity-50"
        )}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
            <div className="w-full max-w-xs bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">
                Drag and drop a file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max size: {maxSizeMB || DEFAULT_MAX_SIZE_MB}MB
              </p>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileSelect}
          disabled={disabled || isUploading}
          className="sr-only"
          tabIndex={-1}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
