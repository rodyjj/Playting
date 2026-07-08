type IconProps = {
  className?: string;
};

export function HomeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 11.5 12 4l8 7.5M6 9.5V19a1 1 0 0 0 1 1h3.5v-5a1.5 1.5 0 0 1 1.5-1.5v0a1.5 1.5 0 0 1 1.5 1.5v5H17a1 1 0 0 0 1-1V9.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HoneyIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      {/* jar body — barrel silhouette, outline only */}
      <path
        d="M8 7.4h8l1.8 2.2v6.2L16 19.2H8l-1.8-3.4V9.6L8 7.4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* lid */}
      <path d="M8.4 7.4 9.2 5.4h5.6l.8 2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <ellipse cx="14.5" cy="5.1" rx="1" ry="0.55" stroke="currentColor" strokeWidth="1.2" />
      {/* honey pooling at the rim, about to spill over */}
      <path d="M8.6 8.7h6.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {/* honey overflowing and dripping down inside the jar — thick same-color strokes read as solid fill */}
      <path
        d="M12.7 8.9c-1.4 1.2-1.8 2.5-.8 3.6 1 1.1.7 2.4-.7 3.4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.6 8.9c-.9 1-1.1 2-.3 2.9"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CustomCourseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12.5" cy="12" r="7.2" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="12.5" cy="12" r="3.3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M4.2 6v4.2M4.2 6a1.2 1.2 0 0 1 2.4 0v4.2M3 6v3.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M4.2 10.2V19M20.4 5.5c-1 .2-1.6 1.1-1.6 2.4 0 1.4.8 2.3 1.6 2.4M20.4 5.5V19" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function RecipeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M6.5 4h11a.5.5 0 0 1 .5.5V20l-6-3.8L6 20V4.5a.5.5 0 0 1 .5-.5Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TimeCourseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12.5" r="7.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="M12 8.3v4.4l3 1.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 2.5h5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
