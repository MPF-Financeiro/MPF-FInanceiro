/** @type {import('next').NextConfig} */

// App do Financeiro. Vive sob /financeiro para que o SampsOS possa servi-lo
// no mesmo domínio por multi-zones (rewrite), sem compartilhar processo,
// banco ou deploy: uma falha aqui não derruba o SampsOS.
const cspEnforce = [
  "default-src 'self'",
  // Em dev o webpack do Next usa eval() nos chunks; sem 'unsafe-eval' o React
  // não hidrata e nada no cliente funciona. Produção continua sem eval.
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: cspEnforce },
];

const nextConfig = {
  basePath: "/financeiro",
  assetPrefix: "/financeiro",
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
