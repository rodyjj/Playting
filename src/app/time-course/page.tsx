import Header from "@/components/home/Header";
import ComingSoon from "@/components/common/ComingSoon";

export default function TimeCoursePage() {
  return (
    <div className="min-h-dvh w-full pb-16">
      <Header />
      <ComingSoon
        emoji="⏰"
        title="타임코스"
        description={"모닝 · 런치 · 디너 코스처럼\n출근길엔 숏폼, 점심엔 요약 영상,\n퇴근 후엔 긴 정주행 영상을 큐레이션할게요."}
      />
    </div>
  );
}
