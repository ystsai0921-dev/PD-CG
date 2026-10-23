import * as THREE from 'three';
import { CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { CustomController } from './Controls.js?v=20261023_01';
import { CelestialGlobeModel } from '../models/CelestialGlobe.js?v=20261023_01';
import { SolarSystemModel } from '../models/SolarSystem.js?v=20261023_01';
import { HorizonModel } from '../models/HorizonModel.js?v=20261023_01';
import { ZODIAC_CONSTELLATIONS } from '../data/zodiacData.js?v=20261023_01';

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
    this.renderer.localClippingEnabled = true;
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

    this.celestialModel = new CelestialGlobeModel(
      (info) => this._handleObjectSelect(info),
      (info) => {
        if (this.callbacks.onHoverObject) {
          this.callbacks.onHoverObject(info);
        }
      },
      () => {
        if (this.callbacks.onClearHover) {
          this.callbacks.onClearHover();
        }
      }
    );
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

    this.latestEphemeris = null;

    // 天空背景紋理生成器 (用於 L3 地平日月模型：太陽日落前藍天、日落後灰幕)
    this.skyCanvas = document.createElement('canvas');
    this.skyCanvas.width = 16;
    this.skyCanvas.height = 512;
    this.skyCtx = this.skyCanvas.getContext('2d');
    this.skyTexture = new THREE.CanvasTexture(this.skyCanvas);
    this.skyTexture.colorSpace = THREE.SRGBColorSpace;
    this._lastSkyFactor = -1;

    // 深空宇宙背景紋理 (用於 L1 天球儀與 L2 太陽系模型)
    this.spaceCanvas = document.createElement('canvas');
    this.spaceCanvas.width = 16;
    this.spaceCanvas.height = 512;
    this.spaceCtx = this.spaceCanvas.getContext('2d');
    const spaceGrad = this.spaceCtx.createLinearGradient(0, 0, 0, 512);
    spaceGrad.addColorStop(0, '#060a15');
    spaceGrad.addColorStop(0.5, '#0b1325');
    spaceGrad.addColorStop(1, '#050811');
    this.spaceCtx.fillStyle = spaceGrad;
    this.spaceCtx.fillRect(0, 0, 16, 512);
    this.spaceTexture = new THREE.CanvasTexture(this.spaceCanvas);
    this.spaceTexture.colorSpace = THREE.SRGBColorSpace;

    this.scene.background = this.spaceTexture;

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

    // 滑鼠懸停即時預覽星座/天體進一步資訊 (未拖曳時)
    this.renderer.domElement.addEventListener('pointermove', (e) => {
      if (this.controls.hasDragged || this.controls.dragState !== 'none') {
        this.clearHover();
        return;
      }
      this._onPointerHover(e);
    });
    this.renderer.domElement.addEventListener('pointerleave', () => {
      this.clearHover();
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
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      // 若處於 L1 正北朝上俯視模式，地平面以下 (world Y < -0.01) 已被裁切隱藏，不可被射線點選
      if (this.currentScale === 'celestial' && this.celestialViewMode === 'horizon-top') {
        if (hit.point.y < -0.01) continue;
      }
      const obj = hit.object;
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
      break;
    }
  }

  _onPointerHover(e) {
    if (this.currentScale !== 'celestial' || !this.celestialModel) {
      return;
    }
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const hits = this.raycaster.intersectObjects(this.celestialModel.pickables, false);
    for (let i = 0; i < hits.length; i++) {
      const hit = hits[i];
      if (this.celestialViewMode === 'horizon-top' && hit.point.y < -0.01) continue;
      const obj = hit.object;
      if (obj.userData) {
        if (obj.userData.type === 'Star' && obj.userData.constellationId) {
          this.hoverConstellation(obj.userData.constellationId);
          return;
        }
        if (obj.userData.bodyId) {
          this.hoverBody(obj.userData.bodyId);
          return;
        }
      }
      break;
    }
    this.clearHover();
  }

  hoverConstellation(constellationId) {
    if (this.currentScale === 'celestial' && this.celestialModel) {
      this.celestialModel.hoverConstellation(constellationId);
    }
  }

  hoverBody(bodyId) {
    if (this.currentScale === 'celestial' && this.celestialModel) {
      this.celestialModel.hoverBody(bodyId);
    }
  }

  clearHover() {
    if (this.currentScale === 'celestial' && this.celestialModel) {
      this.celestialModel.clearHover();
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
    if (!isCelestial || !this.celestialModel.activeHighlight) {
      this._setLabelsVisible(this.celestialModel.starDetailLabels, false);
      this.celestialModel.starDetailLabels.forEach((lbl) => {
        if (lbl.element) lbl.element.classList.remove('is-visible');
      });
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
          s.detailLabel.element.classList.add('is-visible');
        });
      }
    }
    if (isCelestial && this.celestialModel.zenithRotateLabel) {
      const showZenith = this.celestialViewMode !== 'horizon-top' && this.celestialModel.horizonGroup.visible;
      this.celestialModel.zenithRotateLabel.visible = showZenith;
      this.celestialModel.zenithRotateLabel.element.style.display = showZenith ? '' : 'none';
    }
    this.solarModel.syncLabelsVisibility(isSolar);
    this._setLabelsVisible(this.horizonModel.labels, isHorizon);

    if (isCelestial && this.celestialModel) {
      this.celestialModel.setViewMode(this.celestialViewMode || 'zenith-up');
    }

    this._updateSceneBackground();
    this.resetCameraForCurrentScale();
  }

  _updateSceneBackground() {
    if (this.currentScale === 'horizon') {
      this.scene.background = this.skyTexture;
      this._renderHorizonSkyTexture();
    } else {
      this.scene.background = this.spaceTexture;
    }
  }

  _renderHorizonSkyTexture() {
    const sunAlt = this.latestEphemeris ? this.latestEphemeris.sun.altitude : 25;

    // 依據該地理位置實時太陽仰角：
    // 太陽在日落前 (sunAlt > 0) 為藍天，日落後 (sunAlt <= 0) 為灰幕
    // 在地平線交界處 (-1.5° ~ +1.5°) 平滑過渡，提供自然真實的暮光銜接
    const factor = THREE.MathUtils.clamp((sunAlt + 1.2) / 2.4, 0, 1);
    if (Math.abs(factor - this._lastSkyFactor) < 0.002) return;
    this._lastSkyFactor = factor;

    const ctx = this.skyCtx;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);

    // 1. 藍天色彩調色盤 (Daytime Blue Sky - 太陽在日落前)：
    // 天頂深邃天青藍 -> 中空清朗大氣藍 -> 地平柔和大氣淡藍
    const dayTop = [25, 75, 155];       // #194b9b
    const dayMid = [56, 135, 222];      // #3887de
    const dayHorizon = [148, 205, 252];  // #94cdfc

    // 2. 灰幕色彩調色盤 (After Sunset Grey Curtain - 太陽在日落後)：
    // 天頂沉穩深灰石褐 -> 中空優雅石墨灰 -> 地平微灰暮色
    const nightTop = [24, 28, 36];      // #181c24
    const nightMid = [46, 54, 66];      // #2e3642
    const nightHorizon = [78, 88, 102];  // #4e5866

    // 日落/日出交界處地平微光餘暉 (Dusk Glow)
    const sunsetDusk = Math.sin(factor * Math.PI) * 0.35;

    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    const topC = [
      lerp(nightTop[0], dayTop[0], factor),
      lerp(nightTop[1], dayTop[1], factor),
      lerp(nightTop[2], dayTop[2], factor)
    ];
    const midC = [
      lerp(nightMid[0], dayMid[0], factor),
      lerp(nightMid[1], dayMid[1], factor),
      lerp(nightMid[2], dayMid[2], factor)
    ];
    const horizonC = [
      lerp(nightHorizon[0], dayHorizon[0], factor),
      lerp(nightHorizon[1], dayHorizon[1], factor),
      lerp(nightHorizon[2], dayHorizon[2], factor)
    ];

    const duskR = Math.round(sunsetDusk * 55);
    const duskG = Math.round(sunsetDusk * 20);

    const col = (c, rB = 0, gB = 0) =>
      `rgb(${Math.min(255, c[0] + rB)}, ${Math.min(255, c[1] + gB)}, ${c[2]})`;

    grad.addColorStop(0, col(topC));
    grad.addColorStop(0.52, col(midC));
    grad.addColorStop(1, col(horizonC, duskR, duskG));

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 512);
    this.skyTexture.needsUpdate = true;
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

  _getHorizonFitPose() {
    const aspect = this.container.clientWidth / (this.container.clientHeight || 1);
    const halfFovRad = THREE.MathUtils.degToRad(this.camera.fov / 2);
    const tanHalfFov = Math.tan(halfFovRad);
    const fitRadius = 94; // 完整涵蓋 DOME_RADIUS=75、天頂 Zenith (Y=78)、日月標籤 (Y=79.2) 與四方方位標籤 (R=78)
    const distV = fitRadius / tanHalfFov;
    const distH = fitRadius / (tanHalfFov * Math.max(0.5, aspect));
    const fitDist = Math.max(distV, distH, 212);

    // 視角方向：經典南偏東南向西北俯瞰 (+X, +Y, +Z)，既能縱覽東升西落全弧線與天頂，又能看清中央日晷與國旗陰影
    const dir = new THREE.Vector3(0.58, 0.38, 0.72).normalize();
    const target = new THREE.Vector3(0, 10.0, 0);
    const position = target.clone().addScaledVector(dir, fitDist);

    return { position, target, fitDist };
  }

  resetCameraForCurrentScale() {
    this.clearSelectionHighlight();
    this.clearHover();
    if (this.currentScale === 'celestial') {
      if (this.celestialModel) {
        this.celestialModel.clearHighlight();
        this.celestialModel.clearHover();
        this.celestialModel.resetZenithRotation();
        this.celestialModel.setViewMode(this.celestialViewMode || 'zenith-up');
      }
      const pose = this._getCelestialPose();
      this.controls.setCameraPoseSmooth(
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
      // L3 地平日月模型預設視角：Zoom to fit 完整納入全天球頂、地平盤、日月當日軌跡與所有方位標籤
      const fitPose = this._getHorizonFitPose();
      this.controls.setCameraPoseSmooth(
        fitPose.position,
        fitPose.target,
        1.5,
        fitPose.fitDist * 3.5
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
    // 切換 L1 視角時重置天頂軸旋轉角，並更新地平半球裁切與標籤可見性
    if (this.celestialModel) {
      this.celestialModel.resetZenithRotation();
      this.celestialModel.setViewMode(viewMode);
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
        position: new THREE.Vector3(0, 310, 0.001),
        target: new THREE.Vector3(0, 0, 0)
      };
    }
    // 天頂軸朝上：從側面水平正視天球儀，天頂旋轉軸 (+Y) 筆直朝向螢幕正上方，地平圈水平橫貫中央，預留頂部工具列呼吸空間
    return {
      position: new THREE.Vector3(0, 0, 340),
      target: new THREE.Vector3(0, 0, 0)
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
    this.latestEphemeris = ephemeris;
    this.celestialModel.update(ephemeris);
    this.solarModel.update(ephemeris);
    this.horizonModel.update(ephemeris);

    if (this.currentScale === 'horizon') {
      this._updateSceneBackground();
    }

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
