import { describe, expect, it, vi } from "vitest";
import {
  createDeviceCredentials,
  DeviceAuthError,
  hashDeviceSecret,
  parseDeviceAuthorization,
  verifyDeviceSecret
} from "./push-auth";

const pepper = "fixed-test-pepper";

describe("anonymous push device authentication", () => {
  it("HMAC is deterministic and separates different secrets", async () => {
    const first = await hashDeviceSecret("device-secret-a", pepper);
    const repeated = await hashDeviceSecret("device-secret-a", pepper);
    const different = await hashDeviceSecret("device-secret-b", pepper);

    expect(first).toBe(
      "998228a7e73051001375e6382abf81fc9f90d7ae0a44d69af7f761c298b96ce1"
    );
    expect(repeated).toBe(first);
    expect(different).not.toBe(first);
  });

  it("generates a UUID plus a 32-byte URL-safe secret without padding", () => {
    const credentials = createDeviceCredentials({
      createDeviceId: () => "10000000-0000-4000-8000-000000000001",
      randomBytes: (length) => {
        expect(length).toBe(32);
        return Uint8Array.from({ length }, (_, index) => index);
      }
    });

    expect(credentials).toEqual({
      deviceId: "10000000-0000-4000-8000-000000000001",
      deviceSecret: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"
    });
    expect(credentials.deviceSecret).not.toContain("=");
  });

  it("parses the exact Device authorization scheme", () => {
    expect(
      parseDeviceAuthorization(
        "Device 10000000-0000-4000-8000-000000000001.AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"
      )
    ).toEqual({
      deviceId: "10000000-0000-4000-8000-000000000001",
      deviceSecret: "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8"
    });
  });

  it.each([
    null,
    "",
    "Bearer token",
    "device 10000000-0000-4000-8000-000000000001.secret",
    "Device invalid.secret",
    "Device 10000000-0000-4000-8000-000000000001.short",
    "Device 10000000-0000-4000-8000-000000000001.secret.extra"
  ])("rejects malformed credentials with one generic error", (header) => {
    expect(() => parseDeviceAuthorization(header)).toThrow(DeviceAuthError);
    try {
      parseDeviceAuthorization(header);
    } catch (error) {
      expect(error).toMatchObject({ message: "DEVICE_AUTH_INVALID" });
    }
  });

  it("compares equal-length digest arrays for valid and malformed stored hashes", async () => {
    const expectedHash = await hashDeviceSecret("device-secret-a", pepper);
    const compare = vi.fn((left: Uint8Array, right: Uint8Array) => {
      expect(left).toHaveLength(32);
      expect(right).toHaveLength(32);
      return left.every((value, index) => value === right[index]);
    });

    await expect(
      verifyDeviceSecret("device-secret-a", expectedHash, pepper, compare)
    ).resolves.toBe(true);
    await expect(
      verifyDeviceSecret("device-secret-a", "malformed", pepper, compare)
    ).resolves.toBe(false);
    expect(compare).toHaveBeenCalledTimes(2);
  });
});
