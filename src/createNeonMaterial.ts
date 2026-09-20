import * as THREE from "three";
import { sideColorHexByName, type SideColorName } from "./sideColors";

/** Face UVs describe the four real cube edges, never the triangulation diagonal. */
export function createNeonMaterial(colorName: SideColorName, brightness = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      neonColor: { value: new THREE.Color(sideColorHexByName[colorName]) },
      brightness: { value: brightness },
    },
    vertexShader: /* glsl */ `
      varying vec2 faceUv;
      varying vec3 worldPosition;
      varying vec3 faceNormal;
      void main() {
        faceUv = uv;
        vec4 localPosition = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          localPosition = instanceMatrix * localPosition;
        #endif
        worldPosition = (modelMatrix * localPosition).xyz;
        faceNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 neonColor;
      uniform float brightness;
      varying vec2 faceUv;
      varying vec3 worldPosition;
      varying vec3 faceNormal;
      void main() {
        vec2 edgeDistance = min(faceUv, 1.0 - faceUv);
        vec2 pixelWidth = max(fwidth(faceUv), vec2(0.0001));
        vec2 edgePixels = edgeDistance / pixelWidth;
        float edge = 1.0 - smoothstep(0.2, 0.8, min(edgePixels.x, edgePixels.y));
        float halo = exp(-min(edgeDistance.x, edgeDistance.y) * 48.0) * 0.025;
        float grain = fract(sin(dot(floor(worldPosition * 28.0), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float faceLight = 0.002 + max(0.0, dot(faceNormal, normalize(vec3(-0.4, 1.0, 0.3)))) * 0.006;
        float variation = 0.72 + 0.28 * sin(dot(floor(worldPosition + 0.01), vec3(7.1, 9.2, 4.8)));
        vec3 color = neonColor * (faceLight * (0.7 + grain * 0.3) + halo + edge * variation * brightness);
        float distanceMeters = length(cameraPosition - worldPosition);
        color *= exp(-distanceMeters * 0.012);
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
}
