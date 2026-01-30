// MapLegend.jsx
import React from 'react';

const MapLegend = () => {
    return (
        <div className="card w-100 mb-4">
            <div className="card-header">Terrain</div>
            <ul className="list-group list-group-flush mb-0">
                <li className="list-group-item d-flex align-items-center p-2">
                    <span
                        className="me-2"
                        style={{
                            display: 'inline-block',
                            width: '18px',
                            height: '18px',
                            backgroundColor: '#C8E6A0',
                            border: '1px solid #000',
                        }}
                    ></span>
                    Plains
                </li>
                <li className="list-group-item d-flex align-items-center p-2">
                    <span
                        className="me-2"
                        style={{
                            display: 'inline-block',
                            width: '18px',
                            height: '18px',
                            backgroundColor: '#228B22',
                            border: '1px solid #000',
                        }}
                    ></span>
                    Forest
                </li>
                <li className="list-group-item d-flex align-items-center p-2">
                    <span
                        className="me-2"
                        style={{
                            display: 'inline-block',
                            width: '18px',
                            height: '18px',
                            backgroundColor: '#8B7355',
                            border: '1px solid #000',
                        }}
                    ></span>
                    Hills
                </li>
                <li className="list-group-item d-flex align-items-center p-2">
                    <span
                        className="me-2"
                        style={{
                            display: 'inline-block',
                            width: '18px',
                            height: '18px',
                            backgroundColor: '#696969',
                            border: '1px solid #000',
                        }}
                    ></span>
                    Mountains
                </li>
            </ul>
        </div>
    );
};

export default MapLegend;
