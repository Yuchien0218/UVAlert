import {
  DeviceGeolocationError,
  type DeviceGeolocationPort,
  type DevicePosition
} from "@sunshield/platform";

interface BrowserPosition {
  coords: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
}

interface BrowserPositionError {
  code: number;
}

interface GeolocationLike {
  getCurrentPosition(
    success: (position: BrowserPosition) => void,
    error: (error: BrowserPositionError) => void,
    options: PositionOptions
  ): void;
}

interface PermissionStatusLike {
  state: PermissionState;
}

interface PermissionsLike {
  query(descriptor: { name: "geolocation" }): Promise<PermissionStatusLike>;
}

const POSITION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10_000,
  maximumAge: 0
};

export class BrowserGeolocation implements DeviceGeolocationPort {
  readonly #geolocation: GeolocationLike | null;
  readonly #permissions: PermissionsLike | null;

  constructor(
    geolocation: GeolocationLike | null = getBrowserGeolocation(),
    permissions: PermissionsLike | null = getBrowserPermissions()
  ) {
    this.#geolocation = geolocation;
    this.#permissions = permissions;
  }

  requestCurrentPosition(): Promise<DevicePosition> {
    if (this.#geolocation === null) {
      return Promise.reject(
        new DeviceGeolocationError("unsupported")
      );
    }

    return new Promise((resolve, reject) => {
      this.#geolocation?.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracyMeters: position.coords.accuracy
          });
        },
        (error) => {
          void this.#mapErrorCode(error.code).then((code) => {
            reject(new DeviceGeolocationError(code));
          });
        },
        POSITION_OPTIONS
      );
    });
  }

  async #mapErrorCode(code: number) {
    if ((code === 2 || code === 3) && this.#permissions !== null) {
      try {
        const permission = await this.#permissions.query({
          name: "geolocation"
        });
        if (permission.state === "denied") {
          return "permission_denied" as const;
        }
      } catch {
        // Some mobile browsers expose Permissions API but reject this query.
      }
    }

    return mapErrorCode(code);
  }
}

function getBrowserGeolocation(): GeolocationLike | null {
  if (
    typeof globalThis.navigator === "undefined" ||
    globalThis.navigator.geolocation === undefined
  ) {
    return null;
  }
  return globalThis.navigator.geolocation;
}

function getBrowserPermissions(): PermissionsLike | null {
  if (
    typeof globalThis.navigator === "undefined" ||
    globalThis.navigator.permissions === undefined
  ) {
    return null;
  }
  return globalThis.navigator.permissions;
}

function mapErrorCode(code: number) {
  switch (code) {
    case 1:
      return "permission_denied" as const;
    case 2:
      return "position_unavailable" as const;
    case 3:
      return "timeout" as const;
    default:
      return "position_unavailable" as const;
  }
}
