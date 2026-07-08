import Header from "@/components/home/Header";
import ComingSoon from "@/components/common/ComingSoon";

export default function HoneyPage() {
  return (
    <div className="min-h-dvh w-full pb-16">
      <Header />
      <ComingSoon
        emoji="🍯"
        title="꿀맛 랭킹"
        description={"지금 대한민국에서 가장 인기 있는\nOTT 콘텐츠 랭킹을 보여드릴게요."}
      />
    </div>
  );
}
