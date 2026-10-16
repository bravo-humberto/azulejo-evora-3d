import * as THREE from 'three';
import { TileColor, TILE_METADATA } from '../../types/game';

export type TextureKey =
  | TileColor
  | 'first-player'
  | 'factory-coaster'
  | 'courtyard-limestone';

const TEXTURE_URLS: Record<TextureKey, string> = {
  blue: TILE_METADATA.blue.textureUrl,
  yellow: TILE_METADATA.yellow.textureUrl,
  red: TILE_METADATA.red.textureUrl,
  black: TILE_METADATA.black.textureUrl,
  teal: TILE_METADATA.teal.textureUrl,
  'first-player': 'textures/tile_first_player.png',
  'factory-coaster': 'textures/factory_coaster.png',
  'courtyard-limestone': 'textures/courtyard_limestone.png',
};

const textureMap = new Map<TextureKey, THREE.Texture>();
let loaderInstance: THREE.TextureLoader | null = null;

function getLoader(): THREE.TextureLoader {
  if (!loaderInstance) {
    loaderInstance = new THREE.TextureLoader();
  }
  return loaderInstance;
}

/**
 * Generates an immediate high-resolution procedural canvas fallback texture so the 3D scene
 * never flashes blank or black while PNG textures stream in. Once the PNG finishes loading,
 * its image replaces the canvas and `needsUpdate = true` triggers a seamless upgrade.
 */
function createProceduralFallbackCanvas(key: TextureKey): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;

  if (key === 'courtyard-limestone') {
    ctx.fillStyle = '#F5EFE6';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#E2D7C5';
    ctx.lineWidth = 3;
    ctx.strokeRect(4, 4, w - 8, h - 8);
    ctx.strokeRect(0, cy, w, 1);
    ctx.strokeRect(cx, 0, 1, h);
    return canvas;
  }

  if (key === 'factory-coaster') {
    const grad = ctx.createRadialGradient(cx, cy, 16, cx, cy, 124);
    grad.addColorStop(0, '#FDF8F0');
    grad.addColorStop(0.72, '#EFE3D0');
    grad.addColorStop(0.88, '#1565C0');
    grad.addColorStop(1, '#C86D44');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#D99B26';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, 102, 0, Math.PI * 2);
    ctx.stroke();
    return canvas;
  }

  if (key === 'first-player') {
    ctx.fillStyle = '#FAF5E8';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#1565C0';
    ctx.lineWidth = 12;
    ctx.strokeRect(14, 14, w - 28, h - 28);

    ctx.strokeStyle = '#D99B26';
    ctx.lineWidth = 5;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    ctx.fillStyle = '#1565C0';
    ctx.font = 'bold 124px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', cx, cy + 6);
    return canvas;
  }

  const meta = TILE_METADATA[key];
  ctx.fillStyle = meta.primaryHex;
  ctx.fillRect(0, 0, w, h);

  // Ornate border
  ctx.strokeStyle = meta.accentHex;
  ctx.lineWidth = 10;
  ctx.strokeRect(14, 14, w - 28, h - 28);

  // Geometric Moorish star motif
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = meta.accentHex;
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-36, -36, 72, 72);
  }
  ctx.fillStyle = meta.primaryHex;
  ctx.beginPath();
  ctx.arc(0, 0, 28, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(0, 0, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  return canvas;
}

export function getCachedTexture(key: TextureKey): THREE.Texture {
  const existing = textureMap.get(key);
  if (existing) {
    return existing;
  }

  const fallbackCanvas = createProceduralFallbackCanvas(key);
  const texture = new THREE.CanvasTexture(fallbackCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;

  if (key === 'courtyard-limestone') {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(6, 6);
  } else {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
  }

  textureMap.set(key, texture);

  // Asynchronously load the high-res PNG artwork into the same texture instance
  const url = TEXTURE_URLS[key];
  try {
    getLoader().load(
      url,
      (loadedTex) => {
        if (loadedTex.image) {
          texture.image = loadedTex.image;
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = 8;
          if (key === 'courtyard-limestone') {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(6, 6);
          }
          texture.needsUpdate = true;
        }
      },
      undefined,
      () => {
        // Keep procedural fallback if image fails to load in headless/offline mode
      }
    );
  } catch {
    // Fallback canvas remains active
  }

  return texture;
}

export function preloadAllAzulejoTextures(): void {
  const keys: TextureKey[] = [
    'blue',
    'yellow',
    'red',
    'black',
    'teal',
    'first-player',
    'factory-coaster',
    'courtyard-limestone',
  ];
  for (const key of keys) {
    getCachedTexture(key);
  }
}
