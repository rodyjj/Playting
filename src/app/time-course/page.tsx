import Header from "@/components/home/Header";
import TimeCourseFeed from "@/components/time-course/TimeCourseFeed";

export default function TimeCoursePage() {
  return (
    <div className="min-h-dvh w-full pb-16">
      <Header />
      <TimeCourseFeed />
    </div>
  );
}
