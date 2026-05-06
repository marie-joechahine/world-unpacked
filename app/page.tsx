import { BackgroundEffects } from "@/components/ui/BackgroundEffects";
import { CountryInfoPanel } from "@/components/ui/CountryInfoPanel";
import { FlagOverlay } from "@/components/ui/FlagOverlay";
import { WorldMap } from "@/components/map/WorldMap";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#020713] text-white">
      <BackgroundEffects />
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute left-1/2 top-6 z-20 w-[min(680px,calc(100%-2rem))] -translate-x-1/2 text-center sm:top-8">
          <p className="mb-3 text-xs font-medium uppercase tracking-[0.45em] text-cyan-200/70">
            World Unpacked
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.04em] text-white/95 sm:text-5xl lg:text-6xl">
            Explore Earth by feeling every country.
          </h1>
        </div>

        <WorldMap />
        <FlagOverlay />
        <CountryInfoPanel />
      </section>
    </main>
  );
}
