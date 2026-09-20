import * as THREE from "three";
import { sideColorHexByName, type SideColorName } from "./sideColors";

/** Small local halos stay stereo-correct without fullscreen bloom passes. */
export function createPlatformGlow(color: SideColorName, x: number, y: number, z: number, width: number, depth: number): THREE.Mesh {
  const material = new THREE.ShaderMaterial({
    uniforms: {
      neonColor: { value: new THREE.Color(sideColorHexByName[color]) },
      frameSize: { value: new THREE.Vector2(width, depth) },
    },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec2 faceUv;
      void main() {
        faceUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 neonColor;
      uniform vec2 frameSize;
      varying vec2 faceUv;
      void main() {
        vec2 point = abs((faceUv - 0.5) * (frameSize + 1.2)) - frameSize * 0.5;
        float distanceToFrame = abs(length(max(point, 0.0)) + min(max(point.x, point.y), 0.0));
        float halo = exp(-distanceToFrame * 13.0) * 0.38;
        gl_FragColor = vec4(neonColor, halo);
        #include <colorspace_fragment>
      }
    `,
  });
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(width + 1.2, depth + 1.2), material);
  glow.rotation.x = -Math.PI / 2;
  glow.position.set(x, y + 0.012, z);
  glow.name = `${color}PlatformGlow`;
  return glow;
}
