export function readConfiguredEnvironmentValue(
  value: string | undefined
): string | undefined {
  const normalizedValue = value?.trim();
  return normalizedValue === "" ? undefined : normalizedValue;
}
