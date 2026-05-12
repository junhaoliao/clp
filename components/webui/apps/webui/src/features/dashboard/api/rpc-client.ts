import {hc} from "hono/client";
import type {AppType} from "@webui/server/hono-app";

const client = hc<AppType>("/");
export const hcWithType = () => client;
