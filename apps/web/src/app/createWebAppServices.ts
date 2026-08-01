import {
  BroadcastChannelNotifier,
  LocalProductSettingsRepository,
  LocalProductCatalogRepository,
  LocalRegionPreferenceRepository,
  LocalSetupDraftRepository,
  LocalSessionRepository,
  LocalWeatherForecastRepository,
  SunshieldDatabase
} from "@sunshield/persistence-web";
import { BrowserConnectivity } from "../adapters/BrowserConnectivity";
import { BrowserLifecycle } from "../adapters/BrowserLifecycle";
import { IndexedDbLocalIdentity } from "../adapters/IndexedDbLocalIdentity";
import { BrowserUvForecastClient } from "../adapters/BrowserUvForecastClient";
import { BrowserGeolocation } from "../adapters/BrowserGeolocation";
import regionIndex from "../generated/region-index.generated.json";
import regionManifest from "../generated/region-manifest.generated.json";
import {
  createAppBootController,
  type AppBootController
} from "./createAppBootController";
import {
  createAppearanceController,
  type AppearanceController
} from "./createAppearanceController";
import {
  createSetupController,
  type SetupController
} from "../features/setup/createSetupController";
import {
  createProductSettingsController,
  type ProductSettingsController
} from "../features/product/createProductSettingsController";
import {
  createSessionControlController,
  type SessionControlController
} from "../features/session/createSessionControlController";
import {
  createUvForecastController,
  type UvForecastController
} from "../features/uv/createUvForecastController";
import {
  createRegionController,
  type RegionController
} from "../features/region/createRegionController";
import { LazyTaiwanRegionResolver } from "../features/region/LazyTaiwanRegionResolver";
import {
  createReapplicationController,
  type ReapplicationController
} from "../features/reapplication/createReapplicationController";
import type { RegionDirectoryEntry } from "../features/region/TaiwanRegionResolver";

export interface WebAppServices {
  readonly boot: AppBootController;
  readonly appearance: AppearanceController;
  readonly setup: SetupController;
  readonly productSettings: ProductSettingsController;
  readonly sessionControl: SessionControlController;
  readonly uvForecast: UvForecastController;
  readonly region: RegionController;
  readonly reapplication: ReapplicationController;
  dispose(): void;
}

export interface WebAppServiceOptions {
  databaseName?: string;
  contextId?: string;
  createId?: () => string;
}

export function createWebAppServices(
  options: WebAppServiceOptions = {}
): WebAppServices {
  const createId = options.createId ?? createRandomId;
  const contextId = options.contextId ?? createId();
  const database = new SunshieldDatabase(options.databaseName);
  const notifier = new BroadcastChannelNotifier();
  const connectivity = new BrowserConnectivity();
  const lifecycle = new BrowserLifecycle();
  const repository = new LocalSessionRepository({
    database,
    sourceContextId: contextId,
    notifier
  });
  const identity = new IndexedDbLocalIdentity({
    database,
    createId
  });
  const boot = createAppBootController({
    contextId,
    repository,
    identity,
    connectivity,
    lifecycle,
    crossContext: notifier
  });
  const appearance = createAppearanceController();
  const productRepository =
    new LocalProductSettingsRepository(database);
  const productCatalog = new LocalProductCatalogRepository(database);
  const productSettings = createProductSettingsController({
    repository: productRepository,
    catalog: productCatalog,
    createId,
    now: () => new Date()
  });
  const setup = createSetupController({
    draftRepository: new LocalSetupDraftRepository(database),
    productSettings: productRepository,
    sessionRepository: repository,
    identity,
    boot,
    createId,
    now: () => new Date(),
    getConnectivity: () => boot.connectivity.value
  });
  const sessionControl = createSessionControlController({
    repository,
    identity,
    boot,
    createId,
    now: () => new Date(),
    getConnectivity: () => boot.connectivity.value
  });
  const reapplication = createReapplicationController({
    repository,
    identity,
    boot,
    createId,
    now: () => new Date(),
    getConnectivity: () => boot.connectivity.value
  });
  const directory: readonly RegionDirectoryEntry[] = regionIndex;
  const directoryByCode = new Map(
    directory.map((entry) => [entry.regionCode, entry])
  );
  const regionPreference = new LocalRegionPreferenceRepository(
    database,
    {
      legacyRegionLookup: {
        resolve(regionCode) {
          const entry = directoryByCode.get(regionCode);
          return entry === undefined
            ? null
            : {
                ...entry,
                boundaryDataVersion:
                  regionManifest.boundaryDataVersion
              };
        }
      }
    }
  );
  const uvForecast = createUvForecastController({
    regionPreference,
    api: new BrowserUvForecastClient(),
    snapshots: new LocalWeatherForecastRepository(database),
    connectivity: boot.connectivity,
    lifecycle
  });
  const region = createRegionController({
    geolocation: new BrowserGeolocation(),
    resolver: new LazyTaiwanRegionResolver(),
    preferenceRepository: regionPreference,
    directory,
    boundaryDataVersion: regionManifest.boundaryDataVersion,
    refreshUv: uvForecast.refresh
  });

  return {
    boot,
    appearance,
    setup,
    productSettings,
    sessionControl,
    uvForecast,
    region,
    reapplication,
    dispose(): void {
      reapplication.dispose();
      region.dispose();
      uvForecast.dispose();
      sessionControl.dispose();
      setup.dispose();
      productSettings.dispose();
      appearance.dispose();
      boot.dispose();
      notifier.close();
      database.close();
    }
  };
}

function createRandomId(): string {
  if (typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
}
