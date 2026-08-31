import {
  BroadcastChannelNotifier,
  LocalDataRepository,
  LocalProductSettingsRepository,
  LocalProductCatalogRepository,
  LocalPushStateRepository,
  LocalRegionPreferenceRepository,
  LocalSetupDraftRepository,
  LocalSessionRepository,
  LocalSyncRepository,
  LocalWeatherForecastRepository,
  SunshieldDatabase
} from "@sunshield/persistence-web";
import { BrowserConnectivity } from "../adapters/BrowserConnectivity";
import {
  BrowserNotifications,
  createBrowserNotificationDeps
} from "../adapters/BrowserNotifications";
import { BrowserRemotePush } from "../adapters/BrowserRemotePush";
import { BrowserLifecycle } from "../adapters/BrowserLifecycle";
import { IndexedDbLocalIdentity } from "../adapters/IndexedDbLocalIdentity";
import { BrowserUvForecastClient } from "../adapters/BrowserUvForecastClient";
import { BrowserFeedbackClient } from "../adapters/BrowserFeedbackClient";
import { BrowserGeolocation } from "../adapters/BrowserGeolocation";
import { createSupabaseAuthAdapter } from "../adapters/SupabaseAuthAdapter";
import { createSupabaseCloudSyncAdapter } from "../adapters/SupabaseCloudSyncAdapter";
import regionIndex from "../generated/region-index.generated.json";
import regionManifest from "../generated/region-manifest.generated.json";
import {
  createAppBootController,
  type AppBootController
} from "./createAppBootController";
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
import {
  createContextEventController,
  type ContextEventController
} from "../features/reminder/createContextEventController";
import {
  createEventCorrectionController,
  type EventCorrectionController
} from "../features/reminder/createEventCorrectionController";
import {
  createLocalDataController,
  type LocalDataController
} from "../features/settings/createLocalDataController";
import { downloadTextFile } from "../helpers/downloadTextFile";
import {
  createSessionEventsController,
  type SessionEventsController
} from "../features/reminder/createSessionEventsController";
import type { RegionDirectoryEntry } from "../features/region/TaiwanRegionResolver";
import {
  createAuthController,
  type AuthController
} from "../features/auth/createAuthController";
import {
  createSyncController,
  type SyncController
} from "../features/sync/createSyncController";
import {
  createFeedbackController,
  type FeedbackController
} from "../features/feedback/createFeedbackController";
import type { CloudSyncPort } from "@sunshield/platform";
import { readConfiguredEnvironmentValue } from "../adapters/configuredEnvironment";
import {
  createNotificationController,
  type NotificationController
} from "../features/notification/createNotificationController";

export interface WebAppServices {
  readonly boot: AppBootController;
  readonly setup: SetupController;
  readonly productSettings: ProductSettingsController;
  readonly sessionControl: SessionControlController;
  readonly uvForecast: UvForecastController;
  readonly region: RegionController;
  readonly reapplication: ReapplicationController;
  readonly contextEvent: ContextEventController;
  readonly localData: LocalDataController;
  readonly eventCorrection: EventCorrectionController;
  readonly sessionEvents: SessionEventsController;
  readonly auth: AuthController;
  readonly sync: SyncController;
  readonly cloudSync: CloudSyncPort;
  readonly feedback: FeedbackController;
  readonly notifications: NotificationController;
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
  const notificationDeps = createBrowserNotificationDeps();
  const notificationPort = new BrowserNotifications(notificationDeps);
  const repository = new LocalSessionRepository({
    database,
    sourceContextId: contextId,
    notifier
  });
  const identity = new IndexedDbLocalIdentity({
    database,
    createId
  });
  const localSync = new LocalSyncRepository({
    database,
    localVisitorId: () => identity.getOrCreateLocalVisitorId()
  });
  const authPort = createSupabaseAuthAdapter();
  const auth = createAuthController({ auth: authPort, local: localSync });
  const cloudSync = createSupabaseCloudSyncAdapter({ auth: authPort });
  const sync = createSyncController({
    local: localSync,
    cloud: cloudSync,
    createId
  });
  const feedback = createFeedbackController({
    feedback: new BrowserFeedbackClient(),
    appVersion: "web-v1"
  });
  const boot = createAppBootController({
    contextId,
    repository,
    identity,
    connectivity,
    lifecycle,
    crossContext: notifier
  });
  const remotePush = new BrowserRemotePush({
    state: new LocalPushStateRepository(database),
    apiBaseUrl:
      readConfiguredEnvironmentValue(import.meta.env.VITE_API_BASE_URL) ??
      "/v1",
    publicVapidKey: import.meta.env.VITE_PUSH_PUBLIC_KEY,
    isSecureContext: () => globalThis.isSecureContext,
    hasServiceWorker: () => "serviceWorker" in globalThis.navigator,
    hasPushManager: () => "PushManager" in globalThis,
    hasNotification: () => "Notification" in globalThis,
    getPermission: () => globalThis.Notification.permission,
    requestPermission: () => globalThis.Notification.requestPermission(),
    getRegistration: notificationDeps.getRegistration,
    fetch: globalThis.fetch,
    isOnline: () => boot.connectivity.value === "online",
    createOperationId: createId,
    now: () => new Date()
  });
  const productRepository = new LocalProductSettingsRepository(database);
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
  const eventCorrection = createEventCorrectionController({
    repository,
    identity,
    boot,
    createId,
    now: () => new Date(),
    getConnectivity: () => boot.connectivity.value
  });
  const localData = createLocalDataController({
    repository: new LocalDataRepository({ database, createId }),
    boot,
    now: () => new Date(),
    saveFile: downloadTextFile
  });
  const contextEvent = createContextEventController({
    repository,
    identity,
    boot,
    createId,
    now: () => new Date(),
    getConnectivity: () => boot.connectivity.value
  });
  const sessionEvents = createSessionEventsController({
    repository,
    identity
  });
  const directory: readonly RegionDirectoryEntry[] = regionIndex;
  const directoryByCode = new Map(
    directory.map((entry) => [entry.regionCode, entry])
  );
  const regionPreference = new LocalRegionPreferenceRepository(database, {
    legacyRegionLookup: {
      resolve(regionCode) {
        const entry = directoryByCode.get(regionCode);
        return entry === undefined
          ? null
          : {
              ...entry,
              boundaryDataVersion: regionManifest.boundaryDataVersion
            };
      }
    }
  });
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

  const notifications = createNotificationController({
    notifications: notificationPort,
    currentSession: boot.currentSession,
    remotePush,
    connectivity: boot.connectivity,
    createOperationId: createId
  });

  return {
    boot,
    setup,
    productSettings,
    sessionControl,
    uvForecast,
    region,
    reapplication,
    contextEvent,
    localData,
    eventCorrection,
    sessionEvents,
    auth,
    sync,
    cloudSync,
    feedback,
    notifications,
    dispose(): void {
      notifications.dispose();
      sync.dispose();
      feedback.dispose();
      auth.dispose();
      sessionEvents.dispose();
      localData.dispose();
      eventCorrection.dispose();
      contextEvent.dispose();
      reapplication.dispose();
      region.dispose();
      uvForecast.dispose();
      sessionControl.dispose();
      setup.dispose();
      productSettings.dispose();
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
