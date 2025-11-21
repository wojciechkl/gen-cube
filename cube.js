import * as THREE from 'three';

// Rubik's Cube colors
const COLORS = {
  U: 0xFFFFFF, // White (Up)
  D: 0xFFFF00, // Yellow (Down)
  F: 0x00FF00, // Green (Front)
  B: 0x0000FF, // Blue (Back)
  R: 0xFF0000, // Red (Right)
  L: 0xFFA500, // Orange (Left)
};

export class RubiksCube {
  constructor(scene) {
    this.scene = scene;
    this.cubeGroup = new THREE.Group();
    this.pieces = [];
    this.isAnimating = false;
    this.animationQueue = [];
    
    this.createCube();
    this.scene.add(this.cubeGroup);
  }

  createCube() {
    const cubeSize = 0.95;
    const gap = 0.05;
    const spacing = cubeSize + gap;

    // Create 26 pieces (3x3x3 minus center)
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip the center piece
          if (x === 0 && y === 0 && z === 0) continue;

          const piece = this.createPiece(x, y, z, cubeSize);
          piece.position.set(x * spacing, y * spacing, z * spacing);
          this.pieces.push(piece);
          this.cubeGroup.add(piece);
        }
      }
    }
  }

  createPiece(x, y, z, size) {
    const geometry = new THREE.BoxGeometry(size, size, size);
    
    // Create materials for each face
    const materials = [
      this.createFaceMaterial(x === 1 ? COLORS.R : 0x000000),  // Right
      this.createFaceMaterial(x === -1 ? COLORS.L : 0x000000), // Left
      this.createFaceMaterial(y === 1 ? COLORS.U : 0x000000),  // Up
      this.createFaceMaterial(y === -1 ? COLORS.D : 0x000000), // Down
      this.createFaceMaterial(z === 1 ? COLORS.F : 0x000000),  // Front
      this.createFaceMaterial(z === -1 ? COLORS.B : 0x000000), // Back
    ];

    const piece = new THREE.Mesh(geometry, materials);
    piece.userData = { x, y, z };
    
    return piece;
  }

  createFaceMaterial(color) {
    return new THREE.MeshStandardMaterial({
      color: color,
      emissive: color === 0x000000 ? 0x000000 : color,
      emissiveIntensity: 0.1,
    });
  }

  // Parse move notation (e.g., "U", "U'", "U2", "R", "F'")
  parseMove(moveStr) {
    const face = moveStr[0];
    const modifier = moveStr.slice(1);
    let angle = Math.PI / 2;
    
    if (modifier === "'") {
      angle = -Math.PI / 2;
    } else if (modifier === "2") {
      angle = Math.PI;
    }
    
    return { face, angle };
  }

  // Queue a move for animation
  queueMove(moveStr) {
    this.animationQueue.push(moveStr);
    if (!this.isAnimating) {
      this.processNextMove();
    }
  }

  async processNextMove() {
    if (this.animationQueue.length === 0) {
      this.isAnimating = false;
      return;
    }

    this.isAnimating = true;
    const moveStr = this.animationQueue.shift();
    await this.animateMove(moveStr);
    this.processNextMove();
  }

  // Animate a move
  animateMove(moveStr) {
    return new Promise((resolve) => {
      const { face, angle } = this.parseMove(moveStr);
      const piecesToRotate = this.getPiecesForFace(face);
      
      // Create a temporary group for rotation
      const rotationGroup = new THREE.Group();
      // Add to cubeGroup so it rotates with the cube
      this.cubeGroup.add(rotationGroup);
      
      // Attach pieces to rotation group
      piecesToRotate.forEach(piece => {
        rotationGroup.attach(piece);
      });

      // Determine rotation axis
      const axis = this.getRotationAxis(face);
      
      // Animate rotation
      const duration = 300; // ms
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-in-out function
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        
        const currentAngle = angle * easeProgress;
        rotationGroup.setRotationFromAxisAngle(axis, currentAngle);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Finalize rotation
          rotationGroup.setRotationFromAxisAngle(axis, angle);
          rotationGroup.updateMatrixWorld(); // Ensure transforms are up to date

          piecesToRotate.forEach(piece => {
            this.cubeGroup.attach(piece);
            
            // Snap position to grid to prevent drift
            const spacing = 1.0;
            piece.position.x = Math.round(piece.position.x / spacing) * spacing;
            piece.position.y = Math.round(piece.position.y / spacing) * spacing;
            piece.position.z = Math.round(piece.position.z / spacing) * spacing;
            
            // Update userData position
            this.updatePieceData(piece);
          });
          
          this.cubeGroup.remove(rotationGroup);
          resolve();
        }
      };
      
      animate();
    });
  }

  getPiecesForFace(face) {
    const threshold = 0.5;
    
    switch (face) {
      case 'U':
        return this.pieces.filter(p => p.position.y > threshold);
      case 'D':
        return this.pieces.filter(p => p.position.y < -threshold);
      case 'R':
        return this.pieces.filter(p => p.position.x > threshold);
      case 'L':
        return this.pieces.filter(p => p.position.x < -threshold);
      case 'F':
        return this.pieces.filter(p => p.position.z > threshold);
      case 'B':
        return this.pieces.filter(p => p.position.z < -threshold);
      case 'M':
        return this.pieces.filter(p => Math.abs(p.position.x) < threshold);
      case 'E':
        return this.pieces.filter(p => Math.abs(p.position.y) < threshold);
      case 'S':
        return this.pieces.filter(p => Math.abs(p.position.z) < threshold);
      default:
        return [];
    }
  }

  getRotationAxis(face) {
    switch (face) {
      case 'U':
        return new THREE.Vector3(0, -1, 0);
      case 'D':
      case 'E':
        return new THREE.Vector3(0, 1, 0);
      case 'R':
        return new THREE.Vector3(-1, 0, 0);
      case 'L':
      case 'M':
        return new THREE.Vector3(1, 0, 0);
      case 'F':
      case 'S':
        return new THREE.Vector3(0, 0, -1);
      case 'B':
        return new THREE.Vector3(0, 0, 1);
      default:
        return new THREE.Vector3(0, 1, 0);
    }
  }

  updatePieceData(piece) {
    const pos = piece.position;
    const threshold = 0.5;
    
    piece.userData.x = Math.abs(pos.x) < threshold ? 0 : (pos.x > 0 ? 1 : -1);
    piece.userData.y = Math.abs(pos.y) < threshold ? 0 : (pos.y > 0 ? 1 : -1);
    piece.userData.z = Math.abs(pos.z) < threshold ? 0 : (pos.z > 0 ? 1 : -1);
  }

  reset() {
    // Clear animation queue
    this.animationQueue = [];
    this.isAnimating = false;
    
    // Remove all pieces
    this.pieces.forEach(piece => {
      this.cubeGroup.remove(piece);
    });
    this.pieces = [];
    
    // Recreate cube
    this.createCube();
  }

  setCubeState(facelets) {
    // Reset cube to solved state first to ensure pieces are in correct positions
    this.reset();

    // Map of facelets string indices to (x, y, z) and face index
    // Face indices: 0:R, 1:L, 2:U, 3:D, 4:F, 5:B
    const map = [
      // U (0-8)
      {x:-1,y:1,z:-1,f:2}, {x:0,y:1,z:-1,f:2}, {x:1,y:1,z:-1,f:2},
      {x:-1,y:1,z:0,f:2},  {x:0,y:1,z:0,f:2},  {x:1,y:1,z:0,f:2},
      {x:-1,y:1,z:1,f:2},  {x:0,y:1,z:1,f:2},  {x:1,y:1,z:1,f:2},
      // R (9-17)
      {x:1,y:1,z:1,f:0},   {x:1,y:1,z:0,f:0},  {x:1,y:1,z:-1,f:0},
      {x:1,y:0,z:1,f:0},   {x:1,y:0,z:0,f:0},  {x:1,y:0,z:-1,f:0},
      {x:1,y:-1,z:1,f:0},  {x:1,y:-1,z:0,f:0}, {x:1,y:-1,z:-1,f:0},
      // F (18-26)
      {x:-1,y:1,z:1,f:4},  {x:0,y:1,z:1,f:4},  {x:1,y:1,z:1,f:4},
      {x:-1,y:0,z:1,f:4},  {x:0,y:0,z:1,f:4},  {x:1,y:0,z:1,f:4},
      {x:-1,y:-1,z:1,f:4}, {x:0,y:-1,z:1,f:4}, {x:1,y:-1,z:1,f:4},
      // D (27-35)
      {x:-1,y:-1,z:1,f:3}, {x:0,y:-1,z:1,f:3}, {x:1,y:-1,z:1,f:3},
      {x:-1,y:-1,z:0,f:3}, {x:0,y:-1,z:0,f:3}, {x:1,y:-1,z:0,f:3},
      {x:-1,y:-1,z:-1,f:3},{x:0,y:-1,z:-1,f:3},{x:1,y:-1,z:-1,f:3},
      // L (36-44)
      {x:-1,y:1,z:-1,f:1}, {x:-1,y:1,z:0,f:1}, {x:-1,y:1,z:1,f:1},
      {x:-1,y:0,z:-1,f:1}, {x:-1,y:0,z:0,f:1}, {x:-1,y:0,z:1,f:1},
      {x:-1,y:-1,z:-1,f:1},{x:-1,y:-1,z:0,f:1},{x:-1,y:-1,z:1,f:1},
      // B (45-53)
      {x:1,y:1,z:-1,f:5},  {x:0,y:1,z:-1,f:5}, {x:-1,y:1,z:-1,f:5},
      {x:1,y:0,z:-1,f:5},  {x:0,y:0,z:-1,f:5}, {x:-1,y:0,z:-1,f:5},
      {x:1,y:-1,z:-1,f:5}, {x:0,y:-1,z:-1,f:5}, {x:-1,y:-1,z:-1,f:5}
    ];

    for (let i = 0; i < facelets.length; i++) {
      const char = facelets[i];
      const color = COLORS[char];
      const info = map[i];
      
      if (info && color !== undefined) {
        const piece = this.pieces.find(p => 
          p.userData.x === info.x && 
          p.userData.y === info.y && 
          p.userData.z === info.z
        );
        
        if (piece) {
          piece.material[info.f].color.setHex(color);
          // Ensure emissive is set correctly for black/colored faces
          piece.material[info.f].emissive.setHex(color === 0x000000 ? 0x000000 : color);
        }
      }
    }
  }
}
