import type { PapelUsuario } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    papel: PapelUsuario;
  }
  interface Session {
    user: { id: string; papel: PapelUsuario } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    papel: PapelUsuario;
  }
}
