# Node.js HTTP Server Hello World Tutorial

A minimal, dependency-free Node.js HTTP server that shows what `http.createServer()` does when no framework is involved.

## Project Purpose

This repository is a teaching artifact: the smallest complete Node.js HTTP server that still behaves like a real one. It demonstrates how a raw `http.createServer()` endpoint is created and how requests are handled using only Node.js built-in modules — no framework (Express, Fastify, Koa), no middleware library and no routing library.

The entire program is one file, `server.js`, and it answers exactly two cases:

- `GET /hello` returns `200` with the plain-text body `Hello world`.
- Every other method and path returns `404` with the plain-text body `Not Found`.

Around those two responses it also shows the lifecycle work a server needs: one log line per request, a port read from the `PORT` environment variable, an actionable message when that port value is unusable, a clear failure when the port is already in use, and a clean shutdown on `CTRL+C` with exit status `0`.

The repository holds three files: `server.js` (the whole program), `package.json` (project metadata and the start script) and this README.

## Prerequisites

- **Node.js `>= 18.0.0`.** That floor is declared as `engines.node` in `package.json`, and every API the server uses is available at that version.

Check your runtime with:

```bash
node --version
```

Anything from v18.0.0 upward works. Be aware that the Node.js 18.x line has reached end-of-life, so a current LTS release (Node.js 22.x, for example) is the better choice for real use; the server uses nothing that requires a newer runtime, so it runs unchanged on either.

There are no other prerequisites: no database, no background service, no container and no credentials.

## Installation

**None.** There is nothing to install.

The project declares no dependencies, so there is no `npm install` step, no `package-lock.json`, no `node_modules` directory and no build step. Copy the three files onto a machine with Node.js on `PATH`, open a terminal in that directory, and the server runs directly from source. Confirm the runtime first:

```bash
node --version
```

If it prints v18.0.0 or later, you are ready to run the server. `npm start` needs no install either, because the project has no dependencies for npm to fetch.

## Execution

Start the server from the repository root:

```bash
node server.js
```

`npm start` runs exactly the same file — `package.json` sets `"start": "node server.js"` — so either command works:

```bash
npm start
```

With `npm start`, npm prints its own two-line script banner before the server's output:

```
> nodejs-tutorial-hello-world@1.0.0 start
> node server.js
```

Those two lines are npm's output, not the application's. The server's first line is the startup line shown under [Expected Output](#expected-output). Both commands run in the foreground and keep running until you stop them.

## Testing

There is no automated test suite: the project deliberately ships no test framework, no `npm test` script and no `tests` directory. Verify the server by hand with `curl` while it runs in the foreground.

Request the hello endpoint:

```bash
curl http://localhost:3000/hello
```

Add `-i` to see the status line and headers along with the body:

```bash
curl -i http://localhost:3000/hello
```

Routing is strict equality on the method and on the path, after any query string is stripped. A query string therefore does not change the match, and these calls also return `Hello world`:

```bash
curl -i "http://localhost:3000/hello?name=world"
curl -i "http://localhost:3000/hello?x=1"
```

Every other method or path falls through to the not-found response:

```bash
curl -i http://localhost:3000/invalid
curl -i -X POST http://localhost:3000/hello
```

Two near-miss paths confirm that matching is exact — the first differs in character case and the second by a trailing slash, so both return `404`:

```bash
curl -i http://localhost:3000/Hello
curl -i http://localhost:3000/hello/
```

`PUT`, `DELETE`, `PATCH`, `OPTIONS` and `HEAD` on `/hello` are `404` as well, because the route table holds only `GET /hello`. A `HEAD` request receives the `404` status and the `Content-Type` header with no response body, since Node.js omits the body of any `HEAD` response.

While you make these calls, the server prints one request line for each of them; compare those lines against the [Expected Output](#expected-output) section.

The server is a single process on the event loop with no per-request I/O, so `GET /hello` answers well inside the 10 ms budget and concurrent requests do not block one another. Time 20 sequential requests:

```bash
for i in $(seq 1 20); do curl -sS -o /dev/null -w '%{time_total}\n' http://localhost:3000/hello; done
```

Every value should be below `0.010` seconds. Drive 200 requests in parallel and check the status codes:

```bash
seq 1 200 | xargs -P 50 -I{} curl -sS -o /dev/null -w '%{http_code}\n' http://localhost:3000/hello | sort | uniq -c
```

The output is a single line, `200 200`, meaning all 200 requests were answered `200`.

## Expected Output

**Startup.** As soon as the port is bound, the server writes one line to standard output:

```
Server listening on port 3000
```

The general form is `Server listening on port <port>`, where the port is the value resolved from `PORT`; with `PORT=4000` it prints `Server listening on port 4000`.

**Request logging.** Every incoming request produces exactly one line on standard output, written before routing happens, in the form ISO-8601 timestamp, HTTP method and query-stripped path:

```
2026-10-19T05:46:32.017Z GET /hello
2026-10-19T05:46:32.018Z GET /hello
2026-10-19T05:46:32.019Z GET /invalid
2026-10-19T05:46:32.020Z POST /hello
```

The timestamp comes from `Date.prototype.toISOString()`: always 24 characters, in UTC, ending with `Z`. It is never a locale-formatted date, so the lines stay unambiguous and greppable. Matched and unmatched requests are logged identically. The query string is stripped before logging, so a request for `/hello?name=world` logs `GET /hello` — the same path the route lookup then matched against.

**Responses.** The application's contract, byte for byte:

| Request | Status | Header the application sets | Body |
|---|---|---|---|
| `GET /hello`, with or without a query string | `200` | `Content-Type: text/plain` | `Hello world` |
| Any other method or path, including `POST /hello` | `404` | `Content-Type: text/plain` | `Not Found` |

The body of the `200` response is exactly:

```
Hello world
```

The body of the `404` response is exactly:

```
Not Found
```

Neither body has a trailing newline, so the `200` body is 11 bytes and the `404` body is 9 bytes. The application sets exactly one header on each route, `Content-Type: text/plain`. Node.js adds its own standard headers to every response — `Date`, `Connection`, `Keep-Alive` and a `Content-Length` it computes from the body — and those belong to the runtime rather than to the application. There is no `405` response: a request whose method does not match is simply an unmatched route and therefore a `404`.

Requesting the hello endpoint with `curl -i` therefore shows a `200` status line, the `Content-Type: text/plain` header, the runtime headers Node.js added, and the body `Hello world`:

```bash
curl -i http://localhost:3000/hello
```

Likewise, an unmatched request shows a `404` status line, the same `Content-Type` header, and the body `Not Found`:

```bash
curl -i http://localhost:3000/invalid
```

## Shutdown

Stop the server with `CTRL+C` (the `SIGINT` signal) in the terminal where it runs. It writes one line to standard output and exits:

```
Shutting down server on port 3000
```

The shutdown sequence stops accepting new connections, lets responses already in flight finish, closes idle keep-alive connections so the process does not linger, and exits with status `0`. A second `CTRL+C` while that shutdown is already underway does nothing and does not log the line again.

To confirm the exit status without a terminal, start the server in the background, signal it and read the status of the process:

```bash
node server.js &
SERVER_PID=$!
kill -INT $SERVER_PID
wait $SERVER_PID
echo "exit=$?"
```

The final line is `exit=0`.

## Environment Variable Configuration

The server reads one environment variable, `PORT`.

| Variable | Default | Accepted values |
|---|---|---|
| `PORT` | `3000` when unset or blank | An integer from `1024` to `65535` inclusive |

Set it for a single invocation by putting it on the same command line — it works with both entry points:

```bash
PORT=4000 node server.js
```

```bash
PORT=4000 npm start
```

Either command prints `Server listening on port 4000`, and the server then answers on `http://localhost:4000/hello`. Leading zeros are accepted and resolve to the same integer, so `PORT=03000 node server.js` prints `Server listening on port 3000`.

Ports below `1024` are privileged ports, and the server refuses them rather than attempting to bind. The privileged-port check is the application's own: it rejects the value before any socket is opened.

An unusable value is reported on standard error and the process exits with status `1`, before it opens any socket. For a value that is not an integer, or an integer above `65535`:

```bash
PORT=abc node server.js
```

```
Invalid PORT value "abc": PORT must be an integer between 1024 and 65535.
```

```bash
PORT=70000 node server.js
```

```
Invalid PORT value "70000": PORT must be an integer between 1024 and 65535.
```

For an integer below `1024`:

```bash
PORT=80 node server.js
```

```
Invalid PORT value "80": PORT must be an integer between 1024 and 65535; ports below 1024 are privileged.
```

The offending value is quoted exactly as supplied, and the exit status is `1` in every rejection case, which you can confirm with:

```bash
PORT=abc node server.js; echo "exit=$?"
```

If the chosen port is already in use, the bind failure is reported on standard error with an actionable message and the process exits with status `1`, while the server already holding the port keeps running. Starting a second instance on the default port produces:

```
Failed to bind port 3000: address already in use (EADDRINUSE). Stop the process using that port or set PORT to a free port.
```

To reproduce that, start the server in one terminal and then start a second instance in another; the second one prints the message above and exits `1`. The port named in the message is the port it tried to bind.

Ports are the only thing this server configures from the environment. It accepts no command-line arguments or flags, and it reads no configuration file.
