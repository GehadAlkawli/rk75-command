declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_ACCESS_PASSWORD: string;
    SESSION_SECRET: string;
  }
}
