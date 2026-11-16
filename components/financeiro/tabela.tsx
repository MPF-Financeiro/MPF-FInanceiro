import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Tabela rola sozinha no celular em vez de empurrar a página. O `relative` não
 * é enfeite: o texto só para leitor de tela (`sr-only`) é posicionado de forma
 * absoluta, e sem um ancestral posicionado aqui dentro ele escapa da rolagem e
 * alarga a página inteira no celular.
 */
export function Tabela({
  children,
  minWidth = 720,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="relative -mx-5 overflow-x-auto px-5">
      <table className="w-full border-collapse text-sm" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function Th({
  children,
  numero,
  className,
}: {
  children?: React.ReactNode;
  numero?: boolean;
  className?: string;
}) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap border-b border-border pb-2 pe-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        numero ? "text-end" : "text-start",
        className
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numero,
  className,
}: {
  children: React.ReactNode;
  numero?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        "whitespace-nowrap border-b border-border/60 py-3 pe-4 align-middle",
        numero && "num text-end tabular-nums",
        className
      )}
    >
      {children}
    </td>
  );
}

const CLASSE_ACAO =
  "rounded text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";

/**
 * A ação de uma linha da tabela. O rótulo visível é curto ("Abrir"), e `oQue`
 * diz em voz alta de que linha ele é — sem isso, quem usa leitor de tela ouve
 * "Abrir, Abrir, Abrir" numa tabela de trinta contas e não sabe qual é qual.
 * O anel de foco vem daqui para não faltar em uma tela ou outra.
 */
export function AcaoDaLinha({
  children,
  oQue,
  href,
  onClick,
}: {
  children: React.ReactNode;
  /** O que esta linha é, por extenso: "a conta Aluguel de novembro". */
  oQue: string;
  href?: string;
  onClick?: () => void;
}) {
  const conteudo = (
    <>
      {children}
      <span className="sr-only"> {oQue}</span>
    </>
  );
  if (href) {
    return (
      <Link href={href} className={CLASSE_ACAO}>
        {conteudo}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={CLASSE_ACAO}>
      {conteudo}
    </button>
  );
}
