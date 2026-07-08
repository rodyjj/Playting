"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import IntroSlides from "./IntroSlides";
import AgeStep from "./AgeStep";
import OttStep from "./OttStep";
import GenreStep from "./GenreStep";
import PeopleStep from "./PeopleStep";
import { submitOnboarding } from "@/lib/onboarding";

type Stage = "intro" | "age" | "ott" | "genre" | "people";

const DEFAULT_AGE = 25;

export default function OnboardingWizard() {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("intro");
  const [age, setAge] = useState(DEFAULT_AGE);
  const [selectedOtt, setSelectedOtt] = useState<string[]>([]);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [preferredPeople, setPreferredPeople] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleOtt = (id: string) => {
    setSelectedOtt((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const toggleGenre = (id: string) => {
    setSelectedGenres((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await submitOnboarding({
      age,
      subscribedOtt: selectedOtt,
      preferredGenres: selectedGenres,
      preferredPeople,
    });
    setIsSubmitting(false);
    router.push("/");
  };

  return (
    <div className="h-dvh w-full">
      {stage === "intro" && <IntroSlides onComplete={() => setStage("age")} />}
      {stage === "age" && (
        <AgeStep age={age} onChange={setAge} onNext={() => setStage("ott")} onBack={() => setStage("intro")} />
      )}
      {stage === "ott" && (
        <OttStep
          selected={selectedOtt}
          onToggle={toggleOtt}
          onNext={() => setStage("genre")}
          onBack={() => setStage("age")}
        />
      )}
      {stage === "genre" && (
        <GenreStep
          selected={selectedGenres}
          onToggle={toggleGenre}
          onNext={() => setStage("people")}
          onBack={() => setStage("ott")}
        />
      )}
      {stage === "people" && (
        <PeopleStep
          people={preferredPeople}
          onChange={setPreferredPeople}
          onFinish={handleSubmit}
          onBack={() => setStage("genre")}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
