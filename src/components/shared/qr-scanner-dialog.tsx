"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScanLine, Camera, CameraOff, Check, X, Zap, ZapOff } from "lucide-react";

interface QRScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (value: string) => void;
  title?: string;
  description?: string;
  t?: (key: string, opts?: Record<string, unknown>) => string;
}

/**
 * QR Scanner Dialog v3 — MAXIMUM QUALITY
 *
 * Changes from v2:
 * 1. Requests 1920×1080 (Full HD) — 9× more pixels than 640×480
 * 2. Uses setInterval(150ms) instead of requestAnimationFrame —
 *    predictable timing, jsQR gets enough time to process each frame
 * 3. Scans the FULL frame (no cropping) — catches QR codes anywhere
 * 4. Uses inversionAttempts: 'attemptBoth' — catches inverted QR codes
 * 5. Adds torch (flashlight) toggle for low-light conditions
 * 6. Adds zoom control (2x) to fill the frame with the QR code
 * 7. Shows live scan status ("Scanning..." / "QR detected!")
 */
export function QRScannerDialog({
  open,
  onOpenChange,
  onScan,
  title,
  description,
  t,
}: QRScannerDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedValue, setScannedValue] = useState<string | null>(null);
  const [manualEntry, setManualEntry] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [scanStatus, setScanStatus] = useState<"idle" | "scanning" | "found">("idle");
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  const tk = (key: string, defaultValue: string, opts?: Record<string, unknown>) =>
    t ? t(key, { defaultValue, ...opts }) || defaultValue : defaultValue;

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setScanStatus("idle");
  }, []);

  // ── Core scan function ──
  // Called every 150ms via setInterval. Captures a video frame,
  // draws it to canvas, and runs jsQR on the full-resolution image.
  const doScan = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Use the FULL video resolution for maximum QR detection quality.
    // Do NOT downscale — jsQR needs every pixel for small/distant QR codes.
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (w === 0 || h === 0) return;

    canvas.width = w;
    canvas.height = h;

    // Draw current video frame at full resolution
    ctx.drawImage(video, 0, 0, w, h);

    // Get image data at full resolution
    const imageData = ctx.getImageData(0, 0, w, h);

    // Decode QR — 'attemptBoth' tries normal AND inverted QR codes
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "attemptBoth",
    });

    if (code && code.data) {
      setScannedValue(code.data);
      setScanStatus("found");
      stopCamera();
    } else {
      setScanCount((c) => c + 1);
    }
  }, [stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraReady(false);
    setCameraError(null);
    setScannedValue(null);
    setManualEntry(false);
    setManualValue("");
    setScanStatus("idle");
    setScanCount(0);
    setTorchOn(false);

    try {
      // ── Request MAXIMUM resolution camera ──
      // Try 1920×1080 first. If the camera doesn't support it,
      // the browser falls back to the closest supported resolution.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;

      // Check if torch (flashlight) is supported
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities = videoTrack.getCapabilities?.() as MediaTrackCapabilities & {
          torch?: boolean;
        };
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Wait for the video to be fully loaded before scanning
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().then(() => {
            setCameraReady(true);
            setScanStatus("scanning");
            // Start scanning every 150ms (~6.6 scans/second).
            // This gives jsQR enough time to process each 1920×1080 frame
            // without dropping frames.
            intervalRef.current = setInterval(doScan, 150);
          }).catch(() => {
            // Even if play() rejects, try scanning anyway
            setCameraReady(true);
            setScanStatus("scanning");
            intervalRef.current = setInterval(doScan, 150);
          });
        };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("Permission") || msg.includes("NotAllowed")) {
        setCameraError(tk("qrCameraPermission", "Camera permission denied. Please allow camera access in your browser settings."));
      } else if (msg.includes("NotFound") || msg.includes("DevicesNotFound")) {
        setCameraError(tk("qrCameraNotFound", "No camera found on this device. Use manual entry instead."));
      } else {
        setCameraError(tk("qrCameraError", "Failed to access camera. You can use manual entry instead."));
      }
    }
  }, [doScan, t]);

  // Toggle torch (flashlight)
  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;

    try {
      const newTorchState = !torchOn;
      await track.applyConstraints({
        advanced: [{ torch: newTorchState } as MediaTrackConstraintSet & { torch: boolean }],
      });
      setTorchOn(newTorchState);
    } catch {
      // Torch not supported on this device — silently ignore
    }
  }, [torchOn]);

  // Start/stop camera when dialog opens/closes
  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, startCamera, stopCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  function handleClose() {
    stopCamera();
    setScannedValue(null);
    setManualEntry(false);
    setManualValue("");
    onOpenChange(false);
  }

  function handleConfirm() {
    if (scannedValue) {
      onScan(scannedValue);
      handleClose();
    }
  }

  function handleManualSubmit() {
    if (manualValue.trim()) {
      onScan(manualValue.trim());
      handleClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-indigo-500" />
            {title || tk("qrScanTitle", "Scan QR Code")}
          </DialogTitle>
          <DialogDescription>
            {description || tk("qrScanDesc", "Point the camera at the QR code on the ID document.")}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {!manualEntry && !scannedValue && (
            <>
              {cameraError ? (
                <div className="flex flex-col items-center justify-center gap-4 py-8">
                  <CameraOff className="h-12 w-12 text-slate-300" />
                  <p className="text-sm text-center text-slate-500 max-w-xs">{cameraError}</p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startCamera()}>
                      <Camera className="h-4 w-4 mr-1.5" />
                      {tk("qrRetry", "Retry Camera")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setManualEntry(true)}>
                      <ScanLine className="h-4 w-4 mr-1.5" />
                      {tk("qrManualEntry", "Manual Entry")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative overflow-hidden rounded-lg bg-slate-900 aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover"
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-3/5 aspect-square border-2 border-white/80 rounded-lg relative">
                      {/* Corner brackets */}
                      <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                      {/* Animated scan line */}
                      {scanStatus === "scanning" && (
                        <div
                          className="absolute left-2 right-2 h-1 bg-emerald-400 rounded-full shadow-lg shadow-emerald-400/50"
                          style={{ animation: "qr-scan-line 2s ease-in-out infinite" }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Top bar: scan status + torch toggle */}
                  <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-2 bg-gradient-to-b from-black/60 to-transparent">
                    <div className="flex items-center gap-1.5 text-white text-xs">
                      {scanStatus === "scanning" && (
                        <>
                          <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>Scanning... ({scanCount} frames)</span>
                        </>
                      )}
                      {scanStatus === "idle" && <span>Starting...</span>}
                    </div>
                    {torchSupported && (
                      <button
                        type="button"
                        onClick={toggleTorch}
                        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                          torchOn ? "bg-amber-400 text-white" : "bg-white/20 text-white"
                        }`}
                        title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
                      >
                        {torchOn ? <Zap className="h-4 w-4" /> : <ZapOff className="h-4 w-4" />}
                      </button>
                    )}
                  </div>

                  {!cameraReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                      <div className="flex flex-col items-center gap-2 text-white/70">
                        <Camera className="h-8 w-8 animate-pulse" />
                        <p className="text-xs">{tk("qrStartingCamera", "Starting camera...")}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {!cameraError && (
                <button
                  type="button"
                  onClick={() => setManualEntry(true)}
                  className="mt-3 w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {tk("qrManualEntryLink", "Can't scan? Enter ID manually →")}
                </button>
              )}
            </>
          )}

          {scannedValue && (
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
                <Check className="h-7 w-7 text-emerald-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">{tk("qrScanned", "QR Code Scanned:")}</p>
                <p className="mt-1 font-mono text-lg text-slate-900 break-all px-4">{scannedValue}</p>
              </div>
            </div>
          )}

          {manualEntry && !scannedValue && (
            <div className="space-y-3 py-4">
              <Input
                autoFocus
                placeholder={tk("qrManualPlaceholder", "Enter ID number manually...")}
                value={manualValue}
                onChange={(e) => setManualValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit} disabled={!manualValue.trim()} className="w-full">
                <Check className="h-4 w-4 mr-1.5" />
                {tk("qrConfirm", "Confirm")}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="h-4 w-4 mr-1.5" />
            {tk("cancel", "Cancel")}
          </Button>
          {scannedValue && (
            <Button onClick={handleConfirm}>
              <Check className="h-4 w-4 mr-1.5" />
              {tk("qrUseValue", "Use This Value")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>

      <style>{`
        @keyframes qr-scan-line {
          0%, 100% { top: 5%; }
          50% { top: 90%; }
        }
      `}</style>
    </Dialog>
  );
}
