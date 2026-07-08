"use client";

export default function PrimaryButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-full bg-accent py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent)] transition-colors hover:bg-accent-light active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-elevated disabled:text-muted disabled:shadow-none"
    >
      {children}
    </button>
  );
}
