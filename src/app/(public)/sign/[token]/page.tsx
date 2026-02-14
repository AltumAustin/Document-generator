"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { SignaturePadComponent } from "@/components/signature-pad";
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Download,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignatureRequestData {
  id: string;
  signerName?: string;
  signerEmail: string;
  message?: string;
  status: "PENDING" | "VIEWED" | "SIGNED" | "DECLINED" | "EXPIRED";
  document: {
    id: string;
    fileName: string;
    fileUrl: string;
  };
  sender?: {
    name?: string;
    email: string;
  };
  expiresAt?: string;
}

type PageState = "loading" | "sign" | "signed" | "error";

// ---------------------------------------------------------------------------
// Page Component
// ---------------------------------------------------------------------------

export default function ESignaturePage() {
  const params = useParams();
  const token = params.token as string;

  const [state, setState] = useState<PageState>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [signatureData, setSignatureData] =
    useState<SignatureRequestData | null>(null);
  const [signatureDataUrl, setSignatureDataUrl] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  // ── Fetch signature request ───────────────────────────────────────────────
  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/signatures/${token}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));

          if (res.status === 404) {
            setErrorMessage(
              "This signature request was not found or the link is invalid."
            );
          } else if (res.status === 410) {
            setErrorMessage(
              data.error || "This signature request has expired."
            );
          } else if (res.status === 409) {
            setErrorMessage(
              data.error || "This document has already been signed."
            );
          } else {
            setErrorMessage(
              data.error || "Something went wrong. Please try again later."
            );
          }
          setState("error");
          return;
        }

        const data: SignatureRequestData = await res.json();

        // Check if already signed
        if (data.status === "SIGNED") {
          setErrorMessage("This document has already been signed.");
          setState("error");
          return;
        }

        // Check if expired
        if (data.status === "EXPIRED") {
          setErrorMessage("This signature request has expired.");
          setState("error");
          return;
        }

        if (data.expiresAt && new Date(data.expiresAt) < new Date()) {
          setErrorMessage("This signature request has expired.");
          setState("error");
          return;
        }

        setSignatureData(data);
        setState("sign");
      } catch {
        setErrorMessage(
          "Unable to load the signature request. Please check your connection."
        );
        setState("error");
      }
    }

    fetchData();
  }, [token]);

  // ── Sign handler ──────────────────────────────────────────────────────────
  const handleSign = useCallback(async () => {
    if (!signatureDataUrl || !agreed || !signatureData) return;

    setIsSigning(true);

    try {
      const res = await fetch(`/api/signatures/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature: signatureDataUrl,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit signature");
      }

      setState("signed");
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to submit signature. Please try again."
      );
    } finally {
      setIsSigning(false);
    }
  }, [signatureDataUrl, agreed, signatureData, token]);

  const canSign = !!signatureDataUrl && agreed && !isSigning;

  // ── Render states ─────────────────────────────────────────────────────────

  // Loading
  if (state === "loading") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Loading signature request...
        </p>
      </div>
    );
  }

  // Error
  if (state === "error") {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">
              Unable to Process Request
            </h2>
            <p className="text-sm text-muted-foreground max-w-md">
              {errorMessage}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Signed successfully
  if (state === "signed") {
    return (
      <Card className="mt-8">
        <CardContent className="flex flex-col items-center justify-center py-12 gap-4">
          <CheckCircle2 className="h-12 w-12 text-green-600" />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-semibold">Document Signed</h2>
            <p className="text-sm text-muted-foreground max-w-md">
              Your signature has been recorded successfully. You will receive a
              confirmation email with a copy of the signed document.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Signature form ────────────────────────────────────────────────────────
  const senderDisplay =
    signatureData?.sender?.name || signatureData?.sender?.email || "DocGen";

  return (
    <div className="space-y-6 py-4">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Signature Requested
        </h1>
        <p className="text-muted-foreground">
          {senderDisplay} has requested your signature on a document.
        </p>
      </div>

      {/* Document info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Document Details</CardTitle>
          {signatureData?.message && (
            <CardDescription>{signatureData.message}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {signatureData?.document.fileName}
                </p>
                <p className="text-xs text-muted-foreground">
                  Sent by {senderDisplay}
                </p>
              </div>
            </div>
            <a
              href={signatureData?.document.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
            >
              <Download className="h-4 w-4" />
              Review document
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Signature pad */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your Signature</CardTitle>
          <CardDescription>
            Draw or type your signature below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <SignaturePadComponent
            value={signatureDataUrl ?? undefined}
            onChange={(dataUrl) => setSignatureDataUrl(dataUrl)}
          />

          {/* Agreement checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="agree-esign"
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
            />
            <Label
              htmlFor="agree-esign"
              className="text-sm leading-relaxed cursor-pointer"
            >
              I agree to sign this document electronically. I understand that my
              electronic signature has the same legal effect as a handwritten
              signature.
            </Label>
          </div>

          {/* Error message */}
          {errorMessage && state === "sign" && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          {/* Sign button */}
          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={!canSign}
            onClick={handleSign}
          >
            {isSigning && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Sign Document
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
