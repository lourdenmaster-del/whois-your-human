import VoiceProfileBuilder from "@/components/VoiceProfileBuilder";

export const metadata = {
  title: "Voice Profile Builder | LIGS",
  description: "Build a brand voice profile for LIGS copy generation.",
};

export default function VoicePage() {
  return (
    <main className="min-h-screen bg-[var(--bg)]">
      <VoiceProfileBuilder />
    </main>
  );
}
