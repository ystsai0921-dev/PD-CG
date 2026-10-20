import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CustomController } from './Controls.js?v=20261020_08';
import { CelestialGlobeModel } from '../models/CelestialGlobe.js?v=20261020_08';
import { SolarSystemModel } from '../models/SolarSystem.js?v=20261020_08';
import { HorizonModel } from '../models/HorizonModel.js?v=20261020_08';
import { ZODIAC_CONSTELLATIONS } from '../data/zodiacData.js?v=20261020_08';

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
    this.celestialViewMode = 'zenith-up'; // 'zenith-up' | 'horizon-top'

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

    // 按 Esc 鍵：除了退出左鍵輔助模式外，亦退出 L1 星座/行星閃爍高亮與詳細資訊狀態
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.clearSelectionHighlight();
      }
    });

    // 左鍵點擊選取星體或星座 (僅在未開啟左鍵輔助拖曳或未發生拖曳時觸發)
    this.renderer.domElement.addEventListener('pointerup', (e) => {
      if (e.button !== 0 || this.controls.hasDragged || this.controls.leftClickMode !== 'none') {
        return;
      }
      this._pickObject(e);
    });
  }

  clearSelectionHighlight() {
    const hadConstellationHighlight =
      this.currentScale === 'celestial' &&
      this.celestialModel &&
      this.celestialModel.activeHighlight &&
      this.celestialModel.activeHighlight.type === 'Constellation';

    if (this.celestialModel) {
      this.celestialModel.clearHighlight();
    }
    if (this.callbacks.onClearSelection) {
      this.callbacks.onClearSelection();
    }

    // 若原本因點選星座而處於適度 Zoom-in 狀態，按 Esc 時平滑退回全天球視野距離
    if (hadConstellationHighlight) {
      const currentDir = new THREE.Vector3()
        .subVectors(this.camera.position, this.controls.target)
        .normalize();
      this.controls.lookAtDirectionSmooth(currentDir, 225, new THREE.Vector3(0, 0, 0));
    }
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
    // L1 點擊到星座名時，平滑轉向該星群並適度 Zoom-in，以能清楚辨析各恆星與名字標籤
    if (
      this.currentScale === 'celestial' &&
      info &&
      info.type === 'Constellation' &&
      info.direction
    ) {
      const worldDir = info.direction.clone().applyQuaternion(this.celestialModel.group.quaternion);
      this.controls.lookAtDirectionSmooth(
        worldDir,
        info.zoomDistance || 156,
        new THREE.Vector3(0, 0, 0)
      );
    }

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
          s.detailLabel.visible = true;
          s.detailLabel.element.style.display = '';
        });
      }
    }
    if (isCelestial && this.celestialModel.zenithRotateLabel) {
      this.celestialModel.zenithRotateLabel.visible = this.celestialModel.horizonGroup.visible;
      this.celestialModel.zenithRotateLabel.element.style.display =
        this.celestialModel.horizonGroup.visible ? '' : 'none';
    }
    this.solarModel.syncLabelsVisibility(isSolar);
    this._setLabelsVisible(this.horizonModel.labels, isHorizon);

    this.resetCameraForCurrentScale();
  }

  _setLabelsVisible(labelList, visible) {
    labelList.forEach((lbl) => {
      lbl.visible = visible;
      lbl.element.style.display = visible ? '' : 'none';
    });
  }

  _getSolarFitDistance() {
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    const halfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const tanHalfFov = Math.tan(halfFovRad);
    const fitRadius = 138; // 完整納入海王星軌道 (~112.5)、標籤外延與底部導覽列安全邊距
    const distV = fitRadius / tanHalfFov;
    const distH = fitRadius / (tanHalfFov * Math.max(0.5, aspect));
    return Math.max(distV, distH, 310);
  }

  resetCameraForCurrentScale() {
    if (this.currentScale === 'celestial') {
      const pose = this._getCelestialPose();
      this.controls.setCameraPose(
        pose.position,
        pose.target,
        1.5,
        600
      );
    } else if (this.currentScale === 'solar') {
      // L2 太陽系重置視角：強制回歸太陽為中心，俯視黃道面並 zoom to fit 完整納入整個太陽系
      this.solarTargetId = 'Sun';
      if (this.callbacks.onSolarTargetChange) {
        this.callbacks.onSolarTargetChange('Sun');
      }
      const targetPos = this.solarModel.getTargetPosition('Sun');
      const fitDist = this._getSolarFitDistance();
      this.controls.setCameraPose(
        new THREE.Vector3(0, fitDist, fitDist * 0.001),
        targetPos,
        2,
        fitDist * 3
      );
      const sunItem = this.solarModel.bodyMap.Sun;
      if (sunItem && sunItem.mesh && sunItem.mesh.userData) {
        this._handleObjectSelect(sunItem.mesh.userData);
      }
    } else if (this.currentScale === 'horizon') {
      // L3 地平日月模型預設視角：以觀測平臺中心偏低視角 (0, 2.0, 0) 為 target，
      // 確保放大 (Zoom In) 時鏡頭聚焦於地基與日影，絕不飛向天空而丟失地面國旗陰影
      this.controls.setCameraPose(
        new THREE.Vector3(45, 28, 55),
        new THREE.Vector3(0, 2.0, 0),
        1.5,
        450
      );
    }
  }

  /**
   * L1 天球儀雙重視角快速切換：
   * 1. 'zenith-up': 天頂軸朝上（從側面正視天球儀，天頂垂直朝向螢幕正上方，地平圈水平橫亙中央）
   * 2. 'horizon-top': 俯視地平面（從天頂正上方俯視地平圈，呈現全天觀星盤 Planisphere 視角）
   */
  setCelestialView(viewMode, smooth = true) {
    this.celestialViewMode = viewMode;
    if (this.currentScale !== 'celestial') {
      this.setScale('celestial');
    }
    const pose = this._getCelestialPose(viewMode);
    if (smooth) {
      this.controls.setCameraPoseSmooth(pose.position, pose.target, 1.5, 600);
    } else {
      this.controls.setCameraPose(pose.position, pose.target, 1.5, 600);
    }
  }

  _getCelestialPose(viewMode = null) {
    const mode = viewMode || this.celestialViewMode || 'zenith-up';
    if (mode === 'horizon-top') {
      // 俯視地平面：從天頂正上方沿 -Y 俯視當地地平圈 (0, 0, 0)，呈現全天星盤 (Planisphere)
      return {
        position: new THREE.Vector3(0, 275, 0.001),
        target: new THREE.Vector3(0, 0, 0)
      };
    }
    // 天頂軸朝上：從側面正視天球儀，天頂旋轉軸 (+Y) 筆直朝向螢幕正上方，地平圈水平橫貫中央
    return {
      position: new THREE.Vector3(0, 36, 265),
      target: new THREE.Vector3(0, 8, 0)
    };
  }

  setSolarTarget(bodyId) {
    this.solarTargetId = bodyId;
    if (this.currentScale === 'solar') {
      const targetPos = this.solarModel.getTargetPosition(bodyId);
      const isSun = bodyId === 'Sun';
      const dist = isSun ? this._getSolarFitDistance() : 26;
      const maxDist = isSun ? dist * 3 : 650;
      const dir = new THREE.Vector3().subVectors(this.camera.position, this.controls.target).normalize();
      this.controls.setCameraPose(
        targetPos.clone().addScaledVector(dir, dist),
        targetPos,
        2,
        maxDist
      );
    }
  }

  focusZodiacConstellation(constellationId) {
    if (this.currentScale !== 'celestial') {
      this.setScale('celestial');
    }
    // 觸發該星座所有恆星閃爍高亮、顯現各顆星名字與星等，並平滑轉向與適度 Zoom-in 聚焦該星群
    this.celestialModel.selectConstellation(constellationId);
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
