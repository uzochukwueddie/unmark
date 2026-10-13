import type {
  ButtonHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type ButtonSize = "sm" | "md";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent/90 shadow-lg shadow-accent/25 disabled:shadow-none border border-accent/60",
  secondary:
    "bg-transparent text-accent hover:bg-accent/10 border border-accent/40",
  ghost:
    "bg-surface text-ink-soft hover:bg-hover hover:text-ink border border-line",
  danger:
    "bg-transparent text-bad/90 hover:bg-bad/10 hover:text-bad border border-bad/30",
  subtle:
    "bg-transparent text-ink-soft hover:bg-hover hover:text-ink border border-transparent",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "px-2.5 py-1.5 text-xs gap-1.5",
  md: "px-3.5 py-2.5 text-[13px] gap-2",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  full?: boolean;
}

export function Button({
  variant = "ghost",
  size = "md",
  full = false,
  className = "",
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      className={[
        "inline-flex items-center justify-center rounded-lg font-medium transition-all duration-150",
        "active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        full ? "w-full" : "",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function Card({
  title,
  children,
  className = "",
}: {
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-line bg-card/80 p-4 backdrop-blur-sm ${className}`}
    >
      {title && <Label>{title}</Label>}
      {children}
    </section>
  );
}

export function Label({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`mb-2.5 font-mono text-[10px] font-medium tracking-[0.14em] uppercase ${className}`}
    >
      {children}
    </p>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-[11px] leading-relaxed">{children}</p>;
}

export interface RadioOption {
  value: string;
  label: string;
  title?: string;
}

export function RadioGroup({
  name,
  value,
  onChange,
  options,
  ariaLabel,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: RadioOption[];
  ariaLabel?: string;
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="grid gap-1.5">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <label
            key={o.value}
            title={o.title}
            className={[
              "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2 text-[13px] transition",
              active
                ? "border-accent/60 bg-accent/10 text-ink"
                : "border-line bg-surface/60 text-ink-soft hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={active}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            <span
              aria-hidden="true"
              className={`grid size-3.5 shrink-0 place-items-center rounded-full border ${
                active ? "border-accent-soft" : "border-line-strong"
              }`}
            >
              {active && (
                <span className="size-1.5 rounded-full bg-accent-soft" />
              )}
            </span>
            {o.label}
          </label>
        );
      })}
    </div>
  );
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={`w-full cursor-pointer rounded-lg border border-line bg-surface px-3 py-2 text-[13px] text-ink transition hover:border-line-strong focus:border-accent-soft focus:outline-none ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Progress({
  percent,
  indeterminate = false,
}: {
  percent: number;
  indeterminate?: boolean;
}) {
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-hover">
      <div
        className="h-full rounded-full bg-linear-to-r from-accent to-accent-soft transition-[width] duration-300"
        style={{ width: `${Math.min(100, percent)}%` }}
      />
      {indeterminate && (
        <div className="animate-shimmer absolute inset-y-0 left-0 w-1/3 bg-linear-to-r from-transparent via-white/25 to-transparent" />
      )}
    </div>
  );
}
