import { createRemoteJWKSet, jwtVerify } from "jose";
import type { MiddlewareHandler } from "hono";
import { unauthorized } from "./http";
import type { Env, Variables } from "./types";

const firebaseJwks = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);

export const authenticate: MiddlewareHandler<{ Bindings: Env; Variables: Variables }> = async (context, next) => {
  if (context.env.AUTH_DEV_BYPASS === "true") {
    const devUser = context.req.header("X-Development-User");
    if (devUser) {
      context.set("firebaseUid", devUser);
      await next();
      return;
    }
  }

  const authorization = context.req.header("Authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw unauthorized();
  }

  const projectId = context.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw unauthorized("Firebase project is not configured");
  }

  const token = authorization.slice("Bearer ".length);
  const { payload } = await jwtVerify(token, firebaseJwks, {
    issuer: `https://securetoken.google.com/${projectId}`,
    audience: projectId,
  });

  const firebaseUid = typeof payload.user_id === "string" ? payload.user_id : payload.sub;
  if (!firebaseUid) {
    throw unauthorized();
  }

  context.set("firebaseUid", firebaseUid);
  await next();
};
