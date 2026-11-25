/** @type {import('next').NextConfig} */

// App do Financeiro, à parte do SampsOS: repositório, banco e deploy
// próprios. Vive sob /financeiro (basePath) desde quando seria servido no
// domínio do SampsOS; a raiz do domínio redireciona para o login.

// O `next dev` avalia código com eval para o recarregamento ao vivo. Sem
// 'unsafe-eval' a tela não hidrata e o botão de entrar fica travado. Só em
// desenvolvimento: em produção a política continua sem eval.
const emDesenvolvimento = process.env.NODE_ENV !== "production";

const cspEnforce = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${emDesenvolvimento ? " 'unsafe-eval'" : ""}`,
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
