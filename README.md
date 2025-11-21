# GAN Cube 3D Visualizer

A web application that connects to GAN Smart Cubes via Web Bluetooth API and visualizes cube moves in real-time using Three.js.

## Features

- 🎮 Connect to GAN Smart Cubes via Bluetooth
- 🎨 Real-time 3D visualization of cube state
- ✨ Smooth animations for all cube moves
- 📱 Responsive design with touch support
- 📝 Move history log

## Supported Cubes

This app supports all GAN Smart Cubes that work with the gan-web-bluetooth library:
- GAN12 ui FreePlay / Maglev
- GAN14 ui FreePlay
- GAN356 i Carry / Carry 2 / Carry S
- GAN Mini ui FreePlay
- Monster Go 3Ai
- MoYu AI 2023

## Requirements

- A browser with Web Bluetooth API support (Chrome, Edge, Opera)
- A compatible GAN Smart Cube
- HTTPS connection (required for Web Bluetooth)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser to the URL shown (usually http://localhost:5173)

## Usage

1. Click the "Connect to GAN Cube" button
2. Select your GAN cube from the Bluetooth device picker
3. Once connected, the 3D cube will appear
4. Make moves on your physical cube and watch them animate in real-time!
5. Use your mouse or touch to rotate the view

## Building for Production

```bash
npm run build
```

The built files will be in the `dist` folder.

## How It Works

- **gan-web-bluetooth**: Handles the Bluetooth connection and communication with GAN cubes
- **Three.js**: Renders the 3D Rubik's cube visualization
- **RxJS**: Manages the event stream from the cube
- **Vite**: Fast development server and build tool

## License

MIT

## Credits

- [gan-web-bluetooth](https://github.com/afedotov/gan-web-bluetooth) by afedotov
- [Three.js](https://threejs.org/)
