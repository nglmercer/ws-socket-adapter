# Installation Guide

Requirements
- Node.js >= 16.0.0

Install
- npm install ws-socketio-adapter

TypeScript
- tsconfig.json should output to dist and include src. This project ships types in dist/index.d.ts.

Build and Test
- Build: npm run build
- Watch: npm run build:watch
- Tests: npm test (Jest configured with ts-jest)
- Coverage: npm run test:coverage
- Lint: npm run lint (ESLint + Prettier)
- Format: npm run format

Usage Environments
- Server runs in Node.js using ws.
- Client can run in browsers (WebSocket global) or Node.js (ws polyfill). Pass auth/query headers via options.

Common Issues
- Ensure Node >= 16.
- When bundling for browser, ensure WebSocket global is available.
- If using ESM, import from built files or configure bundler to handle .js module specifiers for TS sources.