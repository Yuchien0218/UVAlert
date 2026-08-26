import { describe, expect, it, vi } from "vitest";
import { DeviceGeolocationError } from "@sunshield/platform";
import { BrowserGeolocation } from "./BrowserGeolocation";

describe("BrowserGeolocation", () => {
  it("does not request a position during construction", () => {
    const getCurrentPosition = vi.fn();

    new BrowserGeolocation({ getCurrentPosition });

    expect(getCurrentPosition).not.toHaveBeenCalled();
  });

  it("returns only the minimal position after an explicit request", async () => {
    const getCurrentPosition = vi.fn((success) => {
      success({
        coords: {
          latitude: 25.033,
          longitude: 121.5654,
          accuracy: 18
        }
      });
    });
    const adapter = new BrowserGeolocation({ getCurrentPosition });

    await expect(adapter.requestCurrentPosition()).resolves.toEqual({
      latitude: 25.033,
      longitude: 121.5654,
      accuracyMeters: 18
    });
    expect(getCurrentPosition).toHaveBeenCalledWith(
      expect.any(Function),
      expect.any(Function),
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0
      }
    );
  });

  it.each([
    [1, "permission_denied"],
    [2, "position_unavailable"],
    [3, "timeout"]
  ] as const)(
    "maps browser error %s without exposing the raw error",
    async (browserCode, expectedCode) => {
      const getCurrentPosition = vi.fn((_success, error) => {
        error({ code: browserCode, message: "precise browser detail" });
      });
      const adapter = new BrowserGeolocation({ getCurrentPosition });

      const result = adapter.requestCurrentPosition();

      await expect(result).rejects.toMatchObject({
        name: "DeviceGeolocationError",
        code: expectedCode
      });
      await expect(result).rejects.not.toMatchObject({
        message: "precise browser detail"
      });
    }
  );

  it("treats timeout as permission denied when permission state is denied", async () => {
    const getCurrentPosition = vi.fn((_success, error) => {
      error({ code: 3 });
    });
    const permissions = {
      query: vi.fn(async () => ({ state: "denied" as const }))
    };
    const adapter = new BrowserGeolocation({ getCurrentPosition }, permissions);

    await expect(adapter.requestCurrentPosition()).rejects.toMatchObject({
      name: "DeviceGeolocationError",
      code: "permission_denied"
    });
  });

  it("keeps timeout when permission lookup is unavailable", async () => {
    const getCurrentPosition = vi.fn((_success, error) => {
      error({ code: 3 });
    });
    const adapter = new BrowserGeolocation({ getCurrentPosition }, null);

    await expect(adapter.requestCurrentPosition()).rejects.toMatchObject({
      name: "DeviceGeolocationError",
      code: "timeout"
    });
  });

  it("keeps the browser error when permission lookup fails", async () => {
    const getCurrentPosition = vi.fn((_success, error) => {
      error({ code: 2 });
    });
    const permissions = {
      query: vi.fn(async () => {
        throw new Error("permission query unavailable");
      })
    };
    const adapter = new BrowserGeolocation({ getCurrentPosition }, permissions);

    await expect(adapter.requestCurrentPosition()).rejects.toMatchObject({
      name: "DeviceGeolocationError",
      code: "position_unavailable"
    });
  });

  it("reports unsupported when the browser has no geolocation API", async () => {
    const adapter = new BrowserGeolocation(null);

    await expect(adapter.requestCurrentPosition()).rejects.toEqual(
      new DeviceGeolocationError("unsupported")
    );
  });
});
