"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CustomCourseIcon, HomeIcon, HoneyIcon, RecipeIcon, TimeCourseIcon } from "./icons";

const TABS = [
  { href: "/", label: "홈", Icon: HomeIcon },
  { href: "/honey", label: "꿀맛 랭킹", Icon: HoneyIcon },
  { href: "/custom-course", label: "맞춤 코스", Icon: CustomCourseIcon },
  { href: "/recipe", label: "레시피", Icon: RecipeIcon },
  { href: "/time-course", label: "타임코스", Icon: TimeCourseIcon },
] as const;

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname?.startsWith("/onboarding")) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 border-t border-border bg-surface/95 backdrop-blur-md">
      <div className="flex items-stretch justify-between px-1 pb-[calc(env(safe-area-inset-bottom)+0.375rem)] pt-2">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname?.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              onClick={(event) => {
                if (href === "/" && pathname === "/") {
                  event.preventDefault();
                  window.scrollTo({ top: 0, behavior: "smooth" });
                } else if (href === "/") {
                  event.preventDefault();
                  router.push("/");
                  requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
                }
              }}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1 text-center"
            >
              <Icon className={`h-6 w-6 ${active ? "text-accent-light" : "text-muted"}`} />
              <span className={`text-[10px] font-medium ${active ? "text-accent-light" : "text-muted"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
