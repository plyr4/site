import * as THREE from "three";
import { makeWavyCircle, makeWavyRing } from "./geometry";
import { ROW_H_NDC, MAX_ROWS } from "./ui";
import {
    PIZZA_RADIUS,
    CRUST_WIDTH,
    type PizzaModel,
} from "./model";
import * as Toppings from "./toppings";
import type { Topping } from "./toppings/topping";

const PIXEL_SCALE = 0.32;

const HEAT_CANVAS_SIZE = 32;
const HEAT_PULSE_A_FREQ = 0.7;
const HEAT_PULSE_B_FREQ = 1.3;
const HEAT_PULSE_A_AMP = 0.08;
const HEAT_PULSE_B_AMP = 0.05;
const HEAT_BASE_OPACITY = 0.72;
const HEAT_FADE_DURATION = 1.4;
const HEAT_BAND_REACH = 0.3;
const HEAT_STOP_MID = 0.3;
const HEAT_STOP_FAR = 0.65;
const HEAT_COLOR_EDGE = "rgba(170,0,0,1.0)";
const HEAT_COLOR_MID = "rgba(150, 0, 0, 0.29)";
const HEAT_COLOR_FAR = "rgba(100,0,0,0.1)";
const HEAT_COLOR_NONE = "rgba(0,0,0,0)";
const TOSS_HEIGHT = 0;
const TOSS_PERIOD = 3.2;
const SPIN_SPEED = Math.PI * 0.08;
const BASE_FLOP = -0.1;
const MAX_FLOP = Math.PI * 0.0125;
const CAM_HEIGHT = 2.6;
const CAM_DEPTH = 5.0;
const CAM_FOV = 40;

const BOTTOM_MESH_SEGMENTS = 64;
const BOTTOM_Y_OFFSET = -0.003;
const CRUST_FILL_Y_OFFSET = -0.002;

const STEAM_RADIUS_MIN = 0.1;
const STEAM_RADIUS_MARGIN = 0.15;
const STEAM_PERIOD_MIN = 2.5;
const STEAM_PERIOD_RANGE = 4.0;
const STEAM_HEIGHT_MIN = 0.22;
const STEAM_HEIGHT_RANGE = 0.24;
const STEAM_WOBBLE_FREQ_MIN = 1.0;
const STEAM_WOBBLE_FREQ_RANGE = 3.0;
const STEAM_WOBBLE_SPEED_MIN = 1.0;
const STEAM_WOBBLE_SPEED_RANGE = 2.5;
const STEAM_OPACITY_MIN = 0.3;
const STEAM_OPACITY_RANGE = 0.35;
const STEAM_FADE_IN_RATE = 5;
const STEAM_GLOBAL_FADE_IN_DURATION = 4;
const STEAM_FADE_OUT_START = 0.65;
const STEAM_FADE_OUT_DURATION = 0.35;
const STEAM_WOBBLE_PATH_FREQ = 3;

const COLOR_BOTTOM_RAW = new THREE.Color("#7a5c2e");
const COLOR_BOTTOM_BAKED = new THREE.Color("#3d2e17");
const COLOR_CRUST_RAW = new THREE.Color("#a2742f");
const COLOR_CRUST_BAKED = new THREE.Color("#4a3214");
const COLOR_OUTLINE = new THREE.Color("#c78f36");

const N_STEAM = 4;
const STEAM_SEGS = 4;
const STEAM_RISE = 0.55;
const STEAM_WOBBLE = 0.035;
const STEAM_COLOR = new THREE.Color("#d4c8b0");

export class PizzaView {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private uiScene: THREE.Scene;
    private uiCamera: THREE.OrthographicCamera;

    private dough: THREE.Group;
    public cheese: Topping;
    public toppings: Topping[];
    public allToppings: Topping[];

    private matBottomFill: THREE.MeshBasicMaterial;
    private matCrustFill: THREE.MeshBasicMaterial;
    private matOutline: THREE.LineBasicMaterial;
    private matCrustLine: THREE.LineBasicMaterial;

    private uiPlane: THREE.Mesh | null = null;
    private topUiPlane: THREE.Mesh | null = null;
    private uiTex: THREE.CanvasTexture | null;
    private heatMat: THREE.MeshBasicMaterial | null = null;
    private heatActive = false;
    private heatFadeEndTime = -1;
    private heatFadeFromOpacity = 0;

    private canvas: HTMLCanvasElement;
    private currentSeed = "";
    private currentPizzaScale = 1.0;
    private steamActive = false;
    private steamStartTime = -1;
    private steamLines: Array<{
        line: THREE.Line;
        geo: THREE.BufferGeometry;
        mat: THREE.LineBasicMaterial;
        positions: Float32Array;
        baseX: number;
        baseZ: number;
        phase: number;
        period: number;
        height: number;
        wobbleFreq: number;
        wobbleSpeed: number;
        wobbleAngle: number;
        maxOpacity: number;
        prevTCycle: number;
    }> = [];

    constructor(canvas: HTMLCanvasElement, uiTex: THREE.CanvasTexture | null, zoom = 1, topUiTex: THREE.CanvasTexture | null = null) {
        this.canvas = canvas;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("#0d0d0d");

        this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
        this.camera.zoom = zoom;
        this.camera.position.set(0, CAM_HEIGHT, CAM_DEPTH);
        this.camera.lookAt(0, TOSS_HEIGHT / 2, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.autoClear = false;

        this.cheese = Toppings.cheese();
        this.toppings = Toppings.otherToppings();
        this.allToppings = [this.cheese, ...this.toppings];

        this.matBottomFill = new THREE.MeshBasicMaterial({ color: COLOR_BOTTOM_RAW.clone() });
        this.matCrustFill = new THREE.MeshBasicMaterial({ color: COLOR_CRUST_RAW.clone() });
        this.matOutline = new THREE.LineBasicMaterial({ color: COLOR_OUTLINE });
        this.matCrustLine = new THREE.LineBasicMaterial({ color: COLOR_CRUST_RAW.clone() });
        this.dough = new THREE.Group();
        this.scene.add(this.dough);

        this.uiScene = new THREE.Scene();
        this.uiCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
        this.uiTex = uiTex;

        const heatCanvas = document.createElement("canvas");
        heatCanvas.width = HEAT_CANVAS_SIZE;
        heatCanvas.height = HEAT_CANVAS_SIZE;
        const heatCtx = heatCanvas.getContext("2d")!;
        const s = HEAT_CANVAS_SIZE;
        const topGrad = heatCtx.createLinearGradient(0, 0, 0, s * HEAT_BAND_REACH);
        topGrad.addColorStop(0.0, HEAT_COLOR_EDGE);
        topGrad.addColorStop(HEAT_STOP_MID, HEAT_COLOR_MID);
        topGrad.addColorStop(HEAT_STOP_FAR, HEAT_COLOR_FAR);
        topGrad.addColorStop(1.0, HEAT_COLOR_NONE);
        heatCtx.fillStyle = topGrad;
        heatCtx.fillRect(0, 0, s, s);
        const botGrad = heatCtx.createLinearGradient(0, s, 0, s * (1 - HEAT_BAND_REACH));
        botGrad.addColorStop(0.0, HEAT_COLOR_EDGE);
        botGrad.addColorStop(HEAT_STOP_MID, HEAT_COLOR_MID);
        botGrad.addColorStop(HEAT_STOP_FAR, HEAT_COLOR_FAR);
        botGrad.addColorStop(1.0, HEAT_COLOR_NONE);
        heatCtx.fillStyle = botGrad;
        heatCtx.fillRect(0, 0, s, s);
        const heatTex = new THREE.CanvasTexture(heatCanvas);
        heatTex.generateMipmaps = false;
        heatTex.magFilter = THREE.NearestFilter;
        heatTex.minFilter = THREE.NearestFilter;
        this.heatMat = new THREE.MeshBasicMaterial({ map: heatTex, transparent: true, opacity: 0, depthWrite: false });
        const heatPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.heatMat);
        heatPlane.renderOrder = 0;
        this.uiScene.add(heatPlane);

        if (uiTex !== null) {
            const initPanelH = ROW_H_NDC * MAX_ROWS;
            const initPanelY = -1.0 + initPanelH / 2;
            this.uiPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(2, initPanelH),
                new THREE.MeshBasicMaterial({ map: uiTex, transparent: true, depthWrite: false })
            );
            this.uiPlane.position.set(0, initPanelY, 0);
            this.uiPlane.renderOrder = 1;
            this.uiScene.add(this.uiPlane);
        }

        if (topUiTex !== null) {
            const topPanelH = ROW_H_NDC;
            const topPanelY = 1.0 - topPanelH / 2;
            this.topUiPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(2, topPanelH),
                new THREE.MeshBasicMaterial({ map: topUiTex, transparent: true, depthWrite: false })
            );
            this.topUiPlane.position.set(0, topPanelY, 0);
            this.topUiPlane.renderOrder = 1;
            this.uiScene.add(this.topUiPlane);
        }
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    dispose(): void {
        this.stopSteam();
        this.renderer.dispose();
    }

    setDefaultToppings(model: PizzaModel): void {
        this.cheese.count = 3;

        this.toppings[0].count = 20;
        this.toppings[0].sync(model);
        this.toppings[1].count = 12;
        this.toppings[1].sync(model);
        this.toppings[2].count = 12;
        this.toppings[2].sync(model);
        this.toppings[4].count = 12;
        this.toppings[4].sync(model);
    }

    rebuild(model: PizzaModel): void {
        this.stopSteam();
        if (this.currentSeed === model.seed) return;
        this.currentSeed = model.seed;
        this.currentPizzaScale = model.pizzaScale;
        this.dough.scale.setScalar(model.pizzaScale);

        const { crustVariation, crustBumps, crustPhase, sliceAngles } = model;

        while (this.dough.children.length > 0) {
            const child = this.dough.children[0];
            if (child instanceof THREE.Mesh || child instanceof THREE.Line || child instanceof THREE.LineLoop) {
                child.geometry.dispose();
            }
            this.dough.remove(child);
        }

        const bottomFill = new THREE.Mesh(
            new THREE.CircleGeometry(PIZZA_RADIUS, BOTTOM_MESH_SEGMENTS),
            this.matBottomFill
        );
        bottomFill.rotation.x = Math.PI / 2;
        bottomFill.position.y = BOTTOM_Y_OFFSET;
        this.dough.add(bottomFill);

        const crustFill = new THREE.Mesh(
            makeWavyRing(PIZZA_RADIUS, PIZZA_RADIUS - CRUST_WIDTH, crustVariation, crustBumps, crustPhase),
            this.matCrustFill
        );
        crustFill.position.y = CRUST_FILL_Y_OFFSET;
        this.dough.add(crustFill);

        this.cheese.rebuild(model);
        this.dough.add(this.cheese.group);

        this.dough.add(new THREE.LineLoop(
            makeWavyCircle(PIZZA_RADIUS * 0.99, crustVariation, crustBumps / 3, crustPhase),
            this.matCrustLine
        ));
        this.dough.add(new THREE.LineLoop(
            makeWavyCircle(PIZZA_RADIUS - CRUST_WIDTH, crustVariation, crustBumps, crustPhase),
            this.matOutline
        ));

        for (let i = 0; i < sliceAngles.length; i++) {
            const a = sliceAngles[i];
            const r = (PIZZA_RADIUS - CRUST_WIDTH) + crustVariation * Math.sin(crustBumps * a + crustPhase);
            const geo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)),
            ]);
            this.dough.add(new THREE.Line(geo, this.matOutline));
        }

        this.toppings.forEach(topping => {
            console.log(`Rebuilding topping: ${topping.label} with count ${topping.count}`);
            topping.rebuild(model);
            this.dough.add(topping.group);
        });

        this.resetMaterialColors(model);
    }

    private resetMaterialColors(model: PizzaModel): void {
        this.matBottomFill.color.copy(COLOR_BOTTOM_RAW);
        this.matCrustFill.color.copy(COLOR_CRUST_RAW);
        this.matCrustLine.color.copy(COLOR_CRUST_RAW);
        this.cheese.resetColors(model);
        this.toppings.forEach(topping => topping.resetColors(model));
    }

    applyBakingColors(progress: number, model: PizzaModel): void {
        this.matBottomFill.color.copy(COLOR_BOTTOM_RAW).lerp(COLOR_BOTTOM_BAKED, progress);
        this.matCrustFill.color.copy(COLOR_CRUST_RAW).lerp(COLOR_CRUST_BAKED, progress);
        this.matCrustLine.color.copy(COLOR_CRUST_RAW).lerp(COLOR_CRUST_BAKED, progress);
        this.cheese.bake(progress, model);
        this.toppings.forEach(topping => topping.bake(progress, model));
    }

    render(model: PizzaModel, time: number): void {
        const t = time / 1000;
        const tossPhase = (2 * Math.PI * t) / TOSS_PERIOD;
        this.dough.position.y = TOSS_HEIGHT * (1 - Math.cos(tossPhase)) / 2;
        this.dough.rotation.y = SPIN_SPEED * t;
        this.dough.rotation.x = BASE_FLOP + MAX_FLOP * Math.sin(tossPhase / 2);

        if (this.heatMat) {
            if (this.heatActive) {
                const pulse = (Math.sin(t * Math.PI * 2 * HEAT_PULSE_A_FREQ) * HEAT_PULSE_A_AMP
                    + Math.sin(t * Math.PI * 2 * HEAT_PULSE_B_FREQ) * HEAT_PULSE_B_AMP) * model.bakingProgress;
                this.heatMat.opacity = (HEAT_BASE_OPACITY + pulse) * model.bakingProgress;
            } else if (this.heatFadeEndTime === -2) {
                this.heatFadeEndTime = time + HEAT_FADE_DURATION * 1000;
                this.heatMat.opacity = this.heatFadeFromOpacity;
            } else if (this.heatFadeEndTime > 0) {
                const frac = Math.max(0, (this.heatFadeEndTime - time) / (HEAT_FADE_DURATION * 1000));
                this.heatMat.opacity = this.heatFadeFromOpacity * frac;
                if (frac <= 0) this.heatFadeEndTime = -1;
            } else {
                this.heatMat.opacity = 0;
            }
        }

        this.updateSteam(t);
        this.resize();
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        this.renderer.clearDepth();
        this.renderer.render(this.uiScene, this.uiCamera);
    }

    private resize(): void {
        const w = Math.floor(this.canvas.clientWidth * PIXEL_SCALE);
        const h = Math.floor(this.canvas.clientHeight * PIXEL_SCALE);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    startHeat(): void {
        this.heatActive = true;
        this.heatFadeEndTime = -1;
    }

    stopHeat(): void {
        this.heatActive = false;
        this.heatFadeFromOpacity = this.heatMat?.opacity ?? 0;
        this.heatFadeEndTime = -2;
    }

    startSteam(): void {
        this.stopSteam();
        const scaledRadius = PIZZA_RADIUS * this.currentPizzaScale;
        for (let i = 0; i < N_STEAM; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = STEAM_RADIUS_MIN + Math.random() * (scaledRadius - CRUST_WIDTH - STEAM_RADIUS_MARGIN);
            const positions = new Float32Array((STEAM_SEGS + 1) * 3);
            const geo = new THREE.BufferGeometry();
            geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.LineBasicMaterial({ color: STEAM_COLOR, transparent: true, opacity: 0 });
            const line = new THREE.Line(geo, mat);
            this.scene.add(line);
            this.steamLines.push({
                line, geo, mat, positions,
                baseX: r * Math.cos(angle),
                baseZ: r * Math.sin(angle),
                phase: Math.random(),
                period: STEAM_PERIOD_MIN + Math.random() * STEAM_PERIOD_RANGE,
                height: STEAM_HEIGHT_MIN + Math.random() * STEAM_HEIGHT_RANGE,
                wobbleFreq: STEAM_WOBBLE_FREQ_MIN + Math.random() * STEAM_WOBBLE_FREQ_RANGE,
                wobbleSpeed: STEAM_WOBBLE_SPEED_MIN + Math.random() * STEAM_WOBBLE_SPEED_RANGE,
                wobbleAngle: Math.random() * Math.PI * 2,
                maxOpacity: STEAM_OPACITY_MIN + Math.random() * STEAM_OPACITY_RANGE,
                prevTCycle: 0,
            });
        }
        this.steamActive = true;
        this.steamStartTime = -1;
    }

    stopSteam(): void {
        for (const s of this.steamLines) {
            s.geo.dispose();
            s.mat.dispose();
            this.scene.remove(s.line);
        }
        this.steamLines = [];
        this.steamActive = false;
    }

    private updateSteam(t: number): void {
        if (!this.steamActive) return;
        if (this.steamStartTime < 0) this.steamStartTime = t;
        const globalFade = Math.min(1, (t - this.steamStartTime) / STEAM_GLOBAL_FADE_IN_DURATION);
        for (const s of this.steamLines) {
            const tCycle = (t / s.period + s.phase) % 1;
            if (tCycle < s.prevTCycle) {
                const angle = Math.random() * Math.PI * 2;
                const scaledRadius = PIZZA_RADIUS * this.currentPizzaScale;
                const r = STEAM_RADIUS_MIN + Math.random() * (scaledRadius - CRUST_WIDTH - STEAM_RADIUS_MARGIN);
                s.baseX = r * Math.cos(angle);
                s.baseZ = r * Math.sin(angle);
                s.wobbleAngle = Math.random() * Math.PI * 2;
                s.height = STEAM_HEIGHT_MIN + Math.random() * STEAM_HEIGHT_RANGE;
                s.wobbleFreq = STEAM_WOBBLE_FREQ_MIN + Math.random() * STEAM_WOBBLE_FREQ_RANGE;
            }
            s.prevTCycle = tCycle;
            const baseY = tCycle * STEAM_RISE;
            for (let i = 0; i <= STEAM_SEGS; i++) {
                const p = i / STEAM_SEGS;
                const wobble = Math.sin(p * Math.PI * STEAM_WOBBLE_PATH_FREQ * s.wobbleFreq + t * s.wobbleSpeed + s.phase * Math.PI * 2) * STEAM_WOBBLE;
                s.positions[i * 3 + 0] = s.baseX + Math.cos(s.wobbleAngle) * wobble;
                s.positions[i * 3 + 1] = baseY + p * s.height;
                s.positions[i * 3 + 2] = s.baseZ + Math.sin(s.wobbleAngle) * wobble;
            }
            (s.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
            const fadeIn = Math.min(1, tCycle * STEAM_FADE_IN_RATE);
            const fadeOut = 1 - Math.max(0, (tCycle - STEAM_FADE_OUT_START) / STEAM_FADE_OUT_DURATION);
            s.mat.opacity = globalFade * fadeIn * fadeOut * s.maxOpacity;
        }
    }
}
