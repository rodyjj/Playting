"use client";

export default function StepShell({
  step,
  totalSteps,
  title,
  description,
  onBack,
  headerAction,
  footer,
  children,
}: {
  step: number;
  totalSteps: number;
  title: string;
  description?: string;
  onBack?: () => void;
  headerAction?: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-6 pt-6">
        <button
          onClick={onBack}
          disabled={!onBack}
          aria-label="이전 단계로"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-elevated hover:text-foreground disabled:opacity-0"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="flex flex-1 gap-1.5">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div key={i} className="h-1 flex-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-accent-light transition-all duration-500"
                style={{ width: i < step ? "100%" : i === step ? "50%" : "0%" }}
              />
            </div>
          ))}
        </div>
        {headerAction}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden px-6 pt-8">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">{title}</h1>
        {description && <p className="mt-2 text-sm text-muted">{description}</p>}
        <div className="mt-8 flex-1 overflow-y-auto pb-4">{children}</div>
      </div>

      <div className="px-6 pb-10 pt-4">{footer}</div>
    </div>
  );
}
