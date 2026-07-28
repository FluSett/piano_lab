import { appConfig } from '@/config/appConfig';

export interface KeyColumnBounds {
  pitch: number;
  x: number;
  width: number;
  isBlack: boolean;
  whiteIndex?: number;
}

export interface PianoLayoutResult {
  layout: Map<number, KeyColumnBounds>;
  keyList: KeyColumnBounds[];
  whiteKeyCount: number;
  whiteKeyWidth: number;
  blackKeyWidth: number;
}

export function computePianoKeyLayout(
  totalWidth: number,
  lowestPitch = appConfig.pianoLowestPitch,
  totalKeys = appConfig.pianoTotalKeys
): PianoLayoutResult {
  let whiteKeyCount = 0;
  for (let p = lowestPitch; p < lowestPitch + totalKeys; p++) {
    const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
    if (!isBlack) whiteKeyCount++;
  }

  const whiteKeyWidth = totalWidth / Math.max(whiteKeyCount, 1);
  const blackKeyWidth = whiteKeyWidth * 0.6;

  const layout = new Map<number, KeyColumnBounds>();
  const keyList: KeyColumnBounds[] = [];

  let currentWhiteIndex = 0;

  for (let p = lowestPitch; p < lowestPitch + totalKeys; p++) {
    const isBlack = [1, 3, 6, 8, 10].includes(p % 12);
    if (isBlack) {
      const boundaryX = currentWhiteIndex * whiteKeyWidth;
      const x = boundaryX - blackKeyWidth / 2;
      const bounds: KeyColumnBounds = { pitch: p, x, width: blackKeyWidth, isBlack: true };
      layout.set(p, bounds);
      keyList.push(bounds);
    } else {
      const x = currentWhiteIndex * whiteKeyWidth;
      const bounds: KeyColumnBounds = {
        pitch: p,
        x,
        width: whiteKeyWidth,
        isBlack: false,
        whiteIndex: currentWhiteIndex,
      };
      layout.set(p, bounds);
      keyList.push(bounds);
      currentWhiteIndex++;
    }
  }

  return { layout, keyList, whiteKeyCount, whiteKeyWidth, blackKeyWidth };
}
