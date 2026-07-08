import Image from "next/image";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center px-6 pt-6">
      <Link href="/" aria-label="홈으로 이동">
        <Image
          src="/playting-wordmark.png"
          alt="Playting"
          width={489}
          height={160}
          priority
          className="h-9 w-auto"
        />
      </Link>
    </header>
  );
}
