import Image from "next/image";

export default function EventBanner() {
  return (
    <div className="px-6 pt-6">
      <div className="relative aspect-[1749/372] w-full overflow-hidden rounded-2xl">
        <Image
          src="/event-banner.png"
          alt="Playting 오픈베타 시작! 7.10 오픈"
          fill
          sizes="(max-width: 430px) 100vw, 430px"
          className="object-contain"
        />
      </div>
    </div>
  );
}
