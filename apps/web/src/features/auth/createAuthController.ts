import { shallowReadonly, shallowRef, type ShallowRef } from "vue";
import type { AuthPort, AuthState, LocalSyncPort } from "@sunshield/platform";

export type AuthControllerStatus =
  "idle" | "signing_in" | "signed_out" | "signed_in" | "error";

export type AuthControllerState = {
  status: AuthControllerStatus;
  auth: AuthState;
  errorCode: string | null;
};

export interface AuthController {
  readonly state: Readonly<ShallowRef<AuthControllerState>>;
  refresh(): Promise<void>;
  signInWithGoogle(): Promise<boolean>;
  signOut(): Promise<boolean>;
  dispose(): void;
}

export function createAuthController(options: {
  auth: AuthPort;
  /** 保留這個相依性讓頁面可以明確傳入 local，但登入流程不會改它。 */
  local?: LocalSyncPort;
}): AuthController {
  const state = shallowRef<AuthControllerState>({
    status: "idle",
    auth: { kind: "signed_out" },
    errorCode: null
  });
  let disposed = false;
  let unsubscribe: (() => void) | undefined;

  const authWithSubscription = options.auth as AuthPort & {
    onAuthStateChange?: (listener: (next: AuthState) => void) => () => void;
  };
  if (authWithSubscription.onAuthStateChange !== undefined) {
    unsubscribe = authWithSubscription.onAuthStateChange((next) => {
      if (disposed) return;
      state.value = {
        status: next.kind === "signed_in" ? "signed_in" : "signed_out",
        auth: next,
        errorCode: null
      };
    });
  }

  async function refresh(): Promise<void> {
    if (disposed) return;
    try {
      const next = await options.auth.getState();
      state.value = {
        status: next.kind === "signed_in" ? "signed_in" : "signed_out",
        auth: next,
        errorCode: null
      };
    } catch (error) {
      state.value = {
        ...state.value,
        status: "error",
        errorCode: errorCodeOf(error)
      };
    }
  }

  async function signInWithGoogle(): Promise<boolean> {
    if (disposed) return false;
    state.value = {
      ...state.value,
      status: "signing_in",
      errorCode: null
    };
    try {
      await options.auth.signInWithGoogle();
      await refresh();
      // Supabase OAuth 通常會在這裡轉址；即使 callback 尚未回來，
      // 「已成功發起登入」仍是 true。refresh 會在回站後由 listener 更新。
      return true;
    } catch (error) {
      state.value = {
        ...state.value,
        status: "error",
        errorCode: errorCodeOf(error)
      };
      return false;
    }
  }

  async function signOut(): Promise<boolean> {
    if (disposed) return false;
    try {
      await options.auth.signOut();
      state.value = {
        status: "signed_out",
        auth: { kind: "signed_out" },
        errorCode: null
      };
      return true;
    } catch (error) {
      state.value = {
        ...state.value,
        status: "error",
        errorCode: errorCodeOf(error)
      };
      return false;
    }
  }

  return {
    state: shallowReadonly(state),
    refresh,
    signInWithGoogle,
    signOut,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      unsubscribe?.();
      unsubscribe = undefined;
    }
  };
}

function errorCodeOf(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }
  return "AUTH_UNKNOWN_ERROR";
}
