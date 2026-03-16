#!/usr/bin/env tsx
import React from "react";
import { render } from "ink";
import { App } from "./ui/index.tsx";
import "dotenv/config";

render(React.createElement(App));
