import http from 'node:http';
import https from 'node:https';

const upstreamOrigin = new URL(
  process.env.UPSTREAM_ORIGIN || 'https://rk75-command.rk75command.workers.dev',
);
const port = Number(process.env.PORT || 8080);
const requestTransport = upstreamOrigin.protocol === 'https:' ? https : http;

const server = http.createServer((request, response) => {
  const proxyRequest = requestTransport.request({
    hostname: upstreamOrigin.hostname,
    port: upstreamOrigin.port || (upstreamOrigin.protocol === 'https:' ? 443 : 80),
    method: request.method,
    path: request.url || '/',
    headers: {
      ...request.headers,
      host: upstreamOrigin.host,
      'x-forwarded-host': request.headers.host || '',
      'x-forwarded-proto': 'https',
    },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });

  proxyRequest.on('error', () => {
    if (!response.headersSent) {
      response.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    }
    response.end('RK75 is temporarily unavailable. Please try again.');
  });

  request.pipe(proxyRequest);
});

server.listen(port, '0.0.0.0', () => {
  console.log(`RK75 JustRunMy gateway is listening on port ${port}`);
});
