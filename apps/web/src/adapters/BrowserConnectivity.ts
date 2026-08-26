import type { ConnectivityPort, ConnectivityStatus } from "@sunshield/platform";

export class BrowserConnectivity implements ConnectivityPort {
  getCurrentStatus(): ConnectivityStatus {
    return globalThis.navigator.onLine ? "online" : "offline";
  }

  subscribe(listener: (status: ConnectivityStatus) => void): () => void {
    const handleOnline = (): void => listener("online");
    const handleOffline = (): void => listener("offline");

    globalThis.addEventListener("online", handleOnline);
    globalThis.addEventListener("offline", handleOffline);

    return () => {
      globalThis.removeEventListener("online", handleOnline);
      globalThis.removeEventListener("offline", handleOffline);
    };
  }
}
