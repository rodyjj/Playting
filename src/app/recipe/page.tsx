import Header from "@/components/home/Header";
import RecipeTabs from "@/components/recipe/RecipeTabs";

export default function RecipePage() {
  return (
    <div className="min-h-dvh w-full pb-16">
      <Header />
      <RecipeTabs />
    </div>
  );
}
