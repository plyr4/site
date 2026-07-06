import * as THREE from "three";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_PEPPER = new THREE.Color("#1a8b15");
const COLOR_BAKED = new THREE.Color("#b5b5b5");
const BELL_PEPPER_HEIGHT = 0.06;
const MAX_BELL_PEPPER = 20;

const BELL_PEPPER_RINGS: { r: number; n: number }[] = [
    { r: 0.25, n: 4 },
    { r: 0.55, n: 8 },
    { r: 0.72, n: 8 },
];
const BELL_PEPPER_ANGLE_JITTER = 0.3;
const BELL_PEPPER_RADIUS_JITTER = 0.05;
const BELL_PEPPER_ARC_RADIUS = 0.1;
const BELL_PEPPER_ARC_ANGLE = Math.PI * 0.85;
const BELL_PEPPER_STRIP_HALF_WIDTH = 0.02;
const BELL_PEPPER_STRIP_HALF_HEIGHT = 0.003;
const BELL_PEPPER_SCALE_BASE = 1.0;
const BELL_PEPPER_SCALE_JITTER = 0.2;
const BELL_PEPPER_SEED_OFFSET = 0x4d555348;

function makePepperArcGeometry(): THREE.BufferGeometry {
    const segs = 8;
    const r = BELL_PEPPER_ARC_RADIUS;
    const half = BELL_PEPPER_STRIP_HALF_WIDTH;
    const halfH = BELL_PEPPER_STRIP_HALF_HEIGHT;
    const startA = -BELL_PEPPER_ARC_ANGLE / 2;
    const verts: number[] = [];
    const idxArr: number[] = [];
    for (let i = 0; i <= segs; i++) {
        const a = startA + (i / segs) * BELL_PEPPER_ARC_ANGLE;
        const co = Math.cos(a), si = Math.sin(a);
        verts.push(
            (r - half) * co, -halfH, (r - half) * si,
            (r + half) * co, -halfH, (r + half) * si,
            (r - half) * co, halfH, (r - half) * si,
            (r + half) * co, halfH, (r + half) * si,
        );
    }
    for (let i = 0; i < segs; i++) {
        const b = i * 4, n = (i + 1) * 4;
        idxArr.push(b + 2, n + 2, b + 3, b + 3, n + 2, n + 3);
        idxArr.push(b + 0, b + 1, n + 0, b + 1, n + 1, n + 0);
        idxArr.push(b + 0, n + 0, b + 2, b + 2, n + 0, n + 2);
        idxArr.push(b + 1, b + 3, n + 1, b + 3, n + 3, n + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idxArr);
    geo.computeVertexNormals();
    return geo;
}

const pepperArcGeo = makePepperArcGeometry();

interface BellPepperPlacement {
    x: number;
    z: number;
    scale: number;
    rotation: number;
}

function generatePlacements(seed: string): BellPepperPlacement[] {
    const rng = mulberry32(seedToNumber(seed) ^ BELL_PEPPER_SEED_OFFSET);
    const placements: BellPepperPlacement[] = [];
    for (const ring of BELL_PEPPER_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * BELL_PEPPER_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * BELL_PEPPER_RADIUS_JITTER;
            const scale = BELL_PEPPER_SCALE_BASE + (rng() - 0.5) * BELL_PEPPER_SCALE_JITTER;
            placements.push({ x: r * Math.cos(a), z: r * Math.sin(a), scale, rotation: rng() * Math.PI * 2 });
        }
    }
    return placements;
}

export class BellPepper implements Topping {
    readonly group = new THREE.Group();
    readonly label = "BELL PEPPER";
    count = 0;
    private readonly maxCount = MAX_BELL_PEPPER;
    private placements: BellPepperPlacement[] = [];
    private readonly matPepper = new THREE.MeshBasicMaterial({ color: COLOR_PEPPER.clone() });

    valueLabel(_model: PizzaModel): string { return String(this.count); }

    increase(model: PizzaModel): void {
        this.count = Math.min(this.maxCount, this.count + 1);
        this.sync(model);
    }

    decrease(model: PizzaModel): void {
        this.count = Math.max(0, this.count - 1);
        this.sync(model);
    }

    clear(model: PizzaModel): void { this.count = 0; this.rebuild(model); }

    rebuild(model: PizzaModel): void {
        this.count = 0;
        this.placements = generatePlacements(model.seed);
        this.group.clear();
    }

    sync(_model: PizzaModel): void {
        this.group.clear();
        const count = Math.min(this.count, this.placements.length);
        for (let i = 0; i < count; i++) {
            const { x, z, scale, rotation } = this.placements[i];
            const mesh = new THREE.Mesh(pepperArcGeo, this.matPepper);
            mesh.rotation.y = rotation;
            mesh.scale.setScalar(scale);
            mesh.position.set(x, BELL_PEPPER_HEIGHT, z);
            this.group.add(mesh);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matPepper.color.copy(COLOR_PEPPER).lerp(COLOR_PEPPER.clone().multiply(COLOR_BAKED), progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matPepper.color.copy(COLOR_PEPPER);
    }
}