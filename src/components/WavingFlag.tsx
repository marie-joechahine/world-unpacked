"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import {
  memo,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import styles from "./WavingFlag.module.css";

const FLAG_WIDTH = 3.2;
const FLAG_HEIGHT = 2.13;
const WIDTH_SEGMENTS = 78;
const HEIGHT_SEGMENTS = 42;
const DISPLACEMENT_WIDTH_SEGMENTS = 150;
const DISPLACEMENT_HEIGHT_SEGMENTS = 88;
const TEXTURE_WIDTH = 1536;
const TEXTURE_HEIGHT = 1024;

const FLAG_VERTEX_SHADER = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;
  varying float vLight;
  varying float vFold;

  void main() {
    vUv = uv;
    vec3 transformed = position;
    float pinned = pow(clamp(uv.x, 0.0, 1.0), 0.82);
    float leadingEdge = 1.0 - smoothstep(0.0, 0.1, uv.x);
    float wave = sin(uv.x * 11.4 - uTime * 2.25);
    float ripple = sin(uv.x * 23.0 + uv.y * 7.4 - uTime * 3.25);
    float slowBillow = sin(uv.x * 5.1 - uTime * 1.05);

    transformed.x += (slowBillow * 0.055 + ripple * 0.018) * pinned;
    transformed.y += sin(uv.x * 8.2 - uTime * 1.55) * 0.055 * pinned;
    transformed.z += (wave * 0.33 + ripple * 0.07) * pinned;
    transformed.z -= leadingEdge * 0.03;

    vFold = wave * pinned;
    vLight = 0.76 + wave * 0.16 + ripple * 0.06 + (1.0 - uv.x) * 0.08;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const FLAG_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying float vLight;
  varying float vFold;

  void main() {
    vec4 texel = texture2D(uTexture, vUv);
    float stitchedEdge = smoothstep(0.035, 0.0, vUv.x) * 0.18;
    float fabricLines = sin((vUv.x + vUv.y) * 420.0) * 0.018;
    float foldShadow = smoothstep(0.18, -0.7, vFold) * 0.18;
    float highlight = smoothstep(0.24, 0.88, vFold) * 0.16;
    vec3 color = texel.rgb * clamp(vLight + fabricLines - foldShadow + highlight, 0.42, 1.22);
    color = mix(color, uAccent, highlight * 0.06);
    color *= 1.0 - stitchedEdge;
    gl_FragColor = vec4(color, texel.a);
  }
`;

const DISPLACEMENT_VERTEX_SHADER = /* glsl */ `
  uniform float uAmplitude;
  uniform float uSpeed;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFold;
  varying float vLight;
  varying float vPinned;

  float waveShape(vec2 uv, float time) {
    float mainWave = sin(uv.x * 9.15 - time * uSpeed);
    float shoulderWave = sin(uv.x * 15.7 + uv.y * 2.15 - time * uSpeed * 1.18);
    float fabricWave = sin(uv.x * 31.0 + uv.y * 8.0 - time * uSpeed * 1.62);
    return mainWave * 0.76 + shoulderWave * 0.2 + fabricWave * 0.04;
  }

  void main() {
    vUv = uv;
    float poleRelease = smoothstep(0.0, 0.22, uv.x);
    float rightEdgeDamp = 1.0 - smoothstep(0.82, 1.0, uv.x) * 0.28;
    float verticalEdgeDamp = smoothstep(0.0, 0.1, uv.y) * smoothstep(0.0, 0.1, 1.0 - uv.y);
    float topEdge = 1.0 - smoothstep(0.0, 0.09, 1.0 - uv.y);
    float bottomEdge = 1.0 - smoothstep(0.0, 0.09, uv.y);
    float edgeWeight = max(topEdge, bottomEdge);
    float pinned = poleRelease * rightEdgeDamp;
    float motionMask = pinned * mix(0.72, 1.0, verticalEdgeDamp);
    float freeEdge = smoothstep(0.78, 1.0, uv.x) * verticalEdgeDamp;
    float freeEdgeCurl = smoothstep(0.82, 1.0, uv.x);
    float gravitySag = sin(uv.x * 3.14159) * -0.045;
    float wind = waveShape(uv, uTime);
    float edgeWave = sin(uv.x * 10.4 - uTime * uSpeed * 0.96);
    float trailingWave = sin(uv.y * 4.4 + uTime * uSpeed * 0.62);
    float nextWind = waveShape(vec2(min(uv.x + 0.012, 1.0), uv.y), uTime);
    float foldSlope = nextWind - wind;

    vec3 transformed = position;
    transformed.z += wind * uAmplitude * motionMask;
    transformed.x += freeEdge * sin(uTime * uSpeed * 0.42 + uv.y * 2.4) * 0.01;
    transformed.x += freeEdgeCurl * trailingWave * 0.025;
    transformed.y += (gravitySag + sin(uv.x * 7.0 - uTime * uSpeed * 0.78) * 0.014) * motionMask;
    transformed.y += topEdge * edgeWave * poleRelease * -0.038;
    transformed.y += bottomEdge * edgeWave * poleRelease * 0.034;
    transformed.z += edgeWeight * edgeWave * uAmplitude * poleRelease * 0.22;

    vFold = wind * motionMask;
    vPinned = pinned;
    vLight = 0.86 + foldSlope * 7.0 * motionMask + freeEdge * 0.025;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(transformed, 1.0);
  }
`;

const DISPLACEMENT_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  varying vec2 vUv;
  varying float vFold;
  varying float vLight;
  varying float vPinned;

  void main() {
    vec4 texel = texture2D(uTexture, vUv);
    float threadX = sin(vUv.x * 760.0) * 0.011;
    float threadY = sin(vUv.y * 520.0) * 0.008;
    float valley = smoothstep(0.1, -0.82, vFold) * 0.18;
    float crest = smoothstep(0.12, 0.92, vFold) * 0.16;
    float poleShadow = (1.0 - smoothstep(0.0, 0.12, vUv.x)) * 0.2;
    float light = clamp(vLight + crest - valley - poleShadow + threadX + threadY, 0.48, 1.2);
    vec3 color = texel.rgb * light;
    color = mix(color, vec3(0.96, 0.98, 1.0), crest * 0.04);
    gl_FragColor = vec4(color, texel.a * smoothstep(0.0, 0.015, vPinned + 0.02));
  }
`;

type WavingFlagProps = {
  accentColor: string;
  animationRenderer?: FlagAnimationRenderer;
  className?: string;
  flagUrl: string;
};

export type FlagAnimationRenderer = "three" | "svg-filter" | "webgl-displacement";

type CachedTexture = THREE.CanvasTexture | Promise<THREE.CanvasTexture>;
type TextureState = {
  failed: boolean;
  flagUrl: string;
  texture: THREE.CanvasTexture | null;
};

const textureCache = new Map<string, CachedTexture>();

function configureTexture(texture: THREE.Texture) {
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 8;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
}

function rasterizeFlagTexture(flagUrl: string) {
  const cached = textureCache.get(flagUrl);
  if (cached) {
    return Promise.resolve(cached);
  }

  const promise = new Promise<THREE.CanvasTexture>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = TEXTURE_WIDTH;
      canvas.height = TEXTURE_HEIGHT;

      const context = canvas.getContext("2d");
      if (!context) {
        reject(new Error("Could not create a 2D canvas for the flag texture."));
        return;
      }

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.clearRect(0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);
      context.drawImage(image, 0, 0, TEXTURE_WIDTH, TEXTURE_HEIGHT);

      const texture = new THREE.CanvasTexture(canvas);
      configureTexture(texture);
      textureCache.set(flagUrl, texture);
      resolve(texture);
    };

    image.onerror = () => {
      textureCache.delete(flagUrl);
      reject(new Error(`Could not load flag texture: ${flagUrl}`));
    };

    image.decoding = "async";
    image.src = flagUrl;
  });

  textureCache.set(flagUrl, promise);
  return promise;
}

function useRasterizedFlagTexture(flagUrl: string) {
  const [state, setState] = useState<TextureState>({
    failed: false,
    flagUrl: "",
    texture: null,
  });

  useEffect(() => {
    let cancelled = false;

    if (!flagUrl) {
      return () => {
        cancelled = true;
      };
    }

    rasterizeFlagTexture(flagUrl)
      .then((nextTexture) => {
        if (!cancelled) {
          setState({ failed: false, flagUrl, texture: nextTexture });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ failed: true, flagUrl, texture: null });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [flagUrl]);

  if (!flagUrl) {
    return { failed: true, texture: null };
  }

  return state.flagUrl === flagUrl
    ? { failed: state.failed, texture: state.texture }
    : { failed: false, texture: null };
}

function WavingFlagMesh({
  accentColor,
  texture,
}: {
  accentColor: string;
  texture: THREE.CanvasTexture;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uAccent: { value: new THREE.Color(accentColor) },
      uTexture: { value: texture },
      uTime: { value: 0 },
    }),
    [accentColor, texture],
  );

  useEffect(() => {
    materialRef.current?.uniforms.uAccent.value.set(accentColor);
  }, [accentColor]);

  useFrame(() => {
    const time = performance.now() * 0.001;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uTexture.value = texture;
    }

    if (meshRef.current) {
      meshRef.current.rotation.y = -0.14 + Math.sin(time * 0.75) * 0.025;
      meshRef.current.rotation.x = 0.025 + Math.sin(time * 0.5) * 0.012;
    }
  });

  return (
    <mesh ref={meshRef} scale={1.18} position={[0.08, 0, 0]}>
      <planeGeometry args={[FLAG_WIDTH, FLAG_HEIGHT, WIDTH_SEGMENTS, HEIGHT_SEGMENTS]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={FLAG_VERTEX_SHADER}
        fragmentShader={FLAG_FRAGMENT_SHADER}
        side={THREE.DoubleSide}
        transparent
        toneMapped={false}
      />
    </mesh>
  );
}

function FlagScene({
  accentColor,
  texture,
}: {
  accentColor: string;
  texture: THREE.CanvasTexture;
}) {
  return <WavingFlagMesh accentColor={accentColor} texture={texture} />;
}

function DisplacementFlagMesh({ texture }: { texture: THREE.CanvasTexture }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(
    () => ({
      uAmplitude: { value: 0.145 },
      uSpeed: { value: 0.52 },
      uTexture: { value: texture },
      uTime: { value: 0 },
    }),
    [texture],
  );

  useFrame(() => {
    const time = performance.now() * 0.001;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time;
      materialRef.current.uniforms.uTexture.value = texture;
    }

    if (meshRef.current) {
      meshRef.current.rotation.x = -0.018 + Math.sin(time * 0.2) * 0.006;
      meshRef.current.rotation.y = -0.18 + Math.sin(time * 0.24) * 0.018;
    }
  });

  return (
    <mesh ref={meshRef} scale={1.15} position={[0.08, 0.02, 0]}>
      <planeGeometry
        args={[
          FLAG_WIDTH,
          FLAG_HEIGHT,
          DISPLACEMENT_WIDTH_SEGMENTS,
          DISPLACEMENT_HEIGHT_SEGMENTS,
        ]}
      />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={DISPLACEMENT_VERTEX_SHADER}
        fragmentShader={DISPLACEMENT_FRAGMENT_SHADER}
        side={THREE.DoubleSide}
        transparent
        toneMapped={false}
      />
    </mesh>
  );
}

function DisplacementFlagScene({ texture }: { texture: THREE.CanvasTexture }) {
  return <DisplacementFlagMesh texture={texture} />;
}

function SvgFilterFlag({
  className,
  flagUrl,
}: Pick<WavingFlagProps, "className" | "flagUrl">) {
  const reactId = useId().replaceAll(":", "");
  const filterId = `learning-flag-wave-${reactId}`;
  const filterUrl = `url(#${filterId})`;

  return (
    <div
      className={`${className ?? ""} ${styles.svgFilterFlag}`}
      aria-hidden="true"
      data-learning-flag="animated"
      data-flag-renderer="svg-filter"
    >
      <svg
        className={styles.svgFlagVector}
        viewBox="0 0 900 600"
        preserveAspectRatio="none"
        focusable="false"
        aria-hidden="true"
      >
        <defs>
          <filter
            id={filterId}
            x="-18%"
            y="-24%"
            width="136%"
            height="148%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.01 0.052"
              numOctaves="2"
              seed="8"
              result="wind"
            >
              <animate
                attributeName="baseFrequency"
                dur="3.2s"
                values="0.008 0.042;0.013 0.066;0.010 0.052;0.008 0.042"
                repeatCount="indefinite"
              />
            </feTurbulence>
            <feDisplacementMap
              in="SourceGraphic"
              in2="wind"
              scale="8"
              xChannelSelector="R"
              yChannelSelector="G"
            >
              <animate
                attributeName="scale"
                dur="2.45s"
                values="4;10;7;9;4"
                repeatCount="indefinite"
              />
            </feDisplacementMap>
          </filter>
        </defs>
        <image
          className={styles.svgFlagSharpImage}
          href={flagUrl}
          width="900"
          height="600"
          preserveAspectRatio="none"
        />
        <image
          className={styles.svgFlagFilteredImage}
          href={flagUrl}
          width="900"
          height="600"
          preserveAspectRatio="none"
          filter={filterUrl}
        />
      </svg>
      <span className={styles.svgFlagSheen} />
    </div>
  );
}

function ThreeWavingFlag({
  accentColor,
  className,
  flagUrl,
}: Pick<WavingFlagProps, "accentColor" | "className" | "flagUrl">) {
  const { failed, texture } = useRasterizedFlagTexture(flagUrl);
  const [contextLost, setContextLost] = useState(false);
  const useStaticFallback = !texture || failed || contextLost;

  if (!flagUrl) {
    return <div className={`${className ?? ""} ${styles.staticFlag}`} aria-hidden="true" />;
  }

  return (
    <div
      className={`${className ?? ""} ${useStaticFallback ? styles.staticFlag : ""}`}
      aria-hidden="true"
      data-learning-flag="animated"
      data-flag-renderer={useStaticFallback ? "static-fallback" : "three"}
    >
      {texture && !contextLost ? (
        <div className={styles.canvasWrap}>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 31, near: 0.1, far: 20 }}
            dpr={[1, 2]}
            frameloop="always"
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => {
                  event.preventDefault();
                  setContextLost(true);
                },
                { once: true },
              );
            }}
            style={{ background: "transparent", pointerEvents: "none" }}
          >
            <FlagScene accentColor={accentColor} texture={texture} />
          </Canvas>
        </div>
      ) : null}
    </div>
  );
}

function WebglDisplacementFlag({
  className,
  flagUrl,
}: Pick<WavingFlagProps, "className" | "flagUrl">) {
  const { failed, texture } = useRasterizedFlagTexture(flagUrl);
  const [contextLost, setContextLost] = useState(false);
  const useStaticFallback = !texture || failed || contextLost;

  if (!flagUrl) {
    return <div className={`${className ?? ""} ${styles.staticFlag}`} aria-hidden="true" />;
  }

  return (
    <div
      className={`${className ?? ""} ${useStaticFallback ? styles.staticFlag : ""}`}
      aria-hidden="true"
      data-learning-flag="animated"
      data-flag-renderer={useStaticFallback ? "static-fallback" : "webgl-displacement"}
    >
      {texture && !contextLost ? (
        <div className={styles.canvasWrap}>
          <Canvas
            camera={{ position: [0, 0, 5.2], fov: 30, near: 0.1, far: 20 }}
            dpr={[1, 2]}
            frameloop="always"
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => {
                  event.preventDefault();
                  setContextLost(true);
                },
                { once: true },
              );
            }}
            style={{ background: "transparent", pointerEvents: "none" }}
          >
            <DisplacementFlagScene texture={texture} />
          </Canvas>
        </div>
      ) : null}
    </div>
  );
}

function WavingFlagComponent({
  accentColor,
  animationRenderer = "three",
  className,
  flagUrl,
}: WavingFlagProps) {
  if (animationRenderer === "svg-filter" && flagUrl) {
    return <SvgFilterFlag className={className} flagUrl={flagUrl} />;
  }

  if (animationRenderer === "webgl-displacement" && flagUrl) {
    return <WebglDisplacementFlag className={className} flagUrl={flagUrl} />;
  }

  return <ThreeWavingFlag accentColor={accentColor} className={className} flagUrl={flagUrl} />;
}

export const WavingFlag = memo(WavingFlagComponent);
