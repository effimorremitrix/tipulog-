import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {action}
    </div>
  );
}

const buttonStyles = {
  primary:
    "bg-primary hover:bg-primary-dark text-white font-medium rounded-lg px-4 py-2 text-sm transition-colors",
  secondary:
    "bg-white hover:bg-gray-50 text-gray-700 font-medium rounded-lg px-4 py-2 text-sm border border-gray-300 transition-colors",
  danger:
    "bg-white hover:bg-red-50 text-red-600 font-medium rounded-lg px-4 py-2 text-sm border border-red-300 transition-colors",
} as const;

export function Button({
  children,
  variant = "primary",
  type = "submit",
}: {
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
  type?: "submit" | "button";
}) {
  return (
    <button type={type} className={buttonStyles[variant]}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: keyof typeof buttonStyles;
}) {
  return (
    <Link href={href} className={`inline-block ${buttonStyles[variant]}`}>
      {children}
    </Link>
  );
}

export function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-white";

export function Badge({
  children,
  className = "bg-gray-100 text-gray-700 border-gray-300",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center text-gray-500 text-sm py-10">{message}</div>
  );
}
