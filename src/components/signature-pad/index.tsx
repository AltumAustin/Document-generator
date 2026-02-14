"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eraser, PenTool, Type } from "lucide-react";

type SignatureMode = "draw" | "type";

interface SignaturePadComponentProps {
  value?: string;
  onChange: (dataUrl: string | null) => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  className?: string;
}

export function SignaturePadComponent({
  value,
  onChange,
  height = 200,
  disabled = false,
  className,
}: SignaturePadComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const signaturePadRef = useRef<SignaturePad | null>(null);
  const [mode, setMode] = useState<SignatureMode>("draw");
  const [typedSignature, setTypedSignature] = useState("");
  const [isEmpty, setIsEmpty] = useState(!value);

  // Initialize the signature pad
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const pad = new SignaturePad(canvas, {
      backgroundColor: "rgb(255, 255, 255)",
      penColor: "rgb(0, 0, 0)",
    });

    if (disabled) {
      pad.off();
    }

    pad.addEventListener("endStroke", () => {
      setIsEmpty(pad.isEmpty());
      onChange(pad.toDataURL("image/png"));
    });

    signaturePadRef.current = pad;

    // Load existing value if present
    if (value && mode === "draw") {
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          setIsEmpty(false);
        }
      };
      img.src = value;
    }

    return () => {
      pad.off();
    };
    // Only run on mount and when disabled changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  // Resize canvas to fit container
  useEffect(() => {
    const resizeCanvas = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const rect = container.getBoundingClientRect();

      canvas.width = rect.width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(ratio, ratio);
      }

      // Restore pad data after resize
      if (signaturePadRef.current && !signaturePadRef.current.isEmpty()) {
        const data = signaturePadRef.current.toData();
        signaturePadRef.current.clear();
        signaturePadRef.current.fromData(data);
      }
    };

    resizeCanvas();

    const observer = new ResizeObserver(resizeCanvas);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [height]);

  const handleClear = useCallback(() => {
    if (mode === "draw") {
      signaturePadRef.current?.clear();
    } else {
      setTypedSignature("");
    }
    setIsEmpty(true);
    onChange(null);
  }, [mode, onChange]);

  const handleModeSwitch = useCallback(
    (newMode: SignatureMode) => {
      setMode(newMode);
      handleClear();
    },
    [handleClear]
  );

  // Generate typed signature as data URL
  const handleTypedSignatureChange = useCallback(
    (text: string) => {
      setTypedSignature(text);

      if (!text.trim()) {
        setIsEmpty(true);
        onChange(null);
        return;
      }

      setIsEmpty(false);

      // Render text to canvas to get data URL
      const canvas = document.createElement("canvas");
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "black";
      ctx.font = "italic 48px 'Georgia', 'Times New Roman', serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      onChange(canvas.toDataURL("image/png"));
    },
    [onChange]
  );

  return (
    <div className={cn("space-y-2", className)}>
      {/* Mode toggle */}
      <div className="flex gap-1">
        <Button
          type="button"
          variant={mode === "draw" ? "default" : "outline"}
          size="sm"
          onClick={() => handleModeSwitch("draw")}
          disabled={disabled}
        >
          <PenTool className="h-3.5 w-3.5 mr-1.5" />
          Draw
        </Button>
        <Button
          type="button"
          variant={mode === "type" ? "default" : "outline"}
          size="sm"
          onClick={() => handleModeSwitch("type")}
          disabled={disabled}
        >
          <Type className="h-3.5 w-3.5 mr-1.5" />
          Type
        </Button>
      </div>

      {/* Signature area */}
      <div
        ref={containerRef}
        className={cn(
          "relative w-full rounded-md border-2 border-input bg-white overflow-hidden",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        {mode === "draw" ? (
          <canvas
            ref={canvasRef}
            className={cn(
              "touch-none",
              disabled ? "pointer-events-none" : "cursor-crosshair"
            )}
          />
        ) : (
          <div
            className="flex items-center justify-center"
            style={{ height: `${height}px` }}
          >
            {typedSignature ? (
              <p
                className="text-4xl text-center px-4 select-none"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontStyle: "italic",
                }}
              >
                {typedSignature}
              </p>
            ) : (
              <Input
                type="text"
                placeholder="Type your full name"
                value={typedSignature}
                onChange={(e) => handleTypedSignatureChange(e.target.value)}
                disabled={disabled}
                className="max-w-sm text-center text-lg border-0 border-b-2 rounded-none focus-visible:ring-0 focus-visible:border-primary"
                style={{
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                  fontStyle: "italic",
                }}
              />
            )}
          </div>
        )}

        {/* "Sign above" hint */}
        <div className="absolute bottom-2 left-0 right-0 text-center pointer-events-none">
          <span className="text-xs text-muted-foreground/60">
            {mode === "draw" ? "Sign above" : ""}
          </span>
        </div>
      </div>

      {/* Typed input below the preview (type mode) */}
      {mode === "type" && typedSignature && (
        <Input
          type="text"
          placeholder="Type your full name"
          value={typedSignature}
          onChange={(e) => handleTypedSignatureChange(e.target.value)}
          disabled={disabled}
          className="text-sm"
        />
      )}

      {/* Clear button */}
      {!isEmpty && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
        >
          <Eraser className="h-3.5 w-3.5 mr-1.5" />
          Clear
        </Button>
      )}
    </div>
  );
}

export default SignaturePadComponent;
