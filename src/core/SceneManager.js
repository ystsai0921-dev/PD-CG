import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CustomController } from './Controls.js';
import { CelestialGlobeModel } from '../models/CelestialGlobe.js';
import { SolarSystemModel } from '../models/SolarSystem.js';
import { HorizonModel } from '../models/HorizonModel.js';
import { ZODIAC_CONSTELLATIONS } from '../data/zodiacData.js';

export class SceneManager {
  constructor(container, callbacks) {
    this.container = container;
    this.callbacks = callbacks || {};

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      48,
      container.clientWidth / container.clientHeight,
      0.5,
      3000
    );

    // WebGL 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    // CSS2D 標籤渲染器 (用於呈現星座繁體中文+英文名稱標籤)
    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize(container.clientWidth, container.clientHeight);
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    this.labelRenderer.domElement.style.left = '0px';
    this.labelRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.labelRenderer.domElement);

    // 環境光源
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(80, 120, 60);
    this.scene.add(dirLight);

    // 自訂滑鼠控制器 (中鍵 Orbit、Shift+中鍵 Pan、左鍵切換鈕、Esc 退出)
    this.controls = new CustomController(this.camera, this.renderer.domElement, (mode) => {
      if (this.callbacks.onControlModeChange) {
        this.callbacks.onControlModeChange(mode);
      }
    });

    // 建立三個尺度的模型實例
    this.currentScale = 'celestial'; // 'celestial' | 'solar' | 'horizon'
    this.solarTargetId = 'Sun';

    this.celestialModel = new CelestialGlobeModel((info) => this._handleObjectSelect(info));
    this.solarModel = new SolarSystemModel((bodyId, info) => {
      if (bodyId) {
        this.setSolarTarget(bodyId);
        if (this.callbacks.onSolarTargetChange) {
          this.callbacks.onSolarTargetChange(bodyId);
        }
      }
      this._handleObjectSelect(info);
    });
    this.horizonModel = new HorizonModel((info) => this._handleObjectSelect(info));

    this.scene.add(this.celestialModel.group);
    this.scene.add(this.solarModel.group);
    this.scene.add(this.horizonModel.group);

    this.raycaster = new THREE.Raycaster();
    this.mouseNDC = new THREE.Vector2();

    this.setScale('celestial');
    this._bindEvents();
  }

  _bindEvents() {
    window.addEventListener('resize', () => this._onResize());

    // 左鍵點擊選取星體或星座 (僅在未開啟左鍵輔助拖曳或未發生拖曳時觸發)
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || this.controls.hasDragged || this.controls.leftClickMode !== 'none') {
        return;
      }
      this._pickObject(e);
    });
  }

  _onResize() {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.labelRenderer.setSize(w, h);
  }

  _pickObject(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    let activePickables = [];
    if (this.currentScale === 'celestial') activePickables = this.celestialModel.pickables;
    else if (this.currentScale === 'solar') activePickables = this.solarModel.pickables;
    else if (this.currentScale === 'horizon') activePickables = this.horizonModel.pickables;

    const hits = this.raycaster.intersectObjects(activePickables, false);
    if (hits.length > 0) {
      const obj = hits[0].object;
      if (obj.userData) {
        if (this.currentScale === 'celestial') {
          if (obj.userData.isZenithRotator) {
            this.celestialModel.rotateAroundZenithBy90();
            return;
          }
          if (obj.userData.type === 'Star') {
            this.celestialModel.selectStar(obj.userData);
            return;
          }
          if (obj.userData.bodyId && this.celestialModel.dynamicBodyMap[obj.userData.bodyId]) {
            this.celestialModel.selectDynamicBody(obj.userData.bodyId);
            return;
          }
        }
        if (this.currentScale === 'solar' && obj.userData.bodyId) {
          this.setSolarTarget(obj.userData.bodyId);
          if (this.callbacks.onSolarTargetChange) {
            this.callbacks.onSolarTargetChange(obj.userData.bodyId);
          }
        }
        this._handleObjectSelect(obj.userData);
      }
    }
  }

  _handleObjectSelect(info) {
    if (this.callbacks.onSelectObject) {
      this.callbacks.onSelectObject(info);
    }
  }

  setScale(scaleName) {
    this.currentScale = scaleName;

    const isCelestial = scaleName === 'celestial';
    const isSolar = scaleName === 'solar';
    const isHorizon = scaleName === 'horizon';

    this.celestialModel.group.visible = isCelestial;
    this.solarModel.group.visible = isSolar;
    this.horizonModel.group.visible = isHorizon;

    // 隱藏非當前尺度的 CSS2D 標籤
    this._setLabelsVisible(this.celestialModel.labels, isCelestial && this.celestialLabelsEnabled !== false);
    if (!isCelestial) {
      this._setLabelsVisible(this.celestialModel.starDetailLabels, false);
    } else if (
      this.celestialModel.activeHighlight &&
      this.celestialModel.activeHighlight.type === 'Constellation'
    ) {
      const cEntry =
        this.celestialModel.constellationMap[this.celestialModel.activeHighlight.constellationId];
      if (cEntry) {
        cEntry.starEntries.forEach((s) => {
          s.detailLabel.element.style.display = '';
        });
      }
    }
    if (isCelestial && this.celestialModel.zenithRotateLabel) {
      this.celestialModel.zenithRotateLabel.element.style.display =
        this.celestialModel.horizonGroup.visible ? '' : 'none';
    }
    this.solarModel.syncLabelsVisibility(isSolar);
    this._setLabelsVisible(this.horizonModel.labels, isHorizon);

    this.resetCameraForCurrentScale();
  }

  _setLabelsVisible(labelList, visible) {
    labelList.forEach((lbl) => {
      lbl.element.style.display = visible ? '' : 'none';
    });
  }

  resetCameraForCurrentScale() {
    if (this.currentScale === 'celestial') {
      // L1 天球儀預設視角：從天球外斜上方俯視地球與黃道十二宮，亦可滾輪拉近到地球內部往外看
      this.controls.setCameraPose(
        new THREE.Vector3(0, 75, 215),
        new THREE.Vector3(0, 0, 0),
        1.5,
        600
      );
    } else if (this.currentScale === 'solar') {
      // L2 太陽系預設視角：聚焦於當前選定的太陽/行星/衛星視點
      const targetPos = this.solarModel.getTargetPosition(this.solarTargetId);
      const offset = this.solarTargetId === 'Sun'
        ? new THREE.Vector3(0, 95, 145)
        : new THREE.Vector3(0, 14, 24);
      this.controls.setCameraPose(
        targetPos.clone().add(offset),
        targetPos,
        2,
        650
      );
    } else if (this.currentScale === 'horizon') {
      // L3 地平日月模型預設視角：從地平圈東南側俯視觀測平台與日月升落弧線
      this.controls.setCameraPose(
        new THREE.Vector3(95, 65, 115),
        new THREE.Vector3(0, 10, 0),
        5,
        450
      );
    }
  }

  setSolarTarget(bodyId) {
    this.solarTargetId = bodyId;
    if (this.currentScale === 'solar') {
      const targetPos = this.solarModel.getTargetPosition(bodyId);
      const dist = bodyId === 'Sun' ? 140 : 22;
      const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      this.controls.setCameraPose(
        targetPos.clone().addScaledVector(dir, dist),
        targetPos,
        2,
        650
      );
    }
  }

  focusZodiacConstellation(constellationId) {
    if (this.currentScale !== 'celestial') {
      this.setScale('celestial');
    }
    const found = ZODIAC_CONSTELLATIONS.find((c) => c.id === constellationId);
    if (found && found.centerDirection) {
      // 將相機移至從地球往該星座延伸的外側位置，正面觀看該黃道星座與中心地球（並考慮天頂軸旋轉後的姿態）
      const worldDir = found.centerDirection.clone().applyQuaternion(this.celestialModel.group.quaternion);
      this.controls.lookAtDirection(worldDir, 210);
      // 同步觸發該星座所有恆星閃爍高亮並顯現各顆星名字與星等
      this.celestialModel.selectConstellation(constellationId);
    }
  }

  updateEphemeris(ephemeris) {
    this.celestialModel.update(ephemeris);
    this.solarModel.update(ephemeris);
    this.horizonModel.update(ephemeris);

    // 若處於 Level 2 太陽系模式，讓相機中心持續跟隨所選行星或衛星
    if (this.currentScale === 'solar') {
      const targetPos = this.solarModel.getTargetPosition(this.solarTargetId);
      this.controls.setTargetPosition(targetPos);
    }
  }

  renderLoop() {
    requestAnimationFrame(() => this.renderLoop());
    if (this.currentScale === 'celestial' && this.celestialModel) {
      this.celestialModel.animateZenithRotation();
    } else if (this.currentScale === 'horizon' && this.horizonModel) {
      this.horizonModel.animateFlagAndShadow(performance.now() * 0.001);
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
  }
}
