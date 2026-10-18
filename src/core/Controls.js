import * as THREE from 'three';

/**
 * CustomController
 * 實作 AGENTS.md 要求的操作規範：
 * 1. 基本操作：中鍵拖曳 = Orbit (旋轉)，Shift + 中鍵拖曳 = Pan (平移)，滾輪 = Zoom
 * 2. 預留兩個功能鍵 (左鍵點選可開啟 Orbit & Pan)，供無中鍵滑鼠使用
 * 3. 按下 Esc 鍵立即退出左鍵輔助模式，回到預設狀態 (左鍵僅用於點選天體/星座)
 */
export class CustomController {
  constructor(camera, domElement, onModeChange) {
    this.camera = camera;
    this.domElement = domElement;
    this.onModeChange = onModeChange || (() => {});

    // 目標中心點與球座標參數
    this.target = new THREE.Vector3(0, 0, 0);
    this.spherical = new THREE.Spherical();
    this.sphericalDelta = new THREE.Spherical();
    this.panOffset = new THREE.Vector3();

    this.minDistance = 2;
    this.maxDistance = 1200;
    this.rotateSpeed = 0.0065;
    this.zoomSpeed = 1.12;

    // 左鍵輔助模式: 'none' | 'orbit' | 'pan'
    this.leftClickMode = 'none';

    // 拖曳狀態: 'none' | 'orbit' | 'pan'
    this.dragState = 'none';
    this.pointerStart = new THREE.Vector2();
    this.pointerCurrent = new THREE.Vector2();
    this.hasDragged = false;

    this._syncFromCamera();
    this._bindEvents();
  }

  _syncFromCamera() {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
    this.spherical.setFromVector3(offset);
  }

  setCameraPose(position, target, minDistance = 2, maxDistance = 1200) {
    this.minDistance = minDistance;
    this.maxDistance = maxDistance;
    this.target.copy(target);
    this.camera.position.copy(position);
    this.camera.lookAt(this.target);
    this._syncFromCamera();
  }

  setTargetPosition(newTarget) {
    const delta = new THREE.Vector3().subVectors(newTarget, this.target);
    this.target.copy(newTarget);
    this.camera.position.add(delta);
    this._syncFromCamera();
  }

  lookAtDirection(directionVec, distance = null) {
    const dist = distance !== null ? distance : this.spherical.radius;
    const dir = directionVec.clone().normalize();
    // 從中心往該天球方向看，或將相機置於對向觀察該星座
    const newPos = this.target.clone().addScaledVector(dir, dist);
    this.camera.position.copy(newPos);
    this.camera.lookAt(this.target);
    this._syncFromCamera();
  }

  setLeftClickMode(mode) {
    if (this.leftClickMode === mode) {
      this.leftClickMode = 'none';
    } else {
      this.leftClickMode = mode;
    }
    this._updateCursor();
    this.onModeChange(this.leftClickMode);
  }

  clearLeftClickMode() {
    if (this.leftClickMode !== 'none') {
      this.leftClickMode = 'none';
      this._updateCursor();
      this.onModeChange(this.leftClickMode);
    }
  }

  _updateCursor() {
    if (this.dragState === 'orbit' || this.leftClickMode === 'orbit') {
      this.domElement.style.cursor = 'grab';
    } else if (this.dragState === 'pan' || this.leftClickMode === 'pan') {
      this.domElement.style.cursor = 'move';
    } else {
      this.domElement.style.cursor = 'default';
    }
  }

  _bindEvents() {
    this.domElement.addEventListener('pointerdown', (e) => this._onPointerDown(e));
    window.addEventListener('pointermove', (e) => this._onPointerMove(e));
    window.addEventListener('pointerup', (e) => this._onPointerUp(e));
    this.domElement.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    // 按下 Esc 退出左鍵 Orbit / Pan 輔助模式
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.dragState = 'none';
        this.clearLeftClickMode();
      }
    });
  }

  _onPointerDown(e) {
    this.hasDragged = false;
    this.pointerStart.set(e.clientX, e.clientY);

    // 中鍵 (button === 1)：Shift + 中鍵 = Pan，純中鍵 = Orbit
    if (e.button === 1) {
      e.preventDefault();
      this.dragState = e.shiftKey ? 'pan' : 'orbit';
      this._updateCursor();
      return;
    }

    // 左鍵 (button === 0)：若開啟左鍵輔助功能鍵，則執行對應之 Orbit 或 Pan
    if (e.button === 0 && this.leftClickMode !== 'none') {
      e.preventDefault();
      this.dragState = this.leftClickMode;
      this._updateCursor();
    }
  }

  _onPointerMove(e) {
    if (this.dragState === 'none') return;

    this.pointerCurrent.set(e.clientX, e.clientY);
    const deltaX = this.pointerCurrent.x - this.pointerStart.x;
    const deltaY = this.pointerCurrent.y - this.pointerStart.y;

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      this.hasDragged = true;
    }

    if (this.dragState === 'orbit') {
      this.sphericalDelta.theta -= deltaX * this.rotateSpeed;
      this.sphericalDelta.phi -= deltaY * this.rotateSpeed;
    } else if (this.dragState === 'pan') {
      this._pan(deltaX, deltaY);
    }

    this.pointerStart.copy(this.pointerCurrent);
  }

  _onPointerUp() {
    if (this.dragState !== 'none') {
      this.dragState = 'none';
      this._updateCursor();
    }
  }

  _pan(deltaX, deltaY) {
    const offset = new THREE.Vector3().subVectors(this.camera.position, this.target);
    let targetDistance = offset.length();
    targetDistance *= Math.tan(((this.camera.fov / 2) * Math.PI) / 180.0);

    const panLeft = new THREE.Vector3();
    const panUp = new THREE.Vector3();

    panLeft.setFromMatrixColumn(this.camera.matrix, 0);
    panLeft.multiplyScalar(-2 * deltaX * (targetDistance / this.domElement.clientHeight));

    panUp.setFromMatrixColumn(this.camera.matrix, 1);
    panUp.multiplyScalar(2 * deltaY * (targetDistance / this.domElement.clientHeight));

    this.panOffset.add(panLeft).add(panUp);
  }

  _onWheel(e) {
    e.preventDefault();
    if (e.deltaY < 0) {
      this.spherical.radius = Math.max(this.minDistance, this.spherical.radius / this.zoomSpeed);
    } else if (e.deltaY > 0) {
      this.spherical.radius = Math.min(this.maxDistance, this.spherical.radius * this.zoomSpeed);
    }
  }

  update() {
    this.spherical.theta += this.sphericalDelta.theta;
    this.spherical.phi += this.sphericalDelta.phi;

    // 限制極角避免翻轉
    const EPS = 0.001;
    this.spherical.phi = Math.max(EPS, Math.min(Math.PI - EPS, this.spherical.phi));
    this.spherical.radius = Math.max(this.minDistance, Math.min(this.maxDistance, this.spherical.radius));

    this.target.add(this.panOffset);

    const offset = new THREE.Vector3().setFromSpherical(this.spherical);
    this.camera.position.copy(this.target).add(offset);
    this.camera.lookAt(this.target);

    this.sphericalDelta.set(0, 0, 0);
    this.panOffset.set(0, 0, 0);
  }
}
