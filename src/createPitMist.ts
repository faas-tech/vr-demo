import * as THREE from "three";

/** World-space cloud layers retain terrain depth testing and stereo parallax in one draw. */
export function createPitMist(): THREE.InstancedMesh {
  const material = new THREE.ShaderMaterial({
    uniforms: { timeSeconds: { value: 0 }, islandHalfSize: { value: new THREE.Vector2(4.15, 2.65) } },
    transparent: true, depthWrite: false, side: THREE.DoubleSide, forceSinglePass: true,
    vertexShader: /* glsl */ `
      uniform float timeSeconds;
      uniform vec2 islandHalfSize;
      varying vec3 worldPosition;
      varying float layerHeight;
      void main() {
        vec4 p = instanceMatrix * vec4(position, 1.0);
        layerHeight = p.y;
        p.y += sin(p.x * 0.65 + p.z * 0.3 + layerHeight * 4.0 + timeSeconds * 0.035) * 0.22;
        p.y += cos(p.z * 0.7 - p.x * 0.25 + layerHeight * 3.0) * 0.18;
        worldPosition = (modelMatrix * p).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float timeSeconds;
      uniform vec2 islandHalfSize;
      varying vec3 worldPosition;
      varying float layerHeight;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(cell), hash(cell + vec2(1,0)), f.x), mix(hash(cell + vec2(0,1)), hash(cell + vec2(1,1)), f.x), f.y);
      }
      void main() {
        vec2 p = worldPosition.xz;
        float outerFade = 1.0 - smoothstep(10.5, 14.0, length(p));
        vec2 courtDistance = abs(p) - islandHalfSize;
        float islandFade = smoothstep(0.0, 1.5, max(courtDistance.x, courtDistance.y));
        vec2 drift = vec2(timeSeconds * 0.027, timeSeconds * -0.018);
        vec2 q = p * 0.48 + drift + layerHeight * 1.7;
        float cloud = noise(q);
        float detail = noise(q * 2.1 + cloud * 2.0);
        float wisps = noise(q * 5.2 + detail * 2.5);
        float density = smoothstep(0.24, 0.78, cloud * 0.5 + detail * 0.3 + wisps * 0.2);
        float heightFade = 1.0 - smoothstep(1.8, 4.0, layerHeight);
        float viewFade = smoothstep(0.06, 0.32, abs(normalize(cameraPosition - worldPosition).y));
        float opacity = density * outerFade * islandFade * heightFade * viewFade * 0.4;
        if (opacity < 0.004) discard;
        gl_FragColor = vec4(vec3(0.10 + wisps * 0.07), opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const geometry = new THREE.PlaneGeometry(28, 28, 32, 32);
  geometry.rotateX(-Math.PI / 2);
  const mist = new THREE.InstancedMesh(geometry, material, 4);
  for (let layer = 0; layer < 4; layer++) mist.setMatrixAt(layer, new THREE.Matrix4().makeTranslation(0, 0.25 + layer * 0.62, 0));
  mist.computeBoundingSphere();
  mist.boundingSphere!.radius += 0.5;
  mist.name = "pitMist";
  mist.renderOrder = 2;
  return mist;
}

/** Soft cloud wisps break up the horizontal layers when viewed at court height. */
export function createMistClouds(): THREE.InstancedMesh {
  const material = new THREE.ShaderMaterial({
    uniforms: { timeSeconds: { value: 0 }, islandHalfSize: { value: new THREE.Vector2(4.15, 2.65) } },
    transparent: true, depthWrite: false,
    vertexShader: /* glsl */ `
      uniform float timeSeconds;
      uniform vec2 islandHalfSize;
      varying vec2 cloudUv;
      varying float cloudPhase;
      varying vec3 cloudWorldPosition;
      void main() {
        cloudUv = uv;
        vec4 center = modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
        cloudPhase = center.x * 2.0 + center.z;
        center.y += sin(timeSeconds * 0.04 + cloudPhase) * 0.12;
        vec4 viewCenter = viewMatrix * center;
        vec2 offset = position.xy * vec2(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz));
        viewCenter.xy += offset;
        vec3 cameraRight = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
        vec3 cameraUp = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
        cloudWorldPosition = center.xyz + cameraRight * offset.x + cameraUp * offset.y;
        gl_Position = projectionMatrix * viewCenter;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float timeSeconds;
      uniform vec2 islandHalfSize;
      varying vec2 cloudUv;
      varying float cloudPhase;
      varying vec3 cloudWorldPosition;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 cell = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(cell), hash(cell + vec2(1,0)), f.x), mix(hash(cell + vec2(0,1)), hash(cell + vec2(1,1)), f.x), f.y);
      }
      void main() {
        vec2 p = (cloudUv - 0.5) * 2.0;
        float radialFade = max(0.0, 1.0 - dot(p, p));
        vec2 flow = cloudUv * 4.0 + cloudPhase + vec2(timeSeconds * 0.018, 0.0);
        float cloud = noise(flow) * 0.6 + noise(flow * 2.7) * 0.4;
        vec2 courtDistance = abs(cloudWorldPosition.xz) - islandHalfSize;
        float islandFade = smoothstep(0.0, 1.5, max(courtDistance.x, courtDistance.y));
        float opacity = radialFade * radialFade * smoothstep(0.2, 0.8, cloud) * 0.42 * islandFade;
        if (opacity < 0.003) discard;
        gl_FragColor = vec4(vec3(0.16), opacity);
        #include <colorspace_fragment>
      }
    `,
  });
  const cloudCount = 40;
  const clouds = new THREE.InstancedMesh(new THREE.PlaneGeometry(4.5, 3.4), material, cloudCount);
  const transform = new THREE.Object3D();
  for (let index = 0; index < cloudCount; index++) {
    const angle = index * 2.3999632297;
    const radius = 6.7 + (index % 7) * 0.72;
    transform.position.set(Math.cos(angle) * radius, 1.1 + (index % 4) * 0.45, Math.sin(angle) * radius);
    transform.scale.setScalar(0.8 + (index % 5) * 0.12);
    transform.updateMatrix();
    clouds.setMatrixAt(index, transform.matrix);
  }
  clouds.computeBoundingSphere();
  clouds.boundingSphere!.radius += 3;
  clouds.name = "mistClouds";
  clouds.renderOrder = 3;
  return clouds;
}
