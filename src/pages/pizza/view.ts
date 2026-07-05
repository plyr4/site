import * as THREE from "three";
import { makeWavyCircle, makeWavyRing } from "./geometry";
import { ROW_H_NDC, MAX_ROWS } from "./ui";
import {
    PIZZA_RADIUS,
    CRUST_WIDTH,
    SLICE_COUNT,
    type PizzaModel,
} from "./model";
import type { Topping } from "./toppings/topping";
import Toppings from "./toppings";

const PIXEL_SCALE = 0.32;
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
const STEAM_COLOR = new THREE.Color("#d4c8b071");

export class PizzaView {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private uiScene: THREE.Scene;
    private uiCamera: THREE.OrthographicCamera;

    private dough: THREE.Group;

    readonly pepperoniTopping = new Toppings.Pepperoni();
    readonly cheeseTopping = new Toppings.Cheese();

    private matBottomFill: THREE.MeshBasicMaterial;
    private matCrustFill: THREE.MeshBasicMaterial;
    private matOutline: THREE.LineBasicMaterial;
    private matCrustLine: THREE.LineBasicMaterial;

    private uiPlane: THREE.Mesh | null = null;
    private uiTex: THREE.CanvasTexture | null;

    private canvas: HTMLCanvasElement;
    private currentSeed = "";
    private steamActive = false;
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

    constructor(canvas: HTMLCanvasElement, uiTex: THREE.CanvasTexture | null, zoom = 1) {
        this.canvas = canvas;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("#0d0d0d");

        this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
        this.camera.zoom = zoom;
        this.camera.position.set(0, CAM_HEIGHT, CAM_DEPTH);
        this.camera.lookAt(0, TOSS_HEIGHT / 2, 0);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
        this.renderer.autoClear = false;

        this.matBottomFill = new THREE.MeshBasicMaterial({ color: COLOR_BOTTOM_RAW.clone() });
        this.matCrustFill = new THREE.MeshBasicMaterial({ color: COLOR_CRUST_RAW.clone() });
        this.matOutline = new THREE.LineBasicMaterial({ color: COLOR_OUTLINE });
        this.matCrustLine = new THREE.LineBasicMaterial({ color: COLOR_CRUST_RAW.clone() });

        this.dough = new THREE.Group();
        this.scene.add(this.dough);

        this.uiScene = new THREE.Scene();
        this.uiCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
        this.uiTex = uiTex;

        if (uiTex !== null) {
            const initPanelH = ROW_H_NDC * MAX_ROWS;
            const initPanelY = -1.0 + initPanelH / 2;
            this.uiPlane = new THREE.Mesh(
                new THREE.PlaneGeometry(2, initPanelH),
                new THREE.MeshBasicMaterial({ map: uiTex, transparent: true, depthWrite: false })
            );
            this.uiPlane.position.set(0, initPanelY, 0);
            this.uiScene.add(this.uiPlane);
        }
    }

    get toppings(): Topping[] {
        return [this.pepperoniTopping, this.cheeseTopping];
    }

    rebuild(model: PizzaModel): void {
        this.stopSteam();
        if (this.currentSeed === model.seed) return;
        this.currentSeed = model.seed;

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

        this.cheeseTopping.rebuild(model);
        this.dough.add(this.cheeseTopping.group);

        this.dough.add(new THREE.LineLoop(
            makeWavyCircle(PIZZA_RADIUS, crustVariation, crustBumps / 3, crustPhase),
            this.matCrustLine
        ));
        this.dough.add(new THREE.LineLoop(
            makeWavyCircle(PIZZA_RADIUS - CRUST_WIDTH, crustVariation, crustBumps, crustPhase),
            this.matOutline
        ));

        for (let i = 0; i < SLICE_COUNT; i++) {
            const a = sliceAngles[i];
            const r = (PIZZA_RADIUS - CRUST_WIDTH) + crustVariation * Math.sin(crustBumps * a + crustPhase);
            const geo = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, 0),
                new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)),
            ]);
            this.dough.add(new THREE.Line(geo, this.matOutline));
        }

        this.pepperoniTopping.rebuild(model);
        this.dough.add(this.pepperoniTopping.group);

        this.resetMaterialColors(model);
    }

    private resetMaterialColors(model: PizzaModel): void {
        this.matBottomFill.color.copy(COLOR_BOTTOM_RAW);
        this.matCrustFill.color.copy(COLOR_CRUST_RAW);
        this.matCrustLine.color.copy(COLOR_CRUST_RAW);
        this.cheeseTopping.resetColors(model);
        this.pepperoniTopping.resetColors(model);
    }

    applyBakingColors(progress: number, model: PizzaModel): void {
        this.matBottomFill.color.copy(COLOR_BOTTOM_RAW).lerp(COLOR_BOTTOM_BAKED, progress);
        this.matCrustFill.color.copy(COLOR_CRUST_RAW).lerp(COLOR_CRUST_BAKED, progress);
        this.matCrustLine.color.copy(COLOR_CRUST_RAW).lerp(COLOR_CRUST_BAKED, progress);
        this.cheeseTopping.bake(progress, model);
        this.pepperoniTopping.bake(progress, model);
    }

    render(_model: PizzaModel, time: number): void {
        const t = time / 1000;
        const tossPhase = (2 * Math.PI * t) / TOSS_PERIOD;
        this.dough.position.y = TOSS_HEIGHT * (1 - Math.cos(tossPhase)) / 2;
        this.dough.rotation.y = SPIN_SPEED * t;
        this.dough.rotation.x = BASE_FLOP + MAX_FLOP * Math.sin(tossPhase / 2);

        this.updateSteam(t);
        this.resize();
        this.renderer.clear();
        this.renderer.render(this.scene, this.camera);
        if (this.uiTex !== null) {
            this.renderer.clearDepth();
            this.renderer.render(this.uiScene, this.uiCamera);
        }
    }

    private resize(): void {
        const w = Math.floor(this.canvas.clientWidth * PIXEL_SCALE);
        const h = Math.floor(this.canvas.clientHeight * PIXEL_SCALE);
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }

    startSteam(): void {
        this.stopSteam();
        for (let i = 0; i < N_STEAM; i++) {
            const angle = Math.random() * Math.PI * 2;
            const r = STEAM_RADIUS_MIN + Math.random() * (PIZZA_RADIUS - CRUST_WIDTH - STEAM_RADIUS_MARGIN);
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
        for (const s of this.steamLines) {
            const tCycle = (t / s.period + s.phase) % 1;
            if (tCycle < s.prevTCycle) {
                const angle = Math.random() * Math.PI * 2;
                const r = STEAM_RADIUS_MIN + Math.random() * (PIZZA_RADIUS - CRUST_WIDTH - STEAM_RADIUS_MARGIN);
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
            s.mat.opacity = fadeIn * fadeOut * s.maxOpacity;
        }
    }

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }

    dispose(): void {
        this.stopSteam();
        this.renderer.dispose();
    }
}
