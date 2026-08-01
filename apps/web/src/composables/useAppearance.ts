import type { AppearanceController } from "../app/createAppearanceController";
import { useWebAppServices } from "../app/injection";

export function useAppearance(): AppearanceController {
  return useWebAppServices().appearance;
}
