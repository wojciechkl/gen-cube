import * as THREE from 'three';
import { connectGanCube } from 'gan-web-bluetooth';
import { RubiksCube } from './cube.js';

// Three.js scene setup
let scene, camera, renderer, cube;
let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };

function initThreeJS() {
  const container = document.getElementById('canvas-container');
  
  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a2e);
  
  // Camera
  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(5, 5, 8);
  camera.lookAt(0, 0, 0);
  
  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.shadowMap.enabled = true;
  container.appendChild(renderer.domElement);
  
  // Lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  
  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(5, 10, 5);
  scene.add(directionalLight1);
  
  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight2.position.set(-5, 5, -5);
  scene.add(directionalLight2);
  
  // Create Rubik's Cube
  cube = new RubiksCube(scene);
  
  // Mouse controls
  setupMouseControls(container);
  
  // Handle window resize
  window.addEventListener('resize', onWindowResize);
  
  // Animation loop
  animate();
}

function setupMouseControls(container) {
  container.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
  });
  
  container.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      
      cube.cubeGroup.rotation.y += deltaX * 0.01;
      cube.cubeGroup.rotation.x += deltaY * 0.01;
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    }
  });
  
  container.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  container.addEventListener('mouseleave', () => {
    isDragging = false;
  });
  
  // Touch controls for mobile
  container.addEventListener('touchstart', (e) => {
    isDragging = true;
    previousMousePosition = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  });
  
  container.addEventListener('touchmove', (e) => {
    if (isDragging) {
      const deltaX = e.touches[0].clientX - previousMousePosition.x;
      const deltaY = e.touches[0].clientY - previousMousePosition.y;
      
      cube.cubeGroup.rotation.y += deltaX * 0.01;
      cube.cubeGroup.rotation.x += deltaY * 0.01;
      
      previousMousePosition = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
  });
  
  container.addEventListener('touchend', () => {
    isDragging = false;
  });
}

function onWindowResize() {
  const container = document.getElementById('canvas-container');
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
  requestAnimationFrame(animate);
  
  // Gentle auto-rotation when not dragging
  if (!isDragging && !cube.isAnimating) {
    cube.cubeGroup.rotation.y += 0.001;
  }
  
  renderer.render(scene, camera);
}

// GAN Cube connection
let ganConnection = null;

// Known GAN UUIDs for debugging
const GAN_UUIDS = {
  TIMER_SERVICE: '0000fff0-0000-1000-8000-00805f9b34fb',
  GEN2_SERVICE: '6e400001-b5a3-f393-e0a9-e50e24dc4179',
  GEN3_SERVICE: '8653000a-43e6-47b7-9cb0-5fc21d4ae340',
  GEN4_SERVICE: '00000010-0000-fff7-fff6-fff5fff4fff0'
};

async function debugConnection() {
  const statusEl = document.getElementById('status');
  const moveLog = document.getElementById('moveLog');
  
  try {
    statusEl.textContent = 'Starting debug scan...';
    statusEl.className = '';
    moveLog.innerHTML = ''; // Clear log
    
    const log = (msg) => {
      console.log(msg);
      const entry = document.createElement('div');
      entry.className = 'move-entry';
      entry.style.borderLeftColor = '#4a5568';
      entry.textContent = msg;
      moveLog.appendChild(entry);
    };

    log('Requesting device with all known UUIDs...');
    
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: 'GAN' },
        { namePrefix: 'MG' },
        { namePrefix: 'AiCube' }
      ],
      optionalServices: Object.values(GAN_UUIDS)
    });

    log(`Device selected: ${device.name} (${device.id})`);
    
    log('Connecting to GATT server...');
    const server = await device.gatt.connect();
    log('Connected to GATT!');

    log('Getting primary services...');
    const services = await server.getPrimaryServices();
    
    log(`Found ${services.length} services:`);
    for (const service of services) {
      let type = 'Unknown';
      for (const [name, uuid] of Object.entries(GAN_UUIDS)) {
        if (service.uuid === uuid) type = name;
      }
      log(`- ${service.uuid} (${type})`);
    }

    server.disconnect();
    log('Disconnected. Check the UUIDs above.');
    
  } catch (error) {
    console.error('Debug error:', error);
    statusEl.textContent = 'Debug failed: ' + error.message;
    statusEl.className = 'error';
  }
}

async function connectToGanCube() {
  const statusEl = document.getElementById('status');
  const connectBtn = document.getElementById('connectBtn');
  const moveLog = document.getElementById('moveLog');
  
  try {
    connectBtn.disabled = true;
    statusEl.textContent = 'Selecting device...';
    statusEl.className = '';
    
    // Check if Web Bluetooth is available
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not available. Please use Chrome, Edge, or Opera.');
    }
    
    // Connect to GAN cube
    statusEl.textContent = 'Connecting to cube...';
    
    const macInput = document.getElementById('macInput');
    const manualMac = macInput.value.trim();
    
    const macProvider = async (device) => {
      if (manualMac) {
        console.log('Using manual MAC address:', manualMac);
        return manualMac;
      }
      return null;
    };

    ganConnection = await connectGanCube(macProvider);
    
    statusEl.textContent = 'Connected to GAN Cube!';
    statusEl.className = 'connected';
    connectBtn.textContent = 'Disconnect';
    connectBtn.disabled = false;
    
    // Request initial cube state
    await ganConnection.sendCubeCommand({ type: "REQUEST_FACELETS" });
    
    // Subscribe to cube events
    ganConnection.events$.subscribe((event) => {
      if (event.type === "MOVE") {
        console.log("Cube move:", event.move);
        
        // Add move to log
        const moveEntry = document.createElement('div');
        moveEntry.className = 'move-entry';
        moveEntry.textContent = event.move;
        moveLog.insertBefore(moveEntry, moveLog.firstChild);
        
        // Keep only last 20 moves in log
        while (moveLog.children.length > 20) {
          moveLog.removeChild(moveLog.lastChild);
        }
        
        // Animate move on 3D cube
        cube.queueMove(event.move);
      } else if (event.type === "FACELETS") {
        console.log("Cube facelets state:", event.facelets);
        cube.setCubeState(event.facelets);
      } else if (event.type === "DISCONNECT") {
        statusEl.textContent = 'Cube disconnected';
        statusEl.className = 'error';
        connectBtn.textContent = 'Connect to GAN Cube';
        connectBtn.disabled = false;
        ganConnection = null;
      }
    });
    
  } catch (error) {
    console.error('Connection error:', error);
    
    let errorMsg = 'Connection failed: ';
    if (error.message.includes('MAC address')) {
      errorMsg += 'Please make sure your GAN cube is: 1) Turned on, 2) Not connected to another device, 3) In range. Try resetting the cube.';
    } else if (error.name === 'NotFoundError') {
      errorMsg += 'No device selected. Please try again and select your GAN cube.';
    } else if (error.name === 'SecurityError') {
      errorMsg += 'HTTPS is required for Bluetooth. Make sure you are using https://.';
    } else {
      errorMsg += error.message;
    }
    
    statusEl.textContent = errorMsg;
    statusEl.className = 'error';
    connectBtn.disabled = false;
  }
}

function disconnectFromGanCube() {
  if (ganConnection) {
    ganConnection.disconnect();
    ganConnection = null;
    
    const statusEl = document.getElementById('status');
    const connectBtn = document.getElementById('connectBtn');
    
    statusEl.textContent = 'Disconnected';
    statusEl.className = '';
    connectBtn.textContent = 'Connect to GAN Cube';
  }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
  initThreeJS();
  
  const connectBtn = document.getElementById('connectBtn');
  connectBtn.addEventListener('click', () => {
    if (ganConnection) {
      disconnectFromGanCube();
    } else {
      connectToGanCube();
    }
  });
});
