import http from 'node:http';
import https from 'node:https';

const upstreamHost = 'rk75.gehadalkawli.chatgpt.site';
const port = Number(process.env.PORT || 8080);

const server = http.createServer((request, response) => {
  const proxyRequest = https.request({
    hostname: upstreamHost,
    port: 443,
    method: request.method,
    path: request.url,
    headers: { ...request.headers, host: upstreamHost },
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
  console.log(`RK75 public host is listening on port ${port}`);
});
