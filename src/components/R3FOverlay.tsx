"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Sparkles, Stars, Cloud, Clouds } from "@react-three/drei";
import * as THREE from "three";
import styles from "./R3FOverlay.module.css";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type R3FCameraMode = "ortho" | "perspective";

export type R3FOverlayProps = {
  particles: boolean;
  atmosphere: boolean;
  fog: boolean;
  glow: boolean;
  cinematicDepth: boolean;
  intensity: number;
  camera: R3FCameraMode;
  mapCamera?: {
    pitch: number;
    bearing: number;
    zoom: number;
    center: [number, number];
  };
};

function createTransparentRenderer(defaultProps: THREE.WebGLRendererParameters) {
  return new THREE.WebGLRenderer({
    ...defaultProps,
    alpha: true,
    antialias: false,
    powerPreference: "high-performance",
  });
}

/* ------------------------------------------------------------------ */
/*  Atmosphere — fullscreen radial-gradient shader quad                */
/* ------------------------------------------------------------------ */

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform float uIntensity;
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 center = vec2(0.5);
    float dist = distance(vUv, center);
    float glow = smoothstep(0.25, 0.85, dist) * uIntensity;
    float pulse = 1.0 + 0.06 * sin(uTime * 0.4);
    vec3 color = mix(
      vec3(0.12, 0.18, 0.32),
      vec3(0.04, 0.08, 0.18),
      dist
    );
    gl_FragColor = vec4(color * pulse, glow * 0.42);
  }
`;

const SCREEN_EFFECTS_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const SCREEN_EFFECTS_FRAGMENT = /* glsl */ `
  uniform float uIntensity;
  uniform float uGlow;
  uniform float uDepth;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 center = vUv - vec2(0.5);
    float dist = length(center);
    float vignette = smoothstep(0.28, 0.82, dist) * uDepth;
    float horizon = smoothstep(0.62, 0.15, abs(vUv.y - 0.46));
    float pulse = 0.92 + 0.08 * sin(uTime * 0.55);
    vec3 glowColor = vec3(0.58, 0.72, 1.0) * horizon * uGlow * pulse;
    vec3 shade = vec3(0.02, 0.025, 0.035) * vignette;
    float alpha = clamp((horizon * uGlow * 0.2) + (vignette * 0.48), 0.0, 0.68);
    gl_FragColor = vec4(glowColor + shade, alpha * uIntensity);
  }
`;

function AtmosphereQuad({ intensity }: { intensity: number }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uIntensity: { value: intensity },
      uTime: { value: 0 },
    }),
    [intensity],
  );

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uIntensity.value = intensity;
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <mesh frustumCulled={false} renderOrder={-1}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={ATMOSPHERE_VERTEX}
        fragmentShader={ATMOSPHERE_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

function ScreenEffects({
  glow,
  cinematicDepth,
  intensity,
}: {
  glow: boolean;
  cinematicDepth: boolean;
  intensity: number;
}) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uIntensity: { value: intensity },
      uGlow: { value: glow ? 1 : 0 },
      uDepth: { value: cinematicDepth ? 1 : 0 },
      uTime: { value: 0 },
    }),
    [cinematicDepth, glow, intensity],
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uIntensity.value = intensity;
    materialRef.current.uniforms.uGlow.value = glow ? 1 : 0;
    materialRef.current.uniforms.uDepth.value = cinematicDepth ? 1 : 0;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  if (!glow && !cinematicDepth) {
    return null;
  }

  return (
    <mesh frustumCulled={false} renderOrder={10}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={SCREEN_EFFECTS_VERTEX}
        fragmentShader={SCREEN_EFFECTS_FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/*  Particle field — Sparkles + Stars                                  */
/* ------------------------------------------------------------------ */

function ParticleField({ intensity }: { intensity: number }) {
  const count = Math.round(120 + 180 * intensity);
  const starCount = Math.round(800 + 4200 * intensity);

  return (
    <>
      <Sparkles
        count={count}
        scale={14}
        size={2.5 * (0.5 + intensity)}
        speed={0.35 + intensity * 0.5}
        color="#eef0ff"
        opacity={0.45 + intensity * 0.35}
      />
      <Stars
        radius={60}
        depth={50}
        count={starCount}
        factor={3 + intensity * 3}
        saturation={0.1}
        fade
        speed={0.6 + intensity * 0.8}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Fog layer — scene fog + drifting Cloud                             */
/* ------------------------------------------------------------------ */

function FogLayer({ intensity }: { intensity: number }) {
  const near = 8 - intensity * 4;
  const far = 50 - intensity * 20;

  return (
    <>
      <fog attach="fog" args={["#0c1116", near, far]} />
      <Clouds material={THREE.MeshLambertMaterial} limit={3}>
        <Cloud
          segments={12}
          bounds={[6, 2, 2]}
          volume={4 + intensity * 4}
          opacity={0.15 + intensity * 0.25}
          speed={0.2 + intensity * 0.3}
          growth={4}
          color="#8899bb"
        />
      </Clouds>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen effects - composer-free glow and depth cues                  */
/* ------------------------------------------------------------------ */

function PostEffects({
  glow,
  cinematicDepth,
  intensity,
}: {
  glow: boolean;
  cinematicDepth: boolean;
  intensity: number;
}) {
  if (!glow && !cinematicDepth) {
    return null;
  }

  return (
    <ScreenEffects
      glow={glow}
      cinematicDepth={cinematicDepth}
      intensity={intensity}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Scene root — assembled inside the Canvas                           */
/* ------------------------------------------------------------------ */

function SceneContent({
  particles,
  atmosphere,
  fog,
  glow,
  cinematicDepth,
  intensity,
}: Omit<R3FOverlayProps, "camera" | "mapCamera">) {
  return (
    <>
      {/* Ambient light so sparkles and clouds are visible */}
      <ambientLight intensity={0.4 + intensity * 0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />

      {atmosphere ? <AtmosphereQuad intensity={intensity} /> : null}
      {particles ? <ParticleField intensity={intensity} /> : null}
      {fog ? <FogLayer intensity={intensity} /> : null}

      <PostEffects
        glow={glow}
        cinematicDepth={cinematicDepth}
        intensity={intensity}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported overlay — wraps <Canvas> with correct layering            */
/* ------------------------------------------------------------------ */

export function R3FOverlay({
  particles,
  atmosphere,
  fog,
  glow,
  cinematicDepth,
  intensity,
  camera,
}: R3FOverlayProps) {
  const cameraConfig =
    camera === "perspective"
      ? ({ fov: 55, near: 0.1, far: 200, position: [0, 0, 18] as const })
      : ({ zoom: 1, near: 0.1, far: 200, position: [0, 0, 18] as const });

  return (
    <div className={styles.overlayCanvas}>
      <Canvas
        gl={createTransparentRenderer}
        orthographic={camera === "ortho"}
        camera={cameraConfig}
        style={{ pointerEvents: "none", background: "transparent" }}
        frameloop="always"
        dpr={[1, 1.5]}
      >
        <SceneContent
          particles={particles}
          atmosphere={atmosphere}
          fog={fog}
          glow={glow}
          cinematicDepth={cinematicDepth}
          intensity={intensity}
        />
      </Canvas>
    </div>
  );
}
