import * as React from "react"
import { Mesh, Program, Renderer, Triangle } from "ogl"

import "./grainient.css"

/**
 * Ported from React Bits (https://reactbits.dev/) — TypeScript, with the
 * animation frozen after one frame under `prefers-reduced-motion` (the
 * original kept the shader looping regardless).
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)

  if (!result) {
    return [1, 1, 1]
  }

  return [
    parseInt(result[1], 16) / 255,
    parseInt(result[2], 16) / 255,
    parseInt(result[3], 16) / 255,
  ]
}

const vertex = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`

const fragment = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void mainImage(out vec4 o, vec2 C){
  float t=iTime*uTimeSpeed;
  vec2 uv=C/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);

  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;

  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);

  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));

  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;

  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);

  o=vec4(col,1.0);
}
void main(){
  vec4 o=vec4(0.0);
  mainImage(o,gl_FragCoord.xy);
  fragColor=o;
}
`

export type GrainientProps = {
  /** Multiplier on the shader clock — 0 freezes the gradient. */
  timeSpeed?: number
  /** Shifts where the three colours meet along the blend axis. */
  colorBalance?: number
  /** Divides the warp amplitude; higher values bend the field harder. */
  warpStrength?: number
  /** Number of sine ripples across the field. */
  warpFrequency?: number
  /** Multiplier on the warp clock. */
  warpSpeed?: number
  /** Base warp amplitude, before `warpStrength` divides it. */
  warpAmplitude?: number
  /** Rotation, in degrees, of the axis the colours blend along. */
  blendAngle?: number
  /** Widens the smoothstep between colour bands. */
  blendSoftness?: number
  /** Degrees of noise-driven rotation applied to the whole field. */
  rotationAmount?: number
  /** Scale of the noise that drives the rotation. */
  noiseScale?: number
  /** Strength of the film grain overlay. */
  grainAmount?: number
  /** Scale of the grain pattern. */
  grainScale?: number
  /** Whether the grain drifts over time. */
  grainAnimated?: boolean
  /** Post-processing contrast. */
  contrast?: number
  /** Post-processing gamma. */
  gamma?: number
  /** Post-processing saturation — 0 is greyscale. */
  saturation?: number
  /** Horizontal offset of the field centre, in UV units. */
  centerX?: number
  /** Vertical offset of the field centre, in UV units. */
  centerY?: number
  /** Zoom on the field — below 1 pulls the colours further apart. */
  zoom?: number
  /** First gradient colour, as a `#rrggbb` hex string. */
  color1?: string
  /** Second gradient colour, as a `#rrggbb` hex string. */
  color2?: string
  /** Third gradient colour, as a `#rrggbb` hex string. */
  color3?: string
  /** CSS class name for the container element. */
  className?: string
}

export function Grainient({
  timeSpeed = 0.25,
  colorBalance = 0,
  warpStrength = 1,
  warpFrequency = 5,
  warpSpeed = 2,
  warpAmplitude = 50,
  blendAngle = 0,
  blendSoftness = 0.05,
  rotationAmount = 500,
  noiseScale = 2,
  grainAmount = 0.1,
  grainScale = 2,
  grainAnimated = false,
  contrast = 1.5,
  gamma = 1,
  saturation = 1,
  centerX = 0,
  centerY = 0,
  zoom = 0.9,
  color1 = "#FF9FFC",
  color2 = "#5227FF",
  color3 = "#B497CF",
  className = "",
}: GrainientProps) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const programRef = React.useRef<Program | null>(null)
  const renderRef = React.useRef<(() => void) | null>(null)

  // Build the WebGL context once, then pause it whenever the canvas scrolls
  // out of view or the tab goes to the background.
  React.useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    const renderer = new Renderer({
      webgl: 2,
      alpha: true,
      antialias: false,
      dpr: Math.min(window.devicePixelRatio || 1, 2),
    })

    const gl = renderer.gl
    const canvas = gl.canvas as HTMLCanvasElement
    canvas.style.width = "100%"
    canvas.style.height = "100%"
    canvas.style.display = "block"
    container.appendChild(canvas)

    const geometry = new Triangle(gl)
    const program = new Program(gl, {
      vertex,
      fragment,
      uniforms: {
        iTime: { value: 0 },
        iResolution: { value: new Float32Array([1, 1]) },
        uTimeSpeed: { value: 0.25 },
        uColorBalance: { value: 0 },
        uWarpStrength: { value: 1 },
        uWarpFrequency: { value: 5 },
        uWarpSpeed: { value: 2 },
        uWarpAmplitude: { value: 50 },
        uBlendAngle: { value: 0 },
        uBlendSoftness: { value: 0.05 },
        uRotationAmount: { value: 500 },
        uNoiseScale: { value: 2 },
        uGrainAmount: { value: 0.1 },
        uGrainScale: { value: 2 },
        uGrainAnimated: { value: 0 },
        uContrast: { value: 1.5 },
        uGamma: { value: 1 },
        uSaturation: { value: 1 },
        uCenterOffset: { value: new Float32Array([0, 0]) },
        uZoom: { value: 0.9 },
        uColor1: { value: new Float32Array([1, 1, 1]) },
        uColor2: { value: new Float32Array([1, 1, 1]) },
        uColor3: { value: new Float32Array([1, 1, 1]) },
      },
    })

    const mesh = new Mesh(gl, { geometry, program })
    programRef.current = program

    const draw = () => renderer.render({ scene: mesh })
    renderRef.current = draw

    const setSize = () => {
      const rect = container.getBoundingClientRect()
      renderer.setSize(
        Math.max(1, Math.floor(rect.width)),
        Math.max(1, Math.floor(rect.height))
      )
      const resolution = program.uniforms.iResolution.value as Float32Array
      resolution[0] = gl.drawingBufferWidth
      resolution[1] = gl.drawingBufferHeight
      draw()
    }

    const resizeObserver = new ResizeObserver(setSize)
    resizeObserver.observe(container)
    setSize()

    const motionQuery = window.matchMedia(REDUCED_MOTION_QUERY)

    let frame = 0
    let isOnScreen = true
    let isPageVisible = !document.hidden
    const start = performance.now()

    const loop = (now: number) => {
      program.uniforms.iTime.value = (now - start) * 0.001
      draw()
      frame = requestAnimationFrame(loop)
    }

    const pause = () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame)
        frame = 0
      }
    }

    const resume = () => {
      if (isOnScreen && isPageVisible && !motionQuery.matches && frame === 0) {
        frame = requestAnimationFrame(loop)
      }
    }

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isOnScreen = entry.isIntersecting
        if (isOnScreen) resume()
        else pause()
      },
      { threshold: 0 }
    )
    intersectionObserver.observe(container)

    const handleVisibility = () => {
      isPageVisible = !document.hidden
      if (isPageVisible) resume()
      else pause()
    }

    const handleMotionChange = () => {
      if (motionQuery.matches) pause()
      else resume()
    }

    document.addEventListener("visibilitychange", handleVisibility)
    motionQuery.addEventListener("change", handleMotionChange)

    resume()

    return () => {
      pause()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", handleVisibility)
      motionQuery.removeEventListener("change", handleMotionChange)
      programRef.current = null
      renderRef.current = null
      canvas.remove()
    }
  }, [])

  // Props map straight onto uniforms, so a colour or speed change never has to
  // tear the WebGL context down and rebuild it.
  React.useEffect(() => {
    const program = programRef.current

    if (!program) {
      return
    }

    const uniforms = program.uniforms
    uniforms.uTimeSpeed.value = timeSpeed
    uniforms.uColorBalance.value = colorBalance
    uniforms.uWarpStrength.value = warpStrength
    uniforms.uWarpFrequency.value = warpFrequency
    uniforms.uWarpSpeed.value = warpSpeed
    uniforms.uWarpAmplitude.value = warpAmplitude
    uniforms.uBlendAngle.value = blendAngle
    uniforms.uBlendSoftness.value = blendSoftness
    uniforms.uRotationAmount.value = rotationAmount
    uniforms.uNoiseScale.value = noiseScale
    uniforms.uGrainAmount.value = grainAmount
    uniforms.uGrainScale.value = grainScale
    uniforms.uGrainAnimated.value = grainAnimated ? 1 : 0
    uniforms.uContrast.value = contrast
    uniforms.uGamma.value = gamma
    uniforms.uSaturation.value = saturation
    uniforms.uCenterOffset.value = new Float32Array([centerX, centerY])
    uniforms.uZoom.value = zoom
    uniforms.uColor1.value = new Float32Array(hexToRgb(color1))
    uniforms.uColor2.value = new Float32Array(hexToRgb(color2))
    uniforms.uColor3.value = new Float32Array(hexToRgb(color3))

    // Repaint so the new values land even while the loop is paused (offscreen,
    // hidden tab, or reduced motion).
    renderRef.current?.()
  }, [
    timeSpeed,
    colorBalance,
    warpStrength,
    warpFrequency,
    warpSpeed,
    warpAmplitude,
    blendAngle,
    blendSoftness,
    rotationAmount,
    noiseScale,
    grainAmount,
    grainScale,
    grainAnimated,
    contrast,
    gamma,
    saturation,
    centerX,
    centerY,
    zoom,
    color1,
    color2,
    color3,
  ])

  return (
    <div ref={containerRef} className={`grainient-container ${className}`.trim()} />
  )
}
