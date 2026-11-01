export interface SharpCameraSession {
  stream: MediaStream;
  supportsTwoXZoom: boolean;
  minZoom: number;
  maxZoom: number;
}

interface ExtendedMediaTrackCapabilities extends MediaTrackCapabilities {
  focusMode?: string[];
  zoom?: {
    min?: number;
    max?: number;
    step?: number;
  };
}

type CapableVideoTrack = Omit<
  MediaStreamTrack,
  "getCapabilities" | "getSettings"
> & {
  getCapabilities?: () => ExtendedMediaTrackCapabilities;
  getSettings?: () => MediaTrackSettings;
};

const IDEAL_REAR_DIMENSIONS = {
  width: { ideal: 1920 },
  height: { ideal: 1080 }
} as const;

const FRONT_CAMERA_LABEL_RE = /front|user|selfie|前/iu;
const REAR_CAMERA_LABEL_RE = /back|rear|environment|後/iu;
const PRIMARY_CAMERA_ZERO_RE = /\bcamera2?\s+0\b/iu;

function getPrimaryVideoTrack(stream: MediaStream): CapableVideoTrack | null {
  const videoTracks =
    typeof stream.getVideoTracks === "function" ? stream.getVideoTracks() : [];
  if (videoTracks.length > 0) {
    return (videoTracks[0] as CapableVideoTrack) ?? null;
  }
  const allTracks =
    typeof stream.getTracks === "function" ? stream.getTracks() : [];
  return (allTracks[0] as CapableVideoTrack) ?? null;
}

function stopStreamTracks(stream: MediaStream): void {
  const tracks =
    typeof stream.getTracks === "function" ? stream.getTracks() : [];
  for (const track of tracks) {
    track.stop();
  }
}

function readTrackCapabilities(
  track: CapableVideoTrack | null
): ExtendedMediaTrackCapabilities | null {
  if (!track || typeof track.getCapabilities !== "function") {
    return null;
  }
  try {
    return track.getCapabilities() ?? null;
  } catch {
    return null;
  }
}

function supportsFocusMode(
  capabilities: ExtendedMediaTrackCapabilities | null,
  mode: string
): boolean {
  return (
    Array.isArray(capabilities?.focusMode) &&
    capabilities.focusMode.includes(mode)
  );
}

function scoreRearCandidate(device: MediaDeviceInfo): number {
  const label = device.label ?? "";
  let score = 0;
  if (REAR_CAMERA_LABEL_RE.test(label)) score += 2;
  if (PRIMARY_CAMERA_ZERO_RE.test(label)) score += 1;
  return score;
}

/**
 * 開啟高清晰度後置主鏡頭串流（預設請求 1920x1080 Full HD）：
 * 1. 若預設後鏡頭落到固定焦距超廣角鏡（不支援 `continuous` 自動對焦），自動巡檢其他後置鏡頭並切換至支援自動對焦之主鏡頭，同時立即釋放舊串流。
 * 2. 自動啟用 `focusMode: "continuous"` 連續自動對焦。
 * 3. 回報硬體變焦能力（`supportsTwoXZoom`），供近拍防曬乳細小文字時以 `2x` 拉開對焦距離。
 */
export async function openSharpRearCameraStream(
  mediaDevices: MediaDevices
): Promise<SharpCameraSession> {
  let selectedStream = await mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      ...IDEAL_REAR_DIMENSIONS
    },
    audio: false
  });

  let selectedTrack = getPrimaryVideoTrack(selectedStream);
  let selectedCaps = readTrackCapabilities(selectedTrack);

  if (
    selectedCaps !== null &&
    !supportsFocusMode(selectedCaps, "continuous") &&
    typeof mediaDevices.enumerateDevices === "function"
  ) {
    const currentDeviceId = selectedTrack?.getSettings?.()?.deviceId;
    const devices = await mediaDevices
      .enumerateDevices()
      .catch((): MediaDeviceInfo[] => []);

    const rearCandidates = devices
      .filter(
        (d) =>
          d.kind === "videoinput" &&
          Boolean(d.deviceId) &&
          d.deviceId !== currentDeviceId &&
          !FRONT_CAMERA_LABEL_RE.test(d.label ?? "")
      )
      .sort((a, b) => scoreRearCandidate(b) - scoreRearCandidate(a))
      .slice(0, 3);

    for (const candidate of rearCandidates) {
      let candidateStream: MediaStream | null = null;
      try {
        candidateStream = await mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: candidate.deviceId },
            ...IDEAL_REAR_DIMENSIONS
          },
          audio: false
        });
        const candidateTrack = getPrimaryVideoTrack(candidateStream);
        const candidateCaps = readTrackCapabilities(candidateTrack);
        if (supportsFocusMode(candidateCaps, "continuous")) {
          stopStreamTracks(selectedStream);
          selectedStream = candidateStream;
          selectedTrack = candidateTrack;
          selectedCaps = candidateCaps;
          break;
        }
        stopStreamTracks(candidateStream);
      } catch {
        if (candidateStream) {
          stopStreamTracks(candidateStream);
        }
      }
    }
  }

  if (selectedTrack && typeof selectedTrack.applyConstraints === "function") {
    const preferredFocus = supportsFocusMode(selectedCaps, "continuous")
      ? "continuous"
      : supportsFocusMode(selectedCaps, "single-shot")
        ? "single-shot"
        : null;

    if (preferredFocus) {
      await selectedTrack
        .applyConstraints({
          advanced: [
            { focusMode: preferredFocus } as unknown as MediaTrackConstraintSet
          ]
        })
        .catch(() => undefined);
    }
  }

  const minZoom =
    typeof selectedCaps?.zoom?.min === "number" ? selectedCaps.zoom.min : 1;
  const maxZoom =
    typeof selectedCaps?.zoom?.max === "number" ? selectedCaps.zoom.max : 1;

  return {
    stream: selectedStream,
    supportsTwoXZoom: maxZoom >= 2,
    minZoom,
    maxZoom
  };
}

/**
 * 套用硬體鏡頭變焦倍率（例如切換 1x／2x 以維持大感光元件 15～20 公分最佳對焦距離）。
 */
export async function applyCameraZoom(
  stream: MediaStream,
  targetZoom: number
): Promise<boolean> {
  const track = getPrimaryVideoTrack(stream);
  const caps = readTrackCapabilities(track);
  if (
    !track ||
    typeof track.applyConstraints !== "function" ||
    typeof caps?.zoom?.max !== "number"
  ) {
    return false;
  }

  const minZoom = typeof caps.zoom.min === "number" ? caps.zoom.min : 1;
  const clampedZoom = Math.min(caps.zoom.max, Math.max(minZoom, targetZoom));

  try {
    await track.applyConstraints({
      advanced: [{ zoom: clampedZoom } as unknown as MediaTrackConstraintSet]
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * 點擊取景畫面時重新觸發對焦（支援 single-shot 或重新套用 continuous）。
 */
export async function retriggerCameraAutofocus(
  stream: MediaStream
): Promise<boolean> {
  const track = getPrimaryVideoTrack(stream);
  const caps = readTrackCapabilities(track);
  if (!track || typeof track.applyConstraints !== "function") {
    return false;
  }

  try {
    if (supportsFocusMode(caps, "single-shot")) {
      await track.applyConstraints({
        advanced: [
          { focusMode: "single-shot" } as unknown as MediaTrackConstraintSet
        ]
      });
    }
    if (supportsFocusMode(caps, "continuous")) {
      await track.applyConstraints({
        advanced: [
          { focusMode: "continuous" } as unknown as MediaTrackConstraintSet
        ]
      });
      return true;
    }
    return supportsFocusMode(caps, "single-shot");
  } catch {
    return false;
  }
}
