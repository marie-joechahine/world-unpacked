import { BackgroundEffects } from "@/components/ui/BackgroundEffects";
import { CountryInfoPanel } from "@/components/ui/CountryInfoPanel";
import { FlagOverlay } from "@/components/ui/FlagOverlay";
import { WorldMap } from "@/components/map/WorldMap";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#e8f7fb] text-[#12323f]">
      <BackgroundEffects />
      <section className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-6 sm:px-8 lg:px-12">
        <div className="pointer-events-none absolute left-1/2 top-6 z-20 w-[min(720px,calc(100%-2rem))] -translate-x-1/2 text-center sm:top-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.45em] text-[#0d4f6b]/75">
            World Unpacked
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.045em] text-[#12323f] sm:text-5xl lg:text-6xl">
            Explore a calmer, sunlit Earth.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm font-medium leading-6 text-[#4c666c] sm:text-base">
            Hover a country to reveal its flag through soft ocean color, warm daylight, and natural motion.
          </p>
        </div>

        <WorldMap />
        <FlagOverlay />
        <CountryInfoPanel />
      </section>
    </main>
  );
}
