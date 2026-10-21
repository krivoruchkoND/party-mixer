/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as functions from "../functions.js";
import type * as http from "../http.js";
import type * as nicknames from "../nicknames.js";
import type * as partyAdmin from "../partyAdmin.js";
import type * as rooms from "../rooms.js";
import type * as rooms_controls from "../rooms/controls.js";
import type * as rooms_manage from "../rooms/manage.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  crons: typeof crons;
  functions: typeof functions;
  http: typeof http;
  nicknames: typeof nicknames;
  partyAdmin: typeof partyAdmin;
  rooms: typeof rooms;
  "rooms/controls": typeof rooms_controls;
  "rooms/manage": typeof rooms_manage;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
