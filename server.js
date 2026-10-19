'use strict';

/**
 * Minimal Node.js HTTP server tutorial.
 *
 * Resolves the listening port from the PORT environment variable, serves
 * `GET /hello` as `Hello world`, answers every other request with `Not Found`,
 * logs one line per request, and shuts down cleanly on CTRL+C.
 */

const http = require('node:http');

const DEFAULT_PORT = 3000;
const MIN_PORT = 1024;
const MAX_PORT = 65535;

// Route keys join the uppercase method and the path with a single space, so an
// unmatched method (for example POST /hello) is a plain lookup miss that falls
// through to the 404 handler rather than needing its own branch.
const routes = {
  'GET /hello': handleHello,
};

let shuttingDown = false;

function resolvePort(rawValue) {
  const raw = typeof rawValue === 'string' ? rawValue : '';
  const trimmed = raw.trim();

  if (trimmed === '') {
    return { port: DEFAULT_PORT, error: null };
  }

  const rangeError = `Invalid PORT value "${raw}": PORT must be an integer between ${MIN_PORT} and ${MAX_PORT}`;

  // The value must be digits, optionally with a leading minus, so 'abc' and
  // '3000.5' are rejected instead of being coerced. Leading zeros are allowed
  // and resolve to the same integer ('03000' becomes 3000); a negative value is
  // an integer below MIN_PORT and takes the privileged-port message.
  if (!/^-?[0-9]+$/.test(trimmed)) {
    return { port: null, error: `${rangeError}.` };
  }

  const port = Number(trimmed);

  if (port < MIN_PORT) {
    return { port: null, error: `${rangeError}; ports below ${MIN_PORT} are privileged.` };
  }

  if (port > MAX_PORT) {
    return { port: null, error: `${rangeError}.` };
  }

  return { port, error: null };
}

function getRequestPath(req) {
  return req.url.split('?')[0];
}

function logRequest(req, path) {
  console.log(`${new Date().toISOString()} ${req.method} ${path}`);
}

function handleHello(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello world');
}

function handleNotFound(req, res) {
  res.statusCode = 404;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Not Found');
}

function handleRequest(req, res) {
  const path = getRequestPath(req);

  logRequest(req, path);

  const handler = routes[`${req.method} ${path}`];

  if (handler) {
    handler(req, res);
    return;
  }

  handleNotFound(req, res);
}

function handleBindError(error, port) {
  if (error.code === 'EADDRINUSE') {
    console.error(
      `Failed to bind port ${port}: address already in use (EADDRINUSE). ` +
        'Stop the process using that port or set PORT to a free port.'
    );
  } else {
    console.error(`Failed to bind port ${port}: ${error.code} - ${error.message}`);
  }

  process.exit(1);
}

function handleShutdown(server, port) {
  // The guard keeps a second CTRL+C during shutdown from logging and closing twice.
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  console.log(`Shutting down server on port ${port}`);

  server.close(() => {
    process.exit(0);
  });

  // Idle keep-alive sockets would otherwise hold close() open; the method needs
  // Node.js 18.2.0 while the declared floor is 18.0.0, hence the guard.
  if (typeof server.closeIdleConnections === 'function') {
    server.closeIdleConnections();
  }
}

function startServer() {
  const { port, error } = resolvePort(process.env.PORT);

  if (error) {
    console.error(error);
    process.exit(1);
  }

  const server = http.createServer(handleRequest);

  server.on('error', (bindError) => {
    handleBindError(bindError, port);
  });

  process.on('SIGINT', () => {
    handleShutdown(server, port);
  });

  server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

startServer();
