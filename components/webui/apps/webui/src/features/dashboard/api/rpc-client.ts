import type {AppType} from "@webui/server/hono-app";
import {hc} from "hono/client";


const client = hc<AppType>("/");
export const hcWithType = () => client;
