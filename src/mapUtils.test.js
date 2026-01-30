// src/mapUtils.test.js
import { generateTerrain, generateWaterBodies, generateSettlements, downloadCanvas } from './mapUtils';
import { Noise } from 'noisejs';

// Mock canvas context
const mockCtx = {
  fillRect: jest.fn(),
  strokeRect: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  arc: jest.fn(),
  ellipse: jest.fn(),
  closePath: jest.fn(),
  fill: jest.fn(),
  stroke: jest.fn(),
  fillText: jest.fn(),
  clearRect: jest.fn(),
  set fillStyle(value) { this._fillStyle = value; },
  get fillStyle() { return this._fillStyle; },
  set strokeStyle(value) { this._strokeStyle = value; },
  get strokeStyle() { return this._strokeStyle; },
  set lineWidth(value) { this._lineWidth = value; },
  get lineWidth() { return this._lineWidth; },
  set font(value) { this._font = value; },
  get font() { return this._font; }
};

describe('mapUtils', () => {
  let noiseMap;
  const width = 100;
  const height = 100;

  beforeEach(() => {
    jest.clearAllMocks();
    const noiseInstance = new Noise(123);
    // Create a consistent noise map for tests
    noiseMap = [];
    for (let y = 0; y < height; y++) {
      noiseMap[y] = [];
      for (let x = 0; x < width; x++) {
        // Use perlin2 with scaled coordinates to generate noise values between 0 and 1
        noiseMap[y][x] = (noiseInstance.perlin2(x * 0.01, y * 0.01) + 1) / 2;
      }
    }
  });

  describe('generateTerrain', () => {
    test('generates terrain data', () => {
      const terrain = generateTerrain(mockCtx, width, height, noiseMap);

      expect(Array.isArray(terrain)).toBe(true);
      expect(terrain.length).toBeGreaterThan(0);
      expect(terrain[0]).toHaveProperty('x');
      expect(terrain[0]).toHaveProperty('y');
      expect(terrain[0]).toHaveProperty('type');
      expect(terrain[0]).toHaveProperty('elevation');
    });

    test('calls canvas drawing methods', () => {
      generateTerrain(mockCtx, width, height, noiseMap);

      expect(mockCtx.fillRect).toHaveBeenCalled();
    });
  });

  describe('generateWaterBodies', () => {
    test('generates water bodies', () => {
      // Mock Math.random to 0.9 to ensure rivers find start points
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);

      const waterBodies = generateWaterBodies(mockCtx, width, height, noiseMap);

      expect(Array.isArray(waterBodies)).toBe(true);
      expect(waterBodies.length).toBeGreaterThan(0);
      expect(waterBodies[0]).toHaveProperty('type');
      expect(waterBodies[0]).toHaveProperty('name');

      mathRandomSpy.mockRestore();
    });

    test('calls canvas drawing methods for water', () => {
      // Mock Math.random to 0.9 so rivers generate and draw
      const mathRandomSpy = jest.spyOn(Math, 'random').mockReturnValue(0.9);

      generateWaterBodies(mockCtx, width, height, noiseMap);

      // Rivers use stroke, lakes use fillRect, so check for any drawing call
      expect(
        mockCtx.stroke.mock.calls.length > 0 ||
        mockCtx.fill.mock.calls.length > 0 ||
        mockCtx.fillRect.mock.calls.length > 0
      ).toBe(true);

      mathRandomSpy.mockRestore();
    });
  });

  describe('generateSettlements', () => {
    const terrain = [
      { x: 10, y: 10, type: 'plains', elevation: 0.3 },
      { x: 20, y: 20, type: 'forest', elevation: 0.4 },
      { x: 30, y: 30, type: 'hills', elevation: 0.6 },
    ];

    test('generates settlements with correct structure', () => {
      const settlements = generateSettlements(mockCtx, 1000, 500, terrain);

      expect(settlements).toHaveProperty('cities');
      expect(settlements).toHaveProperty('towns');
      expect(settlements).toHaveProperty('villages');

      expect(Array.isArray(settlements.cities)).toBe(true);
      expect(Array.isArray(settlements.towns)).toBe(true);
      expect(Array.isArray(settlements.villages)).toBe(true);

      expect(settlements.cities.length).toBeGreaterThan(0);
      expect(settlements.towns.length).toBeGreaterThan(0);
      expect(settlements.villages.length).toBeGreaterThan(0);
    });

    test('settlements have required properties', () => {
      const settlements = generateSettlements(mockCtx, 1000, 500, terrain);

      const city = settlements.cities[0];
      expect(city).toHaveProperty('name');
      expect(city).toHaveProperty('type');
      expect(city).toHaveProperty('x');
      expect(city).toHaveProperty('y');
      expect(city).toHaveProperty('population');
      expect(city.type).toBe('city');
    });
  });

  describe('downloadCanvas', () => {
    test('creates download link', () => {
      const mockCanvas = {
        toDataURL: jest.fn(() => 'data:image/png;base64,test')
      };

      // Mock DOM methods
      const mockLink = {
        click: jest.fn(),
        download: '',
        href: ''
      };

      document.createElement = jest.fn(() => mockLink);
      document.body.appendChild = jest.fn();
      document.body.removeChild = jest.fn();

      downloadCanvas(mockCanvas, 'test.png');

      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/png');
      expect(mockLink.download).toBe('test.png');
      expect(mockLink.click).toHaveBeenCalled();
    });
  });
});
