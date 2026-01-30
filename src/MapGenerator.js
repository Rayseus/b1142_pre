// src/MapGenerator.js
import React, { useState, useRef } from 'react';
import MapLegend from './MapLegend';
import * as mapUtils from './mapUtils';

const MapGenerator = () => {
  const [mapData, setMapData] = useState({
    cities: [],
    towns: [],
    villages: [],
    waterBodies: [],
    terrain: [],
    namedFeatures: []
  });
  const [selectedSize, setSelectedSize] = useState('1000x500');
  const [settlementCounts, setSettlementCounts] = useState({
    cities: 5,
    towns: 8,
    villages: 20
  });
  const canvasRef = useRef(null);

  const imageSizes = [
    { label: '1000x500', value: '1000x500', width: 1000, height: 500 },
    { label: '1920x1080 (HD)', value: '1920x1080', width: 1920, height: 1080 },
    { label: '2560x1440 (2K)', value: '2560x1440', width: 2560, height: 1440 },
    { label: '3840x2160 (4K)', value: '3840x2160', width: 3840, height: 2160 }
  ];

  const generateMap = () => {
    const currentSize = imageSizes.find(size => size.value === selectedSize);
    const { width, height } = currentSize;

    const canvas = canvasRef.current;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // Enable anti-aliasing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Generate terrain base
    const waterMask = mapUtils.createWaterMask(width, height);
    const noise = mapUtils.createNoise(width, height);
    const terrain = mapUtils.generateTerrain(ctx, width, height, noise);

    // Draw water bodies (rivers, lakes, seas)
    const waterBodies = mapUtils.generateWaterBodies(ctx, width, height, noise, waterMask);

    // Update water mask to include lakes and rivers
    waterBodies.forEach(wb => {
      if (wb.type === 'lake') mapUtils.markLakeOnWaterMask(waterMask, wb);
      if (wb.type === 'river') mapUtils.markRiverOnWaterMask(waterMask, wb);
    });

    // Generate settlements and defer label drawing
    const settlements = mapUtils.generateSettlements(ctx, width, height, terrain, waterMask, settlementCounts);

    // Generate geographic feature names (mountains, lakes, rivers, etc.)
    const naturalFeatures = mapUtils.generateNamedFeatures(ctx, terrain, waterBodies, width, height);

    // === Draw all labels together to handle overlaps & canvas bounds ===
    const allLabels = [...naturalFeatures, ...settlements.namedLabels];
    mapUtils.drawFeatureNames(ctx, allLabels, width, height);

    // Store map data
    setMapData({
      cities: settlements.cities,
      towns: settlements.towns,
      villages: settlements.villages,
      waterBodies,
      terrain,
      namedFeatures: naturalFeatures
    });
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const { width, height } = canvasRef.current;
    mapUtils.downloadCanvas(canvasRef.current, `fantasy-map-${width}x${height}.png`);
  };

  const handleSizeChange = (e) => {
    setSelectedSize(e.target.value);
  };

  const handleSettlementCountChange = (type, value) => {
    setSettlementCounts(prev => ({
      ...prev,
      [type]: parseInt(value) || 0
    }));
  };

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="text-center mb-4 text-primary">Fantasy Map Generator</h1>

          <div className="card mb-4">
            <div className="card-body">
              <div className="row align-items-center mb-3">
                <div className="col-md-3">
                  <label htmlFor="sizeSelect" className="form-label">Map Size:</label>
                  <select
                    id="sizeSelect"
                    className="form-select"
                    value={selectedSize}
                    onChange={handleSizeChange}
                  >
                    {imageSizes.map(size => (
                      <option key={size.value} value={size.value}>
                        {size.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label htmlFor="citiesCount" className="form-label">Cities:</label>
                  <input
                    id="citiesCount"
                    type="number"
                    className="form-control"
                    min="0"
                    max="20"
                    value={settlementCounts.cities}
                    onChange={(e) => handleSettlementCountChange('cities', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label htmlFor="townsCount" className="form-label">Towns:</label>
                  <input
                    id="townsCount"
                    type="number"
                    className="form-control"
                    min="0"
                    max="50"
                    value={settlementCounts.towns}
                    onChange={(e) => handleSettlementCountChange('towns', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label htmlFor="villagesCount" className="form-label">Villages:</label>
                  <input
                    id="villagesCount"
                    type="number"
                    className="form-control"
                    min="0"
                    max="100"
                    value={settlementCounts.villages}
                    onChange={(e) => handleSettlementCountChange('villages', e.target.value)}
                  />
                </div>
                <div className="col-md-3">
                  <label className="form-label">&nbsp;</label>
                  <div className="d-grid gap-2">
                    <button
                      className="btn btn-success"
                      onClick={generateMap}
                    >
                      <i className="bi bi-map"></i> Generate Map
                    </button>
                  </div>
                </div>
              </div>
              <div className="row">
                <div className="col-md-12 text-center">
                  <button
                    className="btn btn-primary btn-lg"
                    onClick={handleDownload}
                    disabled={mapData.terrain.length === 0}
                  >
                    <i className="bi bi-download"></i> Download Map
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-lg-9">
              <div className="card">
                <div className="card-body p-2">
                  <canvas
                    ref={canvasRef}
                    width={1000}
                    height={500}
                    className="img-fluid border rounded"
                    style={{ maxWidth: '100%', height: 'auto' }}
                  />
                </div>
              </div>
            </div>

            <div className="col-lg-3">
              <MapLegend />
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Map Statistics</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <h6 className="text-primary">Cities ({mapData.cities.length})</h6>
                    <ul className="list-unstyled small" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {mapData.cities.map((city, index) => (
                        <li key={index} className="mb-1">
                          <i className="bi bi-building text-danger"></i> {city.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h6 className="text-success">Towns ({mapData.towns.length})</h6>
                    <ul className="list-unstyled small" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {mapData.towns.map((town, index) => (
                        <li key={index} className="mb-1">
                          <i className="bi bi-house text-warning"></i> {town.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h6 className="text-info">Villages ({mapData.villages.length})</h6>
                    <ul className="list-unstyled small" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {mapData.villages.map((village, index) => (
                        <li key={index} className="mb-1">
                          <i className="bi bi-geo-alt-fill text-secondary"></i> {village.name}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mb-3">
                    <h6 className="text-primary">Water Bodies ({mapData.waterBodies.length})</h6>
                    <p className="small text-muted">
                      Rivers, lakes, and coastal waters
                    </p>
                  </div>

                  <div>
                    <h6 className="text-secondary">Named Features ({mapData.namedFeatures.length})</h6>
                    <ul className="list-unstyled small" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                      {mapData.namedFeatures.map((feature, index) => (
                        <li key={index} className="mb-1">
                          <i className={`bi ${feature.type === 'mountain_range' ? 'bi-triangle-fill' : 'bi-water'} text-info`}></i> {feature.name}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapGenerator;