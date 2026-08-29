import {
  createClient,
  type Session,
  type SupabaseClient
} from "@supabase/supabase-js";
import type { AuthPort, AuthState } from "@sunshield/platform";
import { readConfiguredEnvironmentValue } from "./configuredEnvironment";

export class SupabaseAuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "SupabaseAuthError";
    this.code = code;
  }
}

type SupabaseAuthClient = Pick<SupabaseClient, "auth">;

export class SupabaseAuthAdapter implements AuthPort {
  readonly #client: SupabaseAuthClient;
  readonly #redirectTo: string | undefined;

  constructor(options: { client: SupabaseAuthClient; redirectTo?: string }) {
    this.#client = options.client;
    this.#redirectTo = options.redirectTo;
  }

  async getState(): Promise<AuthState> {
    const { data, error } = await this.#client.auth.getSession();
    if (error !== null) {
      throw new SupabaseAuthError(
        "AUTH_SESSION_READ_FAILED",
        "無法讀取登入狀態",
        { cause: error }
      );
    }
    return toAuthState(data.session);
  }

  async getAccessToken(): Promise<string | null> {
    const { data, error } = await this.#client.auth.getSession();
    if (error !== null) {
      throw new SupabaseAuthError(
        "AUTH_SESSION_READ_FAILED",
        "無法讀取登入狀態",
        { cause: error }
      );
    }
    return data.session?.access_token ?? null;
  }

  async signInWithGoogle(): Promise<void> {
    const credentials = {
      provider: "google" as const,
      ...(this.#redirectTo === undefined
        ? {}
        : { options: { redirectTo: this.#redirectTo } })
    };
    const { error } = await this.#client.auth.signInWithOAuth(credentials);
    if (error !== null) {
      throw new SupabaseAuthError("AUTH_SIGN_IN_FAILED", "Google 登入未完成", {
        cause: error
      });
    }
  }

  async signOut(): Promise<void> {
    const { error } = await this.#client.auth.signOut();
    if (error !== null) {
      throw new SupabaseAuthError("AUTH_SIGN_OUT_FAILED", "登出未完成", {
        cause: error
      });
    }
  }

  /**
   * 讓 controller 在 OAuth redirect 回來後更新狀態；這不是 cloud port，
   * 也不會建立匿名使用者。
   */
  onAuthStateChange(listener: (state: AuthState) => void): () => void {
    const { data } = this.#client.auth.onAuthStateChange((_event, session) => {
      listener(toAuthState(session));
    });
    return () => data.subscription.unsubscribe();
  }
}

export class DisabledAuthAdapter implements AuthPort {
  async getState(): Promise<AuthState> {
    return { kind: "signed_out" };
  }

  async signInWithGoogle(): Promise<void> {
    throw new SupabaseAuthError("AUTH_NOT_CONFIGURED", "Google 登入尚未設定");
  }

  async getAccessToken(): Promise<string | null> {
    return null;
  }

  async signOut(): Promise<void> {
    // 未設定雲端時，登出是安全的 no-op；本機資料不受影響。
  }
}

export function createSupabaseAuthAdapter(
  options: {
    url?: string;
    publishableKey?: string;
    redirectTo?: string;
    client?: SupabaseAuthClient;
  } = {}
): AuthPort {
  if (options.client !== undefined) {
    return new SupabaseAuthAdapter({
      client: options.client,
      ...(options.redirectTo === undefined
        ? {}
        : { redirectTo: options.redirectTo })
    });
  }

  const url = readConfiguredEnvironmentValue(
    options.url ?? import.meta.env.VITE_SUPABASE_URL
  );
  const publishableKey = readConfiguredEnvironmentValue(
    options.publishableKey ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  );
  if (url === undefined || publishableKey === undefined) {
    return new DisabledAuthAdapter();
  }

  const redirectTo =
    options.redirectTo ??
    (typeof globalThis.location === "undefined"
      ? undefined
      : `${globalThis.location.origin}/`);
  return new SupabaseAuthAdapter({
    client: createClient(url, publishableKey),
    ...(redirectTo === undefined ? {} : { redirectTo })
  });
}

function toAuthState(session: Session | null): AuthState {
  if (session === null) return { kind: "signed_out" };
  return {
    kind: "signed_in",
    userId: session.user.id,
    accessTokenExpiresAt:
      session.expires_at === undefined
        ? null
        : new Date(session.expires_at * 1000).toISOString()
  };
}
