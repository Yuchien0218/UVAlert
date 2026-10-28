import { withCors } from "../_shared/http.ts";
import {
  createParseSunscreenLabelHandler,
  type ParseSunscreenLabelDependencies
} from "./handler.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
  serve(handler: (request: Request) => Promise<Response>): void;
};

function createProductionDependencies(): ParseSunscreenLabelDependencies {
  return {
    readSecret(name: string) {
      return Deno.env.get(name);
    },
    fetchUpstream(input: RequestInfo | URL, init?: RequestInit) {
      return fetch(input, init);
    },
    now() {
      return new Date();
    }
  };
}

const handleParseSunscreenLabel = createParseSunscreenLabelHandler(
  createProductionDependencies()
);

Deno.serve(async (request: Request) =>
  withCors(await handleParseSunscreenLabel(request), request)
);
