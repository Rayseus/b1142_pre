import { generateName } from './NameGenerator';
import { Noise } from 'noisejs'; // ✅ import from noisejs

const COAST_BAND_RATIO = 0.25;

export const pickCoastConfig = () => {
  const roll = Math.random();
  if (roll < 0.34) return { type: 'bottom' };
  if (roll < 0.68) return { type: 'top' };
  const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
  return { type: 'corner', corner: corners[Math.floor(Math.random() * corners.length)] };
};

const getCoastBandSizes = (width, height) => ({
  bandWidth: Math.max(Math.floor(width * COAST_BAND_RATIO), 1),
  bandHeight: Math.max(Math.floor(height * COAST_BAND_RATIO), 1),
});

const getSeaBounds = (width, height, coastConfig) => {
  const { bandWidth, bandHeight } = getCoastBandSizes(width, height);

  if (coastConfig.type === 'top') {
    return { xStart: 0, xEnd: width - 1, yStart: 0, yEnd: bandHeight - 1 };
  }
  if (coastConfig.type === 'bottom') {
    return { xStart: 0, xEnd: width - 1, yStart: height - bandHeight, yEnd: height - 1 };
  }

  const corners = {
    'top-left': { xStart: 0, xEnd: bandWidth - 1, yStart: 0, yEnd: bandHeight - 1 },
    'top-right': { xStart: width - bandWidth, xEnd: width - 1, yStart: 0, yEnd: bandHeight - 1 },
    'bottom-left': { xStart: 0, xEnd: bandWidth - 1, yStart: height - bandHeight, yEnd: height - 1 },
    'bottom-right': { xStart: width - bandWidth, xEnd: width - 1, yStart: height - bandHeight, yEnd: height - 1 },
  };

  return corners[coastConfig.corner];
};

const isInCoastBand = (x, y, width, height, coastConfig) => {
  const { bandWidth, bandHeight } = getCoastBandSizes(width, height);

  if (coastConfig.type === 'top') return y < bandHeight;
  if (coastConfig.type === 'bottom') return y >= height - bandHeight;

  if (coastConfig.corner === 'top-left') return x < bandWidth && y < bandHeight;
  if (coastConfig.corner === 'top-right') return x >= width - bandWidth && y < bandHeight;
  if (coastConfig.corner === 'bottom-left') return x < bandWidth && y >= height - bandHeight;
  return x >= width - bandWidth && y >= height - bandHeight;
};

const getCoastFactor = (x, y, width, height, coastConfig) => {
  const { bandWidth, bandHeight } = getCoastBandSizes(width, height);

  if (coastConfig.type === 'bottom') {
    return (y - (height - bandHeight)) / bandHeight;
  }
  if (coastConfig.type === 'top') {
    return (bandHeight - y) / bandHeight;
  }

  let xFactor = 0;
  let yFactor = 0;
  if (coastConfig.corner === 'top-left') {
    xFactor = (bandWidth - x) / bandWidth;
    yFactor = (bandHeight - y) / bandHeight;
  } else if (coastConfig.corner === 'top-right') {
    xFactor = (x - (width - bandWidth)) / bandWidth;
    yFactor = (bandHeight - y) / bandHeight;
  } else if (coastConfig.corner === 'bottom-left') {
    xFactor = (bandWidth - x) / bandWidth;
    yFactor = (y - (height - bandHeight)) / bandHeight;
  } else {
    xFactor = (x - (width - bandWidth)) / bandWidth;
    yFactor = (y - (height - bandHeight)) / bandHeight;
  }

  return Math.max(xFactor, yFactor);
};

// Elevation noise with gradient and octave-based variation
// Create Perlin noise map with octaves and gradient
export const createNoise = (width, height, octaves = 4, coastConfig = pickCoastConfig()) => {
  const map = [];
  const noise = new Noise(Math.random()); // ✅ Create new noise instance with random seed
  const seaNoise = new Noise(Math.random()); // ✅ Create new seaNoise instance with random seed

  for (let y = 0; y < height; y++) {
    map[y] = [];

    for (let x = 0; x < width; x++) {
      let value = 0;
      let amplitude = 1;
      let frequency = 0.005;

      for (let o = 0; o < octaves; o++) {
        value += noise.perlin2(x * frequency, y * frequency) * amplitude;
        amplitude *= 0.5;
        frequency *= 2;
      }

      value = (value + 1) / 2;

      if (isInCoastBand(x, y, width, height, coastConfig)) {
        const coastFactor = getCoastFactor(x, y, width, height, coastConfig); // 0 to 1
        const distortion = seaNoise.perlin2(x * 0.05, 0) * 0.5 + 0.5; // 0–1
        const cutoff = 0.15 + distortion * 0.15; // 0.15–0.3

        if (coastFactor > cutoff) {
          value *= (1 - coastFactor); // taper down
        }
      }

      map[y][x] = value;
    }
  }

  return map;
};

export const generateTerrain = (ctx, width, height, noise) => {
  const terrain = [];
  const imageData = ctx.createImageData(width, height);
  const data = imageData.data;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const value = noise[y][x];
      let type, color;

      // Force terrain only
      if (value < 0.3) {
        type = 'plains';
        color = [200, 230, 160];
      } else if (value < 0.5) {
        type = 'forest';
        color = [34, 139, 34];
      } else if (value < 0.7) {
        type = 'hills';
        color = [139, 115, 85];
      } else {
        type = 'mountains';
        color = [105, 105, 105];
      }

      if (x % 10 === 0 && y % 10 === 0) {
        terrain.push({ x, y, type, elevation: value });
      }

      const i = (y * width + x) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
      data[i + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return terrain;
};

const traceRiver = (ctx, noise, startX, startY) => {
  const path = [{ x: startX, y: startY }];
  let x = startX;
  let y = startY;

  ctx.strokeStyle = '#4A90E2';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x, y);

  for (let i = 0; i < 100; i++) {
    const neighbors = [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 },
      { x: x - 1, y: y - 1 },
      { x: x + 1, y: y + 1 }
    ].filter(n =>
      n.x >= 0 && n.x < noise[0].length &&
      n.y >= 0 && n.y < noise.length
    );

    let next = { x, y };
    let minVal = noise[y][x];
    for (const n of neighbors) {
      const nVal = noise[n.y][n.x];
      if (nVal < minVal) {
        minVal = nVal;
        next = n;
      }
    }

    if (next.x === x && next.y === y) break;
    ctx.lineTo(next.x, next.y);
    path.push(next);
    x = next.x;
    y = next.y;
  }

  ctx.stroke();

  return {
    type: 'river',
    name: generateName('river'),
    start: { x: startX, y: startY },
    end: { x, y }
  };
};

const generateLake = (ctx, width, height, waterMask) => {
  const noise = new Noise(Math.random()); // ✅ Create new noise instance for each lake
  const cx = Math.floor(Math.random() * width);
  const cy = Math.floor(Math.random() * height);
  const baseRadius = Math.floor(Math.random() * 30 + 20);
  const segments = 100;
  const scale = 0.5;

  // Build the lake path points
  const lakePoints = [];

  ctx.beginPath();

  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * 2 * Math.PI;
    const nx = Math.cos(angle) * scale;
    const ny = Math.sin(angle) * scale;

    const radiusVariation = noise.perlin2(nx + cx * 0.01, ny + cy * 0.01);
    const radius = baseRadius * (0.7 + radiusVariation * 0.5);

    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }

    lakePoints.push({ x, y });
  }

  ctx.closePath();
  ctx.fillStyle = '#4A90E2';
  ctx.fill();

  // Calculate bounding box for lake points
  const minX = Math.max(0, Math.floor(Math.min(...lakePoints.map(p => p.x))));
  const maxX = Math.min(width - 1, Math.ceil(Math.max(...lakePoints.map(p => p.x))));
  const minY = Math.max(0, Math.floor(Math.min(...lakePoints.map(p => p.y))));
  const maxY = Math.min(height - 1, Math.ceil(Math.max(...lakePoints.map(p => p.y))));

  // Mark pixels inside lake polygon on waterMask
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (ctx.isPointInPath(x, y)) {
        if (!waterMask[y]) waterMask[y] = [];
        waterMask[y][x] = true;
      }
    }
  }

  const area = Math.PI * baseRadius * baseRadius; // rough estimate
  const lake = {
    type: 'lake',
    name: generateName('lake'),
    center: { x: cx, y: cy },
    area,
    radius: baseRadius,
  }
  console.log(lake);
  return lake;
};

const generateRiver = (ctx, width, height, noise, waterMask) => {
  const maxAttempts = 50;
  let startX = null, startY = null;

  // Find a valid high elevation starting point
  for (let i = 0; i < maxAttempts; i++) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height * 0.6); // top 60%
    if (noise[y][x] > 0.6) {
      startX = x;
      startY = y;
      break;
    }
  }

  if (startX === null) return null;

  const path = [{ x: startX, y: startY }];
  let currentX = startX;
  let currentY = startY;

  const maxSteps = 500;
  let reachedWater = false;
  let steps = 0;

  while (steps++ < maxSteps && !reachedWater) {
    const currentElevation = noise[currentY][currentX];

    // 8-way neighbors
    const neighbors = [
      { x: currentX - 1, y: currentY - 1 },
      { x: currentX,     y: currentY - 1 },
      { x: currentX + 1, y: currentY - 1 },
      { x: currentX - 1, y: currentY     },
      { x: currentX + 1, y: currentY     },
      { x: currentX - 1, y: currentY + 1 },
      { x: currentX,     y: currentY + 1 },
      { x: currentX + 1, y: currentY + 1 },
    ].filter(p => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height);

    let next = null;
    let steepestDrop = 0;

    for (const n of neighbors) {
      const e = noise[n.y][n.x];
      const drop = currentElevation - e;

      if (drop > steepestDrop) {
        steepestDrop = drop;
        next = n;
      }
    }

    // Add slight randomness for natural meandering
    if (!next || Math.random() < 0.1) {
      const downhillOptions = neighbors.filter(n => noise[n.y][n.x] < currentElevation);
      if (downhillOptions.length > 0) {
        next = downhillOptions[Math.floor(Math.random() * downhillOptions.length)];
      }
    }

    if (!next) break;

    const nextElevation = noise[next.y][next.x];
    if (nextElevation < 0.15 || waterMask[next.y]?.[next.x]) {
      reachedWater = true;
      break;
    }

    path.push(next);
    currentX = next.x;
    currentY = next.y;
  }

  if (path.length < 2) return null;

  // === Draw all at once with Path2D ===
  const riverPath = new Path2D();
  riverPath.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    const midX = (path[i - 1].x + path[i].x) / 2 + (Math.random() - 0.5) * 2;
    const midY = (path[i - 1].y + path[i].y) / 2 + (Math.random() - 0.5) * 2;
    riverPath.quadraticCurveTo(midX, midY, path[i].x, path[i].y);
  }

  ctx.strokeStyle = '#4A90E2';
  ctx.lineWidth = 2 + Math.random() * 2;
  ctx.stroke(riverPath);

  // === Mark waterMask in one pass ===
  path.forEach(({ x, y }) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (!waterMask[ny]) waterMask[ny] = [];
          waterMask[ny][nx] = true;
        }
      }
    }
  });

  return {
    type: 'river',
    name: generateName('river'),
    path,
    length: path.length,
  };
};

const nameMajorFeatures = (terrain, waterBodies) => {
  const namedFeatures = [];

  // Find major mountain ranges (high elevation clusters)
  const mountains = terrain.filter(t => t.type === 'mountains');
  const mountainClusters = [];

  // Group nearby mountains
  mountains.forEach(mountain => {
    let addedToCluster = false;
    for (let cluster of mountainClusters) {
      const avgX = cluster.reduce((sum, m) => sum + m.x, 0) / cluster.length;
      const avgY = cluster.reduce((sum, m) => sum + m.y, 0) / cluster.length;
      const distance = Math.sqrt((mountain.x - avgX) ** 2 + (mountain.y - avgY) ** 2);

      if (distance < 100) { // Within 100 pixels
        cluster.push(mountain);
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      mountainClusters.push([mountain]);
    }
  });

  // Name the largest mountain clusters
  mountainClusters.filter(c => c.length >= 5).slice(0, 3).forEach(cluster => {
    const avgX = cluster.reduce((sum, m) => sum + m.x, 0) / cluster.length;
    const avgY = cluster.reduce((sum, m) => sum + m.y, 0) / cluster.length;
    const highestPeak = cluster.reduce((max, m) => m.elevation > max.elevation ? m : max);
    namedFeatures.push({
      type: 'mountain_range',
      name: generateName('mountain_range'),
      center: { x: Math.round(avgX), y: Math.round(avgY) },
      peakElevation: highestPeak.elevation,
      size: cluster.length
    });
  });

  waterBodies
    .filter(wb => wb.type === 'lake')
    .forEach(wb => {
      const center = wb.center || (wb.path ? wb.path[Math.floor(wb.path.length / 2)] : null);
      if (!center || center.x == null || center.y == null) return;

      namedFeatures.push({
        type: wb.type,
        name: wb.name,
        center,
        area: wb.area
      });
    });

  return namedFeatures;
};

export const drawFeatureNames = (ctx, namedFeatures, width, height) => {
  ctx.save();

  const baseFontScale = Math.min(width, height) / 1000;
  const defaultFontSize = Math.max(16 * baseFontScale, 14);
  const placedLabels = [];

  const sortedFeatures = [...namedFeatures].sort((a, b) => {
    const order = { 'mountain_range': 0, 'lake': 1, 'river': 2, 'sea': 3 };
    return (order[a.type] || 99) - (order[b.type] || 99);
  });

  sortedFeatures.forEach(feature => {
    if (!feature.center || !feature.name) return;

    // === Initial label base position ===
    let x = feature.center.x;
    let y = feature.center.y;

    let fontSize = defaultFontSize;
    let fillColor = '#000000';
    let strokeColor = '#FFFFFF';
    let lineWidth = 3 * baseFontScale;

    if (feature.type === 'mountain_range') {
      fontSize = Math.max(18 * baseFontScale, 16);
      fillColor = '#2F4F4F';
    } else if (feature.type === 'lake' || feature.type === 'sea') {
      fillColor = '#003366';
      strokeColor = '#87CEEB';
      lineWidth = 2 * baseFontScale;
      y += 15 * baseFontScale;
    } else if (feature.type === 'river' && feature.path?.length > 1) {
      fontSize = Math.max(14 * baseFontScale, 12);
      fillColor = '#003366';
      const mid = feature.path[Math.floor(feature.path.length / 2)];
      x = mid.x;
      y = mid.y - 10 * baseFontScale;
    } else {
      x += 10 * baseFontScale;
      y -= 5 * baseFontScale;
    }

    ctx.font = `${fontSize}px Arial`;
    const text = feature.name;
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // === Try multiple candidate positions ===
    const candidates = [
      { dx: 0, dy: 0 },
      { dx: 10, dy: 10 },
      { dx: -10, dy: 10 },
      { dx: 10, dy: -10 },
      { dx: -10, dy: -10 },
      { dx: 20, dy: 0 },
      { dx: -20, dy: 0 },
      { dx: 0, dy: 20 },
      { dx: 0, dy: -20 }
    ];

    let placed = false;
    for (const { dx, dy } of candidates) {
      const labelX = x + dx * baseFontScale;
      const labelY = y + dy * baseFontScale;

      const box = {
        x1: labelX,
        y1: labelY - textHeight,
        x2: labelX + textWidth,
        y2: labelY
      };

      const outOfBounds =
        box.x1 < 0 || box.x2 > width || box.y1 < 0 || box.y2 > height;

      const overlaps = placedLabels.some(p =>
        box.x1 < p.x2 && box.x2 > p.x1 &&
        box.y1 < p.y2 && box.y2 > p.y1
      );

      if (!outOfBounds && !overlaps) {
        // Draw the label
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.strokeText(text, labelX, labelY);
        ctx.fillText(text, labelX, labelY);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        placedLabels.push(box);
        placed = true;
        break;
      }
    }

    if (!placed) {
      // As last resort: clamp to visible canvas edge and draw
      let fallbackX = Math.min(Math.max(x, 10), width - textWidth - 10);
      let fallbackY = Math.min(Math.max(y, textHeight), height - 5);

      const box = {
        x1: fallbackX,
        y1: fallbackY - textHeight,
        x2: fallbackX + textWidth,
        y2: fallbackY
      };

      // Avoid overlap if possible
      const overlaps = placedLabels.some(p =>
        box.x1 < p.x2 && box.x2 > p.x1 &&
        box.y1 < p.y2 && box.y2 > p.y1
      );
      if (!overlaps) {
        ctx.fillStyle = fillColor;
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;

        ctx.strokeText(text, fallbackX, fallbackY);
        ctx.fillText(text, fallbackX, fallbackY);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        placedLabels.push(box);
      }
    }
  });

  ctx.restore();
};

export const createWaterMask = (width, height) => {
  const mask = [];
  for (let y = 0; y < height; y++) {
    mask[y] = new Array(width).fill(false);
  }
  return mask;
};

function lakeOverlapsCoast(lake, waterMask) {
  // Check if any lake pixel is near coast edge in waterMask (e.g. non-water pixels around)
  // Simple version: for each pixel in lake.pixels, check neighbors in waterMask
  for (const p of lake.pixels) {
    const x = p.x;
    const y = p.y;
    // Check neighbors to detect coast proximity
    const neighbors = [
      [x-1, y], [x+1, y], [x, y-1], [x, y+1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < waterMask.width && ny >= 0 && ny < waterMask.height) {
        if (!waterMask.isWater(nx, ny)) {
          return true; // Pixel next to non-water = lake overlaps coast
        }
      }
    }
  }
  return false;
}

export const generateWaterBodies = (ctx, width, height, noise, waterMask, coastConfig = pickCoastConfig()) => {
  const waterBodies = [];

  // === 1. Draw SEA ===
  const seaThreshold = 0.15;
  const seaBounds = getSeaBounds(width, height, coastConfig);

  ctx.fillStyle = '#4A90E2'; // safe color
  for (let y = seaBounds.yStart; y <= seaBounds.yEnd; y++) {
    for (let x = seaBounds.xStart; x <= seaBounds.xEnd; x++) {
      if (noise[y][x] < seaThreshold) {
        ctx.fillRect(x, y, 1, 1);
        waterMask[y][x] = true;
      }
    }
  }

  const namedOcean = {
    type: 'sea',
    name: generateName('sea'),
    center: {
      x: Math.floor((seaBounds.xStart + seaBounds.xEnd) / 2),
      y: Math.floor((seaBounds.yStart + seaBounds.yEnd) / 2)
    },
    area: (seaBounds.xEnd - seaBounds.xStart + 1) * (seaBounds.yEnd - seaBounds.yStart + 1)
  };
  waterBodies.push(namedOcean);

  // === 2. Generate and draw RIVERS ===
  const numRivers = 5;
  for (let i = 0; i < numRivers; i++) {
    const river = generateRiver(ctx, width, height, noise, waterMask); // already optimized
    if (river) {
      waterBodies.push(river);
    }
  }

  // === 3. Generate and draw LAKES ===
  const numLakes = 4 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numLakes; i++) {
    let lake = null;
    let attempts = 0;

    while (attempts++ < 10) {
      lake = generateLake(ctx, width, height, waterMask);
      if (lake) {
        markLakeOnWaterMask(waterMask, lake);
        waterBodies.push(lake);
        break;
      }
    }
  }

  return waterBodies;
};

// Updated pickLocation that excludes water
const pickLocation = (terrain, waterMask, conditionFn) => {
  const candidates = terrain.filter(
    (t) => conditionFn(t) && !(waterMask[t.y] && waterMask[t.y][t.x])
  );
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
};

// Helper function to check minimum distance between settlements
const checkMinimumDistance = (newSettlement, existingSettlements, minDistance) => {
  for (const existing of existingSettlements) {
    const dx = newSettlement.x - existing.x;
    const dy = newSettlement.y - existing.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance < minDistance) {
      return false;
    }
  }
  return true;
};

export const generateSettlements = (ctx, width, height, terrain, waterMask, counts = {}) => {
  const cities = [];
  const towns = [];
  const villages = [];
  const allSettlements = [];
  const namedLabels = [];

  const fontScale = Math.min(width, height) / 1000;
  const citySize = Math.max(6 * fontScale, 4);
  const townSize = Math.max(4 * fontScale, 3);
  const villageSize = Math.max(2 * fontScale, 1.5);

  const minCityDistance = 80 * fontScale;
  const minTownDistance = 50 * fontScale;
  const minVillageDistance = 30 * fontScale;

  const numCities = counts.cities != null ? Math.max(0, counts.cities) : 3 + Math.floor(Math.random() * 4);
  const numTowns = counts.towns != null ? Math.max(0, counts.towns) : 5 + Math.floor(Math.random() * 6);
  const numVillages = counts.villages != null ? Math.max(0, counts.villages) : 15 + Math.floor(Math.random() * 15);

  // === Cities ===
  if (numCities > 0) {
    let attempts = 0;
    const maxAttempts = numCities * 10;

    while (cities.length < numCities && attempts < maxAttempts) {
      const point = pickLocation(terrain, waterMask, t => ['plains', 'forest'].includes(t.type));
      if (!point) {
        attempts++;
        continue;
      }

      const city = {
        name: generateName(),
        type: 'city',
        x: point.x,
        y: point.y,
        population: Math.floor(Math.random() * 50000) + 10000,
      };

      if (checkMinimumDistance(city, allSettlements, minCityDistance)) {
        // Draw city symbol
        ctx.fillStyle = '#FF4444';
        ctx.fillRect(city.x - citySize, city.y - citySize, citySize * 2, citySize * 2);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2 * fontScale;
        ctx.strokeRect(city.x - citySize, city.y - citySize, citySize * 2, citySize * 2);

        // Add label metadata (for drawFeatureNames)
        namedLabels.push({
          type: 'city',
          name: city.name,
          center: { x: city.x, y: city.y }
        });

        cities.push(city);
        allSettlements.push(city);
      }
      attempts++;
    }
  }

  // === Towns ===
  if (numTowns > 0) {
    let attempts = 0;
    const maxAttempts = numTowns * 10;

    while (towns.length < numTowns && attempts < maxAttempts) {
      const point = pickLocation(terrain, waterMask, t => ['plains', 'forest'].includes(t.type));
      if (!point) {
        attempts++;
        continue;
      }

      const town = {
        name: generateName(),
        type: 'town',
        x: point.x,
        y: point.y,
        population: Math.floor(Math.random() * 7000) + 1000,
      };

      if (checkMinimumDistance(town, allSettlements, minTownDistance)) {
        ctx.fillStyle = '#FFA500';
        ctx.beginPath();
        ctx.arc(town.x, town.y, townSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1 * fontScale;
        ctx.stroke();

        namedLabels.push({
          type: 'town',
          name: town.name,
          center: { x: town.x, y: town.y }
        });

        towns.push(town);
        allSettlements.push(town);
      }
      attempts++;
    }
  }

  // === Villages ===
  if (numVillages > 0) {
    let attempts = 0;
    const maxAttempts = numVillages * 10;

    while (villages.length < numVillages && attempts < maxAttempts) {
      const point = pickLocation(terrain, waterMask, t => ['plains', 'forest', 'hills'].includes(t.type));
      if (!point) {
        attempts++;
        continue;
      }

      const village = {
        name: generateName(),
        type: 'village',
        x: point.x,
        y: point.y,
        population: Math.floor(Math.random() * 750) + 50,
      };

      if (checkMinimumDistance(village, allSettlements, minVillageDistance)) {
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(village.x, village.y, villageSize, 0, Math.PI * 2);
        ctx.fill();

        namedLabels.push({
          type: 'village',
          name: village.name,
          center: { x: village.x, y: village.y }
        });

        villages.push(village);
        allSettlements.push(village);
      }
      attempts++;
    }
  }

  return { cities, towns, villages, namedLabels };
};

// New export function to generate and draw named features
export const generateNamedFeatures = (ctx, terrain, waterBodies, width, height) => {
  const namedFeatures = nameMajorFeatures(terrain, waterBodies);
  return namedFeatures;
};

export const downloadCanvas = (canvas, filename) => {
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Mark pixels covered by lake as water in waterMask
export const markLakeOnWaterMask = (waterMask, lake) => {
  const { center, radius } = lake;
  const cx = center.x;
  const cy = center.y;

  for (let y = Math.max(0, cy - radius); y <= cy + radius && y < waterMask.length; y++) {
    for (let x = Math.max(0, cx - radius); x <= cx + radius && x < waterMask[0].length; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        waterMask[y][x] = true;
      }
    }
  }
};

// Mark river path pixels as water in waterMask
export const markRiverOnWaterMask = (waterMask, river) => {
  if (!river.path) return;
  river.path.forEach(({ x, y }) => {
    if (y >= 0 && y < waterMask.length && x >= 0 && x < waterMask[0].length) {
      waterMask[y][x] = true;
    }
  });
};
