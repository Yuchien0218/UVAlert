export type DeviceCredentials = {
  deviceId: string;
  deviceSecret: string;
};

export type DeviceCredentialFactory = {
  createDeviceId(): string;
  randomBytes(length: number): Uint8Array;
};

export class DeviceAuthError extends Error {
  constructor() {
    super("DEVICE_AUTH_INVALID");
    this.name = "DeviceAuthError";
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const deviceSecretPattern = /^[A-Za-z0-9_-]{43}$/;
const hexDigestPattern = /^[0-9a-f]{64}$/i;

export function createDeviceCredentials(
  factory: DeviceCredentialFactory
): DeviceCredentials {
  const bytes = factory.randomBytes(32);
  if (bytes.length !== 32) throw new Error("DEVICE_RANDOM_SOURCE_INVALID");
  return {
    deviceId: factory.createDeviceId(),
    deviceSecret: bytesToBase64Url(bytes)
  };
}

export async function hashDeviceSecret(
  secret: string,
  pepper: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pepper),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(secret)
  );
  return bytesToHex(new Uint8Array(digest));
}

export function parseDeviceAuthorization(
  authorization: string | null
): DeviceCredentials {
  if (authorization === null || !authorization.startsWith("Device ")) {
    throw new DeviceAuthError();
  }
  const value = authorization.slice("Device ".length);
  const separator = value.indexOf(".");
  if (separator < 0 || separator !== value.lastIndexOf(".")) {
    throw new DeviceAuthError();
  }
  const deviceId = value.slice(0, separator);
  const deviceSecret = value.slice(separator + 1);
  if (!uuidPattern.test(deviceId) || !deviceSecretPattern.test(deviceSecret)) {
    throw new DeviceAuthError();
  }
  return { deviceId: deviceId.toLowerCase(), deviceSecret };
}

export async function verifyDeviceSecret(
  secret: string,
  storedHash: string,
  pepper: string,
  compare: (left: Uint8Array, right: Uint8Array) => boolean = constantTimeEqual
): Promise<boolean> {
  const actual = hexToFixedDigest(await hashDeviceSecret(secret, pepper));
  const expected = hexToFixedDigest(storedHash);
  return compare(actual, expected) && hexDigestPattern.test(storedHash);
}

export function constantTimeEqual(
  left: Uint8Array,
  right: Uint8Array
): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

function hexToFixedDigest(value: string): Uint8Array {
  const bytes = new Uint8Array(32);
  if (!hexDigestPattern.test(value)) return bytes;
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}
