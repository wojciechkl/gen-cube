import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class JumpingMonkey {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    this.isLoaded = false;

    this.loadModel();
  }

  loadModel() {
    const loader = new GLTFLoader();
    loader.load('/monkey.glb', (gltf) => {
      this.model = gltf.scene;
      this.group.add(this.model);
      
      // Scale and position to fit nicely
      this.model.scale.set(0.5, 0.5, 0.5);
      this.model.position.y = -2;

      // Setup animations
      this.mixer = new THREE.AnimationMixer(this.model);
      
      gltf.animations.forEach((clip) => {
        this.actions[clip.name] = this.mixer.clipAction(clip);
      });

      // Play a cute animation
      this.playAnimation('Dance'); // RobotExpressive has a 'Dance' animation
      
      this.isLoaded = true;
      
      // Add some lights specifically for the model if needed
      // (The scene already has lights, so it should be fine)
      
      this.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

    }, undefined, (error) => {
      console.error('An error happened loading the model:', error);
    });
  }

  playAnimation(name) {
    if (!this.actions[name]) return;

    if (this.activeAction) {
      this.activeAction.fadeOut(0.5);
    }

    this.activeAction = this.actions[name];
    this.activeAction
      .reset()
      .setEffectiveTimeScale(1)
      .setEffectiveWeight(1)
      .fadeIn(0.5)
      .play();
  }

  animate() {
    if (this.mixer) {
      this.mixer.update(0.02); // Update mixer
    }
    
    if (this.isLoaded) {
      // Slowly rotate the group to show off the model
      this.group.rotation.y += 0.005;
    }
  }

  show() {
    this.group.visible = true;
  }

  hide() {
    this.group.visible = false;
  }
}
