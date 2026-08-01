import {
  onMounted,
  onUnmounted,
  readonly,
  shallowRef,
  type DeepReadonly,
  type Ref
} from "vue";

interface CurrentTimeOptions {
  intervalMs?: number;
  now?: () => Date;
}

export function useCurrentTime(
  options: CurrentTimeOptions = {}
): DeepReadonly<Ref<Date>> {
  const intervalMs = options.intervalMs ?? 1_000;
  const getNow = options.now ?? (() => new Date());
  const currentTime = shallowRef(getNow());
  let intervalId: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    intervalId = setInterval(() => {
      currentTime.value = getNow();
    }, intervalMs);
  });

  onUnmounted(() => {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }
  });

  return readonly(currentTime);
}
