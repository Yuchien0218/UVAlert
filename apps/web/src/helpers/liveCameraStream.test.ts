// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import {
  applyCameraZoom,
  openSharpRearCameraStream,
  retriggerCameraAutofocus
} from "./liveCameraStream";

function makeFakeTrack(options: {
  deviceId?: string;
  focusModes?: string[];
  zoom?: { min: number; max: number; step?: number };
}) {
  const stop = vi.fn();
  const applyConstraints = vi.fn().mockResolvedValue(undefined);
  const getCapabilities = vi.fn(() => ({
    ...(options.focusModes ? { focusMode: options.focusModes } : {}),
    ...(options.zoom ? { zoom: options.zoom } : {})
  }));
  const getSettings = vi.fn(() => ({
    deviceId: options.deviceId ?? "default-rear"
  }));

  return {
    stop,
    applyConstraints,
    getCapabilities,
    getSettings
  };
}

function makeFakeStream(track: ReturnType<typeof makeFakeTrack>): MediaStream {
  const base = typeof MediaStream !== "undefined" ? new MediaStream() : {};
  return Object.assign(base, {
    getTracks: () => [track],
    getVideoTracks: () => [track]
  }) as unknown as MediaStream;
}

describe("openSharpRearCameraStream", () => {
  it("requests 1920x1080 environment stream, enables continuous autofocus, and reports 2x zoom capability", async () => {
    const mainTrack = makeFakeTrack({
      deviceId: "rear-main",
      focusModes: ["manual", "single-shot", "continuous"],
      zoom: { min: 1, max: 8 }
    });
    const stream = makeFakeStream(mainTrack);

    const mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      enumerateDevices: vi.fn().mockResolvedValue([])
    } as unknown as MediaDevices;

    const session = await openSharpRearCameraStream(mediaDevices);

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith({
      video: {
        facingMode: { ideal: "environment" },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
    expect(mainTrack.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ focusMode: "continuous" }]
    });
    expect(session.supportsTwoXZoom).toBe(true);
    expect(session.stream).toBe(stream);
  });

  it("switches from fixed-focus ultra-wide rear lens to autofocus main rear lens and stops discarded stream", async () => {
    const ultraWideTrack = makeFakeTrack({
      deviceId: "rear-ultrawide",
      focusModes: ["fixed"]
    });
    const mainTrack = makeFakeTrack({
      deviceId: "rear-main-af",
      focusModes: ["continuous"],
      zoom: { min: 1, max: 4 }
    });

    const ultraWideStream = makeFakeStream(ultraWideTrack);
    const mainStream = makeFakeStream(mainTrack);

    const getUserMedia = vi
      .fn()
      .mockImplementation(async (constraints: MediaStreamConstraints) => {
        const video = constraints.video as MediaTrackConstraints;
        const exactDevice =
          typeof video === "object" &&
          video.deviceId &&
          typeof video.deviceId === "object" &&
          "exact" in video.deviceId
            ? video.deviceId.exact
            : null;
        if (exactDevice === "rear-main-af") {
          return mainStream;
        }
        return ultraWideStream;
      });

    const enumerateDevices = vi.fn().mockResolvedValue([
      {
        kind: "videoinput",
        deviceId: "front-cam",
        label: "camera2 1, facing front"
      },
      {
        kind: "videoinput",
        deviceId: "rear-ultrawide",
        label: "camera2 2, facing back"
      },
      {
        kind: "videoinput",
        deviceId: "rear-main-af",
        label: "camera2 0, facing back"
      }
    ]);

    const session = await openSharpRearCameraStream({
      getUserMedia,
      enumerateDevices
    } as unknown as MediaDevices);

    expect(ultraWideTrack.stop).toHaveBeenCalledTimes(1);
    expect(session.stream).toBe(mainStream);
    expect(mainTrack.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ focusMode: "continuous" }]
    });
    expect(session.supportsTwoXZoom).toBe(true);
  });
});

describe("applyCameraZoom", () => {
  it("applies clamped hardware zoom factor when track capabilities support zoom", async () => {
    const track = makeFakeTrack({
      focusModes: ["continuous"],
      zoom: { min: 1, max: 3 }
    });
    const stream = makeFakeStream(track);

    const applied = await applyCameraZoom(stream, 2);
    expect(applied).toBe(true);
    expect(track.applyConstraints).toHaveBeenCalledWith({
      advanced: [{ zoom: 2 }]
    });
  });

  it("returns false gracefully when track does not support zoom", async () => {
    const track = makeFakeTrack({ focusModes: ["continuous"] });
    const stream = makeFakeStream(track);

    const applied = await applyCameraZoom(stream, 2);
    expect(applied).toBe(false);
    expect(track.applyConstraints).not.toHaveBeenCalled();
  });
});

describe("retriggerCameraAutofocus", () => {
  it("triggers single-shot focus pulse then restores continuous autofocus", async () => {
    const track = makeFakeTrack({
      focusModes: ["single-shot", "continuous"]
    });
    const stream = makeFakeStream(track);

    const focused = await retriggerCameraAutofocus(stream);
    expect(focused).toBe(true);
    expect(track.applyConstraints).toHaveBeenNthCalledWith(1, {
      advanced: [{ focusMode: "single-shot" }]
    });
    expect(track.applyConstraints).toHaveBeenNthCalledWith(2, {
      advanced: [{ focusMode: "continuous" }]
    });
  });
});
