"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Cloud,
  Clouds,
  Float,
  Grid,
  OrbitControls,
  Sparkles,
  Stars,
} from "@react-three/drei";
import * as THREE from "three";
import styles from "./ThreeJsSandbox.module.css";

type GeometryMode =
  | "globe"
  | "pyramids"
  | "tower"
  | "terrain"
  | "box"
  | "sphere"
  | "torus"
  | "knot";
type MaterialMode = "standard" | "glass" | "wire";
type CameraMode = "perspective" | "orthographic";

type SceneSettings = {
  geometry: GeometryMode;
  material: MaterialMode;
  camera: CameraMode;
  rotate: boolean;
  orbit: boolean;
  grid: boolean;
  stars: boolean;
  sparkles: boolean;
  clouds: boolean;
  fog: boolean;
  atmosphere: boolean;
  glow: boolean;
  speed: number;
  scale: number;
  intensity: number;
  metalness: number;
  roughness: number;
};

const INITIAL_SETTINGS: SceneSettings = {
  geometry: "globe",
  material: "standard",
  camera: "perspective",
  rotate: true,
  orbit: true,
  grid: true,
  stars: true,
  sparkles: true,
  clouds: false,
  fog: false,
  atmosphere: true,
  glow: true,
  speed: 0.6,
  scale: 1,
  intensity: 0.7,
  metalness: 0.35,
  roughness: 0.28,
};

const LAND_PATCHES = [
  { lat: 48, lon: -102, scale: [0.52, 0.2, 1] },
  { lat: -15, lon: -60, scale: [0.34, 0.5, 1] },
  { lat: 7, lon: 20, scale: [0.42, 0.5, 1] },
  { lat: 50, lon: 75, scale: [0.68, 0.25, 1] },
  { lat: -25, lon: 135, scale: [0.38, 0.28, 1] },
  { lat: 72, lon: -42, scale: [0.34, 0.16, 1] },
] satisfies Array<{
  lat: number;
  lon: number;
  scale: [number, number, number];
}>;

const PLACE_MARKERS = [
  { name: "Paris", lat: 48.8566, lon: 2.3522, color: "#facc15" },
  { name: "Giza", lat: 29.9792, lon: 31.1342, color: "#f97316" },
  { name: "Dubai", lat: 25.2048, lon: 55.2708, color: "#38bdf8" },
  { name: "Rio", lat: -22.9068, lon: -43.1729, color: "#34d399" },
] as const;

const ATMOSPHERE_VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const ATMOSPHERE_FRAGMENT = /* glsl */ `
  uniform float uIntensity;
  uniform float uGlow;
  uniform float uTime;
  varying vec2 vUv;

  void main() {
    vec2 center = vUv - vec2(0.5);
    float dist = length(center);
    float edge = smoothstep(0.18, 0.86, dist);
    float horizon = smoothstep(0.58, 0.18, abs(vUv.y - 0.48));
    float pulse = 0.92 + 0.08 * sin(uTime * 0.5);
    vec3 blue = vec3(0.08, 0.22, 0.34) * edge * uIntensity;
    vec3 gold = vec3(0.95, 0.66, 0.18) * horizon * uGlow * pulse;
    float alpha = clamp(edge * 0.32 * uIntensity + horizon * 0.18 * uGlow, 0.0, 0.62);
    gl_FragColor = vec4(blue + gold, alpha);
  }
`;

function createRenderer(defaultProps: THREE.WebGLRendererParameters) {
  return new THREE.WebGLRenderer({
    ...defaultProps,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
}

function latLngToVector3(lat: number, lon: number, radius: number) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lon + 180);

  return new THREE.Vector3(
    -(radius * Math.sin(phi) * Math.cos(theta)),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function SurfaceDisc({
  lat,
  lon,
  radius,
  scale,
  color,
  opacity = 0.82,
}: {
  lat: number;
  lon: number;
  radius: number;
  scale: [number, number, number];
  color: string;
  opacity?: number;
}) {
  const transform = useMemo(() => {
    const position = latLngToVector3(lat, lon, radius);
    const normal = position.clone().normalize();
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      normal,
    );

    return { position, quaternion };
  }, [lat, lon, radius]);

  return (
    <mesh
      position={transform.position}
      quaternion={transform.quaternion}
      scale={scale}
    >
      <circleGeometry args={[1, 28]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.74}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function GlobeExample({ settings }: { settings: SceneSettings }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!settings.rotate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * settings.speed * 0.42;
  });

  return (
    <Float
      speed={0.8 + settings.speed}
      rotationIntensity={settings.rotate ? 0.12 : 0}
      floatIntensity={0.25 + settings.intensity * 0.35}
    >
      <group ref={groupRef} scale={settings.scale}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[1.45, 80, 80]} />
          <meshStandardMaterial
            color="#1d4f73"
            emissive="#062235"
            emissiveIntensity={settings.glow ? 0.35 + settings.intensity * 0.65 : 0}
            metalness={0.08}
            roughness={0.48}
          />
        </mesh>

        <mesh scale={1.012}>
          <sphereGeometry args={[1.45, 48, 48]} />
          <meshBasicMaterial
            color="#a7f3d0"
            wireframe
            transparent
            opacity={0.16 + settings.intensity * 0.08}
          />
        </mesh>

        {LAND_PATCHES.map((patch) => (
          <SurfaceDisc
            key={`${patch.lat}-${patch.lon}`}
            lat={patch.lat}
            lon={patch.lon}
            radius={1.472}
            scale={patch.scale}
            color="#3f9f69"
          />
        ))}

        {PLACE_MARKERS.map((marker) => (
          <SurfaceDisc
            key={marker.name}
            lat={marker.lat}
            lon={marker.lon}
            radius={1.5}
            scale={[0.045, 0.045, 1]}
            color={marker.color}
            opacity={1}
          />
        ))}
      </group>
    </Float>
  );
}

function PyramidExample({ settings }: { settings: SceneSettings }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!settings.rotate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * settings.speed * 0.3;
  });

  return (
    <Float speed={0.7 + settings.speed} rotationIntensity={0.08} floatIntensity={0.25}>
      <group ref={groupRef} scale={settings.scale} position={[0, -0.45, 0]}>
        <mesh position={[0, -0.16, 0]} receiveShadow>
          <boxGeometry args={[4.8, 0.12, 3.2]} />
          <meshStandardMaterial color="#c79a57" roughness={0.86} />
        </mesh>

        {[
          { position: [-0.9, 0.48, 0], size: 1.42 },
          { position: [0.65, 0.34, 0.34], size: 1.05 },
          { position: [1.35, 0.2, -0.44], size: 0.72 },
        ].map((pyramid) => (
          <mesh
            key={`${pyramid.position[0]}-${pyramid.size}`}
            position={pyramid.position as [number, number, number]}
            rotation={[0, Math.PI * 0.25, 0]}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[pyramid.size, pyramid.size * 1.15, 4, 1]} />
            <meshStandardMaterial
              color="#d9b26f"
              emissive="#3b2411"
              emissiveIntensity={settings.glow ? settings.intensity * 0.22 : 0}
              roughness={0.82}
            />
          </mesh>
        ))}

        <mesh position={[0.1, 0.28, 1.02]} castShadow>
          <boxGeometry args={[1.2, 0.32, 0.46]} />
          <meshStandardMaterial color="#b8894d" roughness={0.8} />
        </mesh>
        <mesh position={[-0.62, 0.52, 1.02]} castShadow>
          <sphereGeometry args={[0.22, 24, 12]} />
          <meshStandardMaterial color="#b8894d" roughness={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

function TowerExample({ settings }: { settings: SceneSettings }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!settings.rotate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * settings.speed * 0.36;
  });

  const beamMaterial = (
    <meshStandardMaterial
      color="#d1b16a"
      emissive="#283646"
      emissiveIntensity={settings.glow ? settings.intensity * 0.5 : 0}
      metalness={0.38}
      roughness={0.32}
    />
  );

  return (
    <Float speed={0.85 + settings.speed} rotationIntensity={0.1} floatIntensity={0.28}>
      <group ref={groupRef} scale={settings.scale} position={[0, -0.68, 0]}>
        <mesh position={[0, -0.1, 0]} receiveShadow>
          <boxGeometry args={[2.8, 0.16, 2.8]} />
          <meshStandardMaterial color="#526070" roughness={0.6} />
        </mesh>

        <mesh position={[0, 0.85, 0]} rotation={[0, Math.PI * 0.25, 0]} castShadow>
          <coneGeometry args={[1.0, 2.55, 4, 3, true]} />
          <meshBasicMaterial color="#f7d77b" wireframe />
        </mesh>

        {[0.05, 0.78, 1.42].map((height, index) => (
          <mesh key={height} position={[0, height, 0]} castShadow>
            <boxGeometry args={[1.8 - index * 0.42, 0.08, 1.8 - index * 0.42]} />
            {beamMaterial}
          </mesh>
        ))}

        <mesh position={[0, 2.02, 0]} castShadow>
          <cylinderGeometry args={[0.1, 0.16, 0.72, 18]} />
          {beamMaterial}
        </mesh>
        <mesh position={[0, 2.55, 0]} castShadow>
          <coneGeometry args={[0.12, 0.44, 18]} />
          <meshStandardMaterial color="#facc15" emissive="#facc15" emissiveIntensity={0.35} />
        </mesh>
      </group>
    </Float>
  );
}

function TerrainExample({ settings }: { settings: SceneSettings }) {
  const groupRef = useRef<THREE.Group>(null);
  const terrainGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(4.4, 4.4, 56, 56);
    const position = geometry.attributes.position;

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const ridge =
        Math.sin(x * 2.8) * 0.18 +
        Math.cos(y * 3.4) * 0.16 +
        Math.sin((x + y) * 2.2) * 0.14;
      const peakA = Math.max(0, 0.9 - Math.hypot(x + 0.75, y - 0.35)) * 0.78;
      const peakB = Math.max(0, 0.7 - Math.hypot(x - 0.8, y + 0.6)) * 0.62;

      position.setZ(index, ridge + peakA + peakB);
    }

    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  useFrame((_, delta) => {
    if (!settings.rotate || !groupRef.current) return;
    groupRef.current.rotation.y += delta * settings.speed * 0.24;
  });

  return (
    <Float speed={0.65 + settings.speed} rotationIntensity={0.05} floatIntensity={0.2}>
      <group ref={groupRef} scale={settings.scale} position={[0, -0.55, 0]}>
        <mesh
          geometry={terrainGeometry}
          rotation={[-Math.PI * 0.5, 0, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial
            color="#4f8b62"
            emissive="#10291c"
            emissiveIntensity={settings.glow ? settings.intensity * 0.2 : 0}
            roughness={0.78}
            metalness={0.02}
          />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI * 0.5, 0, -0.25]}>
          <planeGeometry args={[0.16, 4.25, 1, 1]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#0ea5e9"
            emissiveIntensity={0.35 + settings.intensity * 0.35}
            transparent
            opacity={0.82}
          />
        </mesh>
      </group>
    </Float>
  );
}

function SandboxObject({ settings }: { settings: SceneSettings }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (!settings.rotate || !meshRef.current) return;
    meshRef.current.rotation.x += delta * settings.speed * 0.35;
    meshRef.current.rotation.y += delta * settings.speed * 0.7;
  });

  const material =
    settings.material === "wire" ? (
      <meshBasicMaterial color="#facc15" wireframe />
    ) : settings.material === "glass" ? (
      <meshPhysicalMaterial
        color="#8fd3ff"
        metalness={0}
        roughness={0.03}
        transmission={0.55}
        thickness={0.9}
        transparent
        opacity={0.74}
      />
    ) : (
      <meshStandardMaterial
        color="#f8d36a"
        emissive="#1a3b52"
        emissiveIntensity={settings.glow ? settings.intensity * 0.8 : 0}
        metalness={settings.metalness}
        roughness={settings.roughness}
      />
    );

  return (
    <Float
      speed={1 + settings.speed * 2}
      rotationIntensity={settings.rotate ? 0.55 : 0}
      floatIntensity={0.45 + settings.intensity}
    >
      <mesh ref={meshRef} scale={settings.scale} castShadow receiveShadow>
        {settings.geometry === "box" ? <boxGeometry args={[2.2, 2.2, 2.2, 10, 10, 10]} /> : null}
        {settings.geometry === "sphere" ? <sphereGeometry args={[1.45, 64, 64]} /> : null}
        {settings.geometry === "torus" ? <torusGeometry args={[1.25, 0.38, 48, 96]} /> : null}
        {settings.geometry === "knot" ? <torusKnotGeometry args={[1, 0.32, 160, 24]} /> : null}
        {material}
      </mesh>
    </Float>
  );
}

function ExampleObject({ settings }: { settings: SceneSettings }) {
  if (settings.geometry === "globe") return <GlobeExample settings={settings} />;
  if (settings.geometry === "pyramids") return <PyramidExample settings={settings} />;
  if (settings.geometry === "tower") return <TowerExample settings={settings} />;
  if (settings.geometry === "terrain") return <TerrainExample settings={settings} />;

  return <SandboxObject settings={settings} />;
}

function Atmosphere({ intensity, glow }: { intensity: number; glow: boolean }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uIntensity: { value: intensity },
      uGlow: { value: glow ? 1 : 0 },
      uTime: { value: 0 },
    }),
    [glow, intensity],
  );

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uIntensity.value = intensity;
    materialRef.current.uniforms.uGlow.value = glow ? 1 : 0;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <mesh frustumCulled={false} renderOrder={-10}>
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

function Scene({ settings }: { settings: SceneSettings }) {
  return (
    <>
      <color attach="background" args={["#081018"]} />
      {settings.fog ? <fog attach="fog" args={["#081018", 8, 22]} /> : null}

      <ambientLight intensity={0.45 + settings.intensity * 0.5} />
      <directionalLight
        position={[4, 7, 5]}
        intensity={1.3 + settings.intensity * 2}
        castShadow
      />
      <pointLight position={[-4, 2, -3]} color="#38bdf8" intensity={settings.intensity * 8} />

      {settings.atmosphere ? (
        <Atmosphere intensity={settings.intensity} glow={settings.glow} />
      ) : null}

      {settings.stars ? (
        <Stars
          radius={55}
          depth={35}
          count={Math.round(900 + settings.intensity * 3200)}
          factor={3 + settings.intensity * 4}
          saturation={0.1}
          fade
          speed={settings.speed}
        />
      ) : null}

      {settings.sparkles ? (
        <Sparkles
          count={Math.round(60 + settings.intensity * 240)}
          scale={8}
          size={2 + settings.intensity * 3}
          speed={0.25 + settings.speed}
          color="#fff2b8"
          opacity={0.45 + settings.intensity * 0.35}
        />
      ) : null}

      {settings.clouds ? (
        <Clouds material={THREE.MeshLambertMaterial} limit={4}>
          <Cloud
            position={[0, -1.6, -2]}
            segments={16}
            bounds={[6, 2, 2]}
            volume={6}
            opacity={0.16 + settings.intensity * 0.2}
            speed={0.1 + settings.speed * 0.24}
            color="#b7c7d8"
          />
        </Clouds>
      ) : null}

      <ExampleObject settings={settings} />

      {settings.grid ? (
        <Grid
          position={[0, -2.15, 0]}
          args={[12, 12]}
          cellSize={0.5}
          cellThickness={0.6}
          cellColor="#33525e"
          sectionSize={2}
          sectionThickness={1.2}
          sectionColor="#facc15"
          fadeDistance={15}
          fadeStrength={1}
          infiniteGrid={false}
        />
      ) : null}

      {settings.orbit ? (
        <OrbitControls
          enableDamping
          dampingFactor={0.08}
          minDistance={3.5}
          maxDistance={10}
          maxPolarAngle={Math.PI * 0.82}
        />
      ) : null}
    </>
  );
}

function updateNumber(
  value: string,
  setSettings: React.Dispatch<React.SetStateAction<SceneSettings>>,
  key: keyof Pick<
    SceneSettings,
    "speed" | "scale" | "intensity" | "metalness" | "roughness"
  >,
) {
  setSettings((current) => ({ ...current, [key]: Number(value) }));
}

export function ThreeJsSandbox() {
  const [settings, setSettings] = useState(INITIAL_SETTINGS);

  const cameraConfig =
    settings.camera === "perspective"
      ? ({ position: [0, 1.1, 6] as const, fov: 50, near: 0.1, far: 100 })
      : ({ position: [0, 1.1, 6] as const, zoom: 72, near: 0.1, far: 100 });

  return (
    <main className={styles.shell}>
      <div className={styles.stage}>
        <Canvas
          gl={createRenderer}
          camera={cameraConfig}
          orthographic={settings.camera === "orthographic"}
          dpr={[1, 1.5]}
          shadows
        >
          <Scene settings={settings} />
        </Canvas>
      </div>

      <span className={styles.mobileShade} aria-hidden="true" />

      <aside className={styles.panel} aria-label="Three.js sandbox controls">
        <div className={styles.titleRow}>
          <div>
            <h1 className={styles.title}>Three.js Sandbox</h1>
            <p className={styles.subtitle}>Geography examples plus Fiber, Drei, shaders, camera, and lights.</p>
          </div>
          <Link className={styles.homeLink} href="/">
            Map
          </Link>
        </div>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Core</h2>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Geometry</span>
            <select
              className={styles.select}
              value={settings.geometry}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  geometry: event.target.value as GeometryMode,
                }))
              }
            >
              <option value="globe">Annotated globe</option>
              <option value="pyramids">Giza pyramids</option>
              <option value="tower">Landmark tower</option>
              <option value="terrain">Mountain terrain</option>
              <option value="knot">Torus knot</option>
              <option value="torus">Torus</option>
              <option value="sphere">Sphere</option>
              <option value="box">Box</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Material</span>
            <select
              className={styles.select}
              value={settings.material}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  material: event.target.value as MaterialMode,
                }))
              }
            >
              <option value="standard">Standard</option>
              <option value="glass">Physical glass</option>
              <option value="wire">Wireframe</option>
            </select>
          </label>

          <label className={styles.field}>
            <span className={styles.fieldLabel}>Camera</span>
            <select
              className={styles.select}
              value={settings.camera}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  camera: event.target.value as CameraMode,
                }))
              }
            >
              <option value="perspective">Perspective</option>
              <option value="orthographic">Orthographic</option>
            </select>
          </label>
        </section>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Switches</h2>
          <div className={styles.toggles}>
            {(
              [
                ["rotate", "Rotate"],
                ["orbit", "Orbit"],
                ["grid", "Grid"],
                ["stars", "Stars"],
                ["sparkles", "Sparkles"],
                ["clouds", "Clouds"],
                ["fog", "Fog"],
                ["atmosphere", "Atmosphere"],
                ["glow", "Glow"],
              ] as Array<[keyof SceneSettings, string]>
            ).map(([key, label]) => (
              <label className={styles.toggle} key={key}>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={(event) =>
                    setSettings((current) => ({
                      ...current,
                      [key]: event.target.checked,
                    }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </section>

        <section className={styles.group}>
          <h2 className={styles.groupTitle}>Values</h2>
          {(
            [
              ["intensity", "Intensity", 0, 1, 0.01],
              ["speed", "Speed", 0, 2, 0.01],
              ["scale", "Scale", 0.55, 1.8, 0.01],
              ["metalness", "Metalness", 0, 1, 0.01],
              ["roughness", "Roughness", 0, 1, 0.01],
            ] as const
          ).map(([key, label, min, max, step]) => (
            <label className={styles.field} key={key}>
              <span className={styles.fieldLabel}>
                {label}
                <span className={styles.value}>{settings[key].toFixed(2)}</span>
              </span>
              <input
                className={styles.range}
                type="range"
                min={min}
                max={max}
                step={step}
                value={settings[key]}
                onChange={(event) => updateNumber(event.target.value, setSettings, key)}
              />
            </label>
          ))}
        </section>

        <dl className={styles.meter}>
          <div className={styles.meterItem}>
            <dt>R3F</dt>
            <dd>Canvas</dd>
          </div>
          <div className={styles.meterItem}>
            <dt>Drei</dt>
            <dd>
              {[
                settings.stars && "Stars",
                settings.sparkles && "Sparkles",
                settings.clouds && "Clouds",
              ].filter(Boolean).length}
            </dd>
          </div>
          <div className={styles.meterItem}>
            <dt>WebGL</dt>
            <dd>{settings.glow || settings.atmosphere ? "Shader" : "Mesh"}</dd>
          </div>
        </dl>
      </aside>
    </main>
  );
}
