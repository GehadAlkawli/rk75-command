declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    ADMIN_ACCESS_PASSWORD: string;
    SESSION_SECRET: string;
    TWITCH_CLIENT_ID?: string;
    TWITCH_CLIENT_SECRET?: string;
    KICK_CLIENT_ID?: string;
    KICK_CLIENT_SECRET?: string;
    YOUTUBE_API_KEY?: string;
  }
}
