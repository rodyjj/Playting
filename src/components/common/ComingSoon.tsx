type ComingSoonProps = {
  emoji: string;
  title: string;
  description: string;
};

export default function ComingSoon({ emoji, title, description }: ComingSoonProps) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center gap-4 px-8 text-center">
      <span className="text-5xl">{emoji}</span>
      <h1 className="text-lg font-bold text-foreground">{title}</h1>
      <p className="whitespace-pre-line text-sm leading-relaxed text-muted">{description}</p>
      <span className="mt-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-accent-light">
        준비 중이에요
      </span>
    </div>
  );
}
