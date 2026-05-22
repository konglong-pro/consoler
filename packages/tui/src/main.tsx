#!/usr/bin/env node
import { render } from "ink";
import React from "react";

import { App } from "./app.js";

const args = process.argv.slice(2);
let replayActionId: string | undefined;
const replayIdx = args.indexOf("--replay");
if (replayIdx >= 0 && args[replayIdx + 1]) {
  replayActionId = args[replayIdx + 1];
}

render(replayActionId ? <App replayActionId={replayActionId} /> : <App />);
