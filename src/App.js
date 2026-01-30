// src/App.js
import React from 'react';
import MapGenerator from './MapGenerator';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function App() {
  return (
    <div className="App bg-light min-vh-100">
      <MapGenerator />
    </div>
  );
}

export default App;