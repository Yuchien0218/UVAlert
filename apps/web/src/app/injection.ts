import { inject, type App, type InjectionKey } from "vue";
import type { WebAppServices } from "./createWebAppServices";

export const WEB_APP_SERVICES_KEY: InjectionKey<WebAppServices> =
  Symbol("web-app-services");

export function provideWebAppServices(
  app: App,
  services: WebAppServices
): void {
  app.provide(WEB_APP_SERVICES_KEY, services);
}

export function useWebAppServices(): WebAppServices {
  const services = inject(WEB_APP_SERVICES_KEY);
  if (services === undefined) {
    throw new Error("Web app services are not provided");
  }
  return services;
}

export function useAuthController() {
  return useWebAppServices().auth;
}

export function useSyncController() {
  return useWebAppServices().sync;
}

export function useFeedbackController() {
  return useWebAppServices().feedback;
}
