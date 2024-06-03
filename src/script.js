import GUI from "lil-gui";
import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const audio = new Audio();
audio.src = "./ambient_music.mp3";
audio.loop = true;
audio.volume = 0.2;
let interacted = false;

function firstClickHandler() {
  if (!interacted) {
    interacted = true;
    audio.play();
    window.removeEventListener("mousedown", firstClickHandler);
  }
}

window.addEventListener("mousedown", firstClickHandler);

/**
 * Base
 */
// Debug
const gui = new GUI({
  width: 400,
});

gui.close();
gui.hide();

if ((window, location.hash === "#debug")) {
  gui.show();
}

const cameraTweaks = gui.addFolder("Camera");
cameraTweaks.close();

const debugObject = {};

const loadingBarBackground = document.querySelector(".loading-background");
const loadingBarElement = document.querySelector(".loading-bar");
const percentage = document.querySelector(".percentage");

let sceneReady = false;
const loadingManager = new THREE.LoadingManager(
  // Loaded
  () => {
    // ...
    window.setTimeout(() => {
      loadingBarBackground.classList.add("ended");
      loadingBarBackground.style.transform = "";
      loadingBarElement.classList.add("ended");
      percentage.classList.add("ended");
      loadingBarElement.style.transform = "";
      percentage.style.transform = "";
      window.setTimeout(() => {
        loadingBarBackground.remove();
        loadingBarElement.remove();
        percentage.remove();
      }, 5000);
    }, 500);
    window.setTimeout(() => {
      sceneReady = true;
    }, 3500);
  },
  (itemUrl, itemsLoaded, itemsTotal) => {
    const progressRatio = itemsLoaded / itemsTotal;
    loadingBarElement.style.transform = `scaleX(${progressRatio})`;
    percentage.innerText = (progressRatio * 100).toFixed(0) + " %";
  }

  // ...
);

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader(loadingManager);

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("draco/");

// GLTF loader
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Textures
 */
const bakedTexture1 = textureLoader.load("/textures/Baked.jpg");
bakedTexture1.flipY = false;
bakedTexture1.colorSpace = THREE.SRGBColorSpace;

/**
 * Materials
 */

//Baked Material

const material1 = new THREE.MeshBasicMaterial({
  map: bakedTexture1,
});

gltfLoader.load("/models/room.glb", (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.material = material1;
    }
  });

  scene.add(gltf.scene);
});

/**
 * POI
 */

const points = [
  {
    position: new THREE.Vector3(0, 2, 0),
    element: document.querySelector(".point-0"),
  },
  {
    position: new THREE.Vector3(4, 1, -4.5),
    element: document.querySelector(".point-1"),
  },
  {
    position: new THREE.Vector3(4, 2, 4),
    element: document.querySelector(".point-2"),
  },
];

debugObject.poi = true;
gui
  .add(debugObject, "poi")
  .onChange((val) => {
    for (const point of points) {
      if (!val) {
        point.element.classList.remove("visible");
      } else {
        point.element.classList.add("visible");
      }
    }
  })
  .name("Points of Interest");

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  // Update sizes
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  // Update camera
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  // Update renderer
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 4;
camera.position.y = 17;
camera.position.z = 4;
camera.lookAt(new THREE.Vector3(0, 1, 0));
scene.add(camera);
//restrict camera from going below y  = 0

cameraTweaks
  .add(camera.position, "y")
  .min(0)
  .max(20)
  .step(1)
  .name("Camera Height");
cameraTweaks
  .add(camera.position, "x")
  .min(-10)
  .max(10)
  .step(1)
  .name("Camera Width");
cameraTweaks
  .add(camera.position, "z")
  .min(-10)
  .max(10)
  .step(1)
  .name("Camera Depth");

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.minDistance = 16;
//set zoom to 15
controls.maxDistance = 25;

controls.minPolarAngle = Math.PI / 2.7;
controls.maxPolarAngle = Math.PI / 2.7;

cameraTweaks
  .add(controls, "minPolarAngle")
  .min(0)
  .max(1.6)
  .step(0.01)
  .name("Min Polar Angle");
cameraTweaks
  .add(controls, "maxPolarAngle")
  .min(0)
  .max(1.6)
  .step(0.01)
  .name("Max Polar Angle");
cameraTweaks
  .add(controls, "minDistance")
  .min(0)
  .max(20)
  .step(1)
  .name("Min Distance");
cameraTweaks
  .add(controls, "maxDistance")
  .min(10)
  .max(40)
  .step(1)
  .name("Max Distance");

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const raycaster = new THREE.Raycaster();

const clock = new THREE.Clock();
const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  if (sceneReady) {
    for (const point of points) {
      const screenPosition = point.position.clone();
      screenPosition.project(camera);

      raycaster.setFromCamera(screenPosition, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length === 0 && debugObject.poi) {
        point.element.classList.add("visible");
      } else {
        const intersectionDistance = intersects[0].distance;
        const pointDistance = point.position.distanceTo(camera.position);

        if (intersectionDistance < pointDistance) {
          point.element.classList.remove("visible");
        } else if (intersectionDistance > pointDistance && debugObject.poi) {
          point.element.classList.add("visible");
        }
      }

      const translateX = screenPosition.x * sizes.width * 0.5;
      const translateY = -screenPosition.y * sizes.height * 0.5;
      point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`;
    }
  }

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

tick();
