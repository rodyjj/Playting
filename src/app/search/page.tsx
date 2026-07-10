import { Suspense } from "react";
import Header from "@/components/home/Header";
import SearchBar from "@/components/home/SearchBar";
import SearchResults from "@/components/search/SearchResults";

export default function SearchPage() {
  return (
    <div className="min-h-dvh w-full pb-16">
      <Header />
      <SearchBar />
      <Suspense fallback={null}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
