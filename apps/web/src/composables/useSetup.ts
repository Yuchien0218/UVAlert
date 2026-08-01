import type { SetupController } from "../features/setup/createSetupController";
import { useWebAppServices } from "../app/injection";

export function useSetup(): SetupController {
  return useWebAppServices().setup;
}
