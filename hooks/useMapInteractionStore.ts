"use client";

import { create } from "zustand";
import type { CountryMetadata } from "@/lib/countries";

type MapInteractionState = {
  hoveredCountry: CountryMetadata | null;
  selectedCountry: CountryMetadata | null;
  isPointerInsideMap: boolean;
  setHoveredCountry: (country: CountryMetadata | null) => void;
  setSelectedCountry: (country: CountryMetadata | null) => void;
  setPointerInsideMap: (isInside: boolean) => void;
  clearInteraction: () => void;
};

export const useMapInteractionStore = create<MapInteractionState>((set) => ({
  hoveredCountry: null,
  selectedCountry: null,
  isPointerInsideMap: false,
  setHoveredCountry: (country) => set({ hoveredCountry: country }),
  setSelectedCountry: (country) => set({ selectedCountry: country, hoveredCountry: country }),
  setPointerInsideMap: (isPointerInsideMap) => set({ isPointerInsideMap }),
  clearInteraction: () => set({ hoveredCountry: null, isPointerInsideMap: false })
}));
