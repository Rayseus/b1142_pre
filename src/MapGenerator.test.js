// src/MapGenerator.test.js
// Mock the mapUtils module
jest.mock('./mapUtils', () => ({
  ...jest.requireActual('./mapUtils'),
  generateTerrain: jest.fn(() => []),
  generateWaterBodies: jest.fn(() => []),
  generateSettlements: jest.fn(() => ({
    cities: [{ name: 'Test City' }],
    towns: [{ name: 'Test Town' }],
    villages: [{ name: 'Test Village' }]
  })),
  downloadCanvas: jest.fn(),
  createNoise: jest.fn(() => {
    const width = 10, height = 10;
    const arr = [];
    for (let y = 0; y < height; y++) {
      arr[y] = [];
      for (let x = 0; x < width; x++) {
        arr[y][x] = 0.5; // some constant noise value
      }
    }
    return arr;
  }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapGenerator from './MapGenerator';
import * as mapUtils from './mapUtils';
import { within } from '@testing-library/react';

describe('MapGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
      clearRect: jest.fn(),
      fillRect: jest.fn(),
      stroke: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      fill: jest.fn(),
      arc: jest.fn(),
      strokeRect: jest.fn(),
      fillText: jest.fn(),
    }));
  });

  test('renders map generator title', () => {
    render(<MapGenerator />);
    expect(screen.getByText('Fantasy Map Generator')).toBeInTheDocument();
  });

  test('renders generate map button', () => {
    render(<MapGenerator />);
    expect(screen.getByText('Generate Map')).toBeInTheDocument();
  });

  test('renders size selector with default value', () => {
    render(<MapGenerator />);
    const sizeSelect = screen.getByLabelText('Map Size:');
    expect(sizeSelect).toBeInTheDocument();
    expect(sizeSelect.value).toBe('1000x500');
  });

  test('download button is initially disabled', () => {
    render(<MapGenerator />);
    const downloadButton = screen.getByText('Download Map');
    expect(downloadButton).toBeDisabled();
  });

  test('generates map when generate button is clicked', async () => {
    render(<MapGenerator />);
    const generateButton = screen.getByText('Generate Map');

    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(mapUtils.generateTerrain).toHaveBeenCalled();
      expect(mapUtils.generateWaterBodies).toHaveBeenCalled();
      expect(mapUtils.generateSettlements).toHaveBeenCalled();
    });

    // After settlement generation, check that cities exist in the state/UI
    await waitFor(() => {
      expect(screen.getByText('Test City')).toBeInTheDocument();
    });
  });

  test('displays map statistics after generation', async () => {
    render(<MapGenerator />);
    const generateButton = screen.getByText('Generate Map');

    fireEvent.click(generateButton);

    await waitFor(() => {
      const citiesHeading = screen.getByText((_, element) => {
        if (!element) return false;
        if (element.tagName.toLowerCase() !== 'h6') return false;
        const text = element.textContent.replace(/\s+/g, '');
        return /^Cities\(\d+\)$/.test(text);
      });

      const townsHeading = screen.getByText((_, element) => {
        if (!element) return false;
        if (element.tagName.toLowerCase() !== 'h6') return false;
        const text = element.textContent.replace(/\s+/g, '');
        return /^Towns\(\d+\)$/.test(text);
      });

      const villagesHeading = screen.getByText((_, element) => {
        if (!element) return false;
        if (element.tagName.toLowerCase() !== 'h6') return false;
        const text = element.textContent.replace(/\s+/g, '');
        return /^Villages\(\d+\)$/.test(text);
      });

      expect(citiesHeading).toBeInTheDocument();
      expect(townsHeading).toBeInTheDocument();
      expect(villagesHeading).toBeInTheDocument();

      expect(screen.getByText('Test City')).toBeInTheDocument();
    });
  });
  
    test('enables download button after map generation', async () => {
      render(<MapGenerator />);
      const generateButton = screen.getByText('Generate Map');
  
      fireEvent.click(generateButton);
  
      // Wait for a city name to appear in the UI (meaning state updated)
      await screen.findByText((content, element) => content.includes('Test City'));
  
      const downloadButton = screen.getByText('Download Map');
      expect(downloadButton).not.toBeDisabled();
    });
  
    test('calls download function when download button is clicked', async () => {
      render(<MapGenerator />);
      const generateButton = screen.getByText('Generate Map');
  
      fireEvent.click(generateButton);
      expect(mapUtils.generateSettlements).toHaveBeenCalled();
  
      // Wait for city to appear (state update)
      fireEvent.click(generateButton);
  
      expect(mapUtils.generateSettlements).toHaveBeenCalled();
  
      await waitFor(() => {
        expect(screen.getByText('Cities (1)')).toBeInTheDocument();
        expect(screen.getByText('Test City')).toBeInTheDocument();
  
        const downloadButton = screen.getByText('Download Map');
        expect(downloadButton).not.toBeDisabled();
  
        fireEvent.click(downloadButton);
  
        expect(mapUtils.downloadCanvas).toHaveBeenCalled();
      });
    });

  test('changes map size when selector is changed', () => {
    render(<MapGenerator />);
    const sizeSelect = screen.getByLabelText('Map Size:');

    fireEvent.change(sizeSelect, { target: { value: '1920x1080' } });

    expect(sizeSelect.value).toBe('1920x1080');
  });
});