#!/usr/bin/env node
import { render } from "ink";
import React from "react";

import { App } from "./app.js";
import { getVariantById } from "./variants/index.js";

const args = process.argv.slice(2);
let replayActionId: string | undefined;
let variantId: string | undefined;

const replayIdx = args.indexOf("--replay");
if (replayIdx >= 0 && args[replayIdx + 1]) {
  replayActionId = args[replayIdx + 1];
}

const variantIdx = args.indexOf("--variant");
if (variantIdx >= 0 && args[variantIdx + 1]) {
  variantId = args[variantIdx + 1];
}

const variant = variantId ? getVariantById(variantId) : undefined;
if (variantId && !variant) {
  console.error(`Unknown console variant: ${variantId}`);
  process.exit(1);
}

const appProps = variant ? { variant } : {};

render(
  replayActionId ? (
    <App replayActionId={replayActionId} {...appProps} />
  ) : (
    <App {...appProps} />
  )
);
