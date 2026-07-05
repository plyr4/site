import * as THREE from "three";
import { makeWavyCircle, makeWavyRing } from "./geometry";
import { ROW_H_NDC } from "./ui";
import {
    PIZZA_RADIUS,
    CRUST_WIDTH,
    SLICE_COUNT,
    type PizzaModel,
} from "./model";
import { PepperoniTopping, CheeseTopping, type Topping } from "./topping";

const PIXEL_SCALE = 0.32;
const TOSS_HEIGHT = 0;
const TOSS_PERIOD = 3.2;
const SPIN_SPEED = Math.PI * 0.08;
const BASE_FLOP = -0.1;
const MAX_FLOP = Math.PI * 0.0125;
const CAM_HEIGHT = 2.6;
const CAM_DEPTH = 5.0;
const CAM_FOV = 40;

const COLOR_BOTTOM_RAW = new THREE.Color("#7a5c2e");
const COLOR_BOTTOM_BAKED = new THREE.Color("#3d2e17");
const COLOR_CRUST_RAW = new THREE.Color("#886227");
const COLOR_CRUST_BAKED = new THREE.Color("#4a3214");
const COLOR_OUTLINE = new THREE.Color("#c78f36");

export class PizzaView {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private uiScene: THREE.Scene;
    private uiCamera: THREE.OrthographicCamera;

    private dough: THREE.Group;

    readonly pepperoniTopping = new PepperoniTopping();
    readonly cheeseTopping = new CheeseTopping();

    private matBottomFill: THREE.MeshBasicMaterial;
    private matCrustFill: THREE.MeshBasicMaterial;
    private matOutline: THREE.LineBasicMaterial;
    private matCrustLine: THREE.LineBasicMaterial;

    private uiPlane: THREE.Mesh;
    private uiTex: THREE.CanvasTexture;

    private canvas: HTMLCanvasElement;
    private currentSeed = "";
    private currentPanelH = 0;

    constructor(canvas: HTMLCanvasElement, uiTex: THREE.CanvasTexture) {
        this.canvas = canvas;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color("#0d0d0d");

        this.camera = new THREE.PerspectiveCamera(CAM_FOV, 1, 0.1, 100);
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

        const initPanelH = ROW_H_NDC;
        const initPanelY = -1.0 + initPanelH / 2;
        this.uiPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(2, initPanelH),
            new THREE.MeshBasicMaterial({ map: uiTex })
        );
        this.uiPlane.position.set(0, initPanelY, 0);
        this.currentPanelH = initPanelH;
        this.uiScene.add(this.uiPlane);
    }

    get toppings(): Topping[] {
        return [this.pepperoniTopping, this.cheeseTopping];
    }

    rebuild(model: PizzaModel): void {
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
            new THREE.CircleGeometry(PIZZA_RADIUS, 64),
            this.matBottomFill
        );
        bottomFill.rotation.x = Math.PI / 2;
        bottomFill.position.y = -0.003;
        this.dough.add(bottomFill);

        const crustFill = new THREE.Mesh(
            makeWavyRing(PIZZA_RADIUS, PIZZA_RADIUS - CRUST_WIDTH, crustVariation, crustBumps, crustPhase),
            this.matCrustFill
        );
        crustFill.position.y = -0.002;
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

    getCanvas(): HTMLCanvasElement {
        return this.canvas;
    }
}
