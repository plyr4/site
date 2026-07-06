import * as THREE from "three";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_BANANA_PEPPER = new THREE.Color("#c8a800");
const COLOR_BAKED = new THREE.Color("#b5b5b5");
const BANANA_PEPPER_HEIGHT = 0.07;
const MAX_BANANA_PEPPER = 20;

const BANANA_PEPPER_RINGS: { r: number; n: number }[] = [
    { r: 0.25, n: 4 },
    { r: 0.55, n: 8 },
    { r: 0.72, n: 8 },
];
const BANANA_PEPPER_ANGLE_JITTER = 0.3;
const BANANA_PEPPER_RADIUS_JITTER = 0.05;
const BANANA_PEPPER_BASE_OUTER_RADIUS = 0.068;
const BANANA_PEPPER_BASE_INNER_RADIUS = 0.044;
const BANANA_PEPPER_RING_HALF_HEIGHT = 0.011;
const BANANA_PEPPER_WAVE_AMPLITUDE = 0.010;
const BANANA_PEPPER_WAVE_FREQ = 6;
const BANANA_PEPPER_WAVE_SEGS = 28;
const BANANA_PEPPER_SCALE_BASE = 1.0;
const BANANA_PEPPER_SCALE_JITTER = 0.25;
const BANANA_PEPPER_SEED_OFFSET = 0x42414e41;

function makeBananaPepperRingGeometry(): THREE.BufferGeometry {
    const segs = BANANA_PEPPER_WAVE_SEGS;
    const roBase = BANANA_PEPPER_BASE_OUTER_RADIUS;
    const riBase = BANANA_PEPPER_BASE_INNER_RADIUS;
    const amp = BANANA_PEPPER_WAVE_AMPLITUDE;
    const freq = BANANA_PEPPER_WAVE_FREQ;
    const halfH = BANANA_PEPPER_RING_HALF_HEIGHT;

    const verts: number[] = [];
    const idxArr: number[] = [];

    for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const wave = amp * Math.sin(freq * a);
        const ro = roBase + wave;
        const ri = riBase + wave;
        verts.push(ro * Math.cos(a), halfH, ro * Math.sin(a));  // [4i+0] outer-top
        verts.push(ri * Math.cos(a), halfH, ri * Math.sin(a));  // [4i+1] inner-top
        verts.push(ro * Math.cos(a), -halfH, ro * Math.sin(a));  // [4i+2] outer-bottom
        verts.push(ri * Math.cos(a), -halfH, ri * Math.sin(a));  // [4i+3] inner-bottom
    }

    for (let i = 0; i < segs; i++) {
        const b = i * 4;
        const n = ((i + 1) % segs) * 4;
        // top face (normal +y)
        idxArr.push(b + 0, n + 0, n + 1, b + 0, n + 1, b + 1);
        // bottom face (normal -y)
        idxArr.push(b + 2, n + 3, n + 2, b + 2, b + 3, n + 3);
        // outer wall (normal outward)
        idxArr.push(b + 0, n + 2, b + 2, b + 0, n + 0, n + 2);
        // inner wall (normal inward)
        idxArr.push(b + 1, b + 3, n + 3, b + 1, n + 3, n + 1);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idxArr);
    geo.computeVertexNormals();
    return geo;
}

const bananaPepperRingGeo = makeBananaPepperRingGeometry();

interface BananaPepperPlacement {
    x: number;
    z: number;
    scale: number;
    rotation: number;
}

function generatePlacements(seed: string): BananaPepperPlacement[] {
    const rng = mulberry32(seedToNumber(seed) ^ BANANA_PEPPER_SEED_OFFSET);
    const placements: BananaPepperPlacement[] = [];
    for (const ring of BANANA_PEPPER_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * BANANA_PEPPER_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * BANANA_PEPPER_RADIUS_JITTER;
            const scale = BANANA_PEPPER_SCALE_BASE + (rng() - 0.5) * BANANA_PEPPER_SCALE_JITTER;
            placements.push({ x: r * Math.cos(a), z: r * Math.sin(a), scale, rotation: rng() * Math.PI * 2 });
        }
    }
    return placements;
}

export class BananaPepper implements Topping {
    readonly group = new THREE.Group();
    readonly label = "BANANA PEPPER";
    count = 0;
    private readonly maxCount = MAX_BANANA_PEPPER;
    private placements: BananaPepperPlacement[] = [];
    private readonly matPepper = new THREE.MeshBasicMaterial({ color: COLOR_BANANA_PEPPER.clone() });

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
            const mesh = new THREE.Mesh(bananaPepperRingGeo, this.matPepper);
            mesh.rotation.y = rotation;
            mesh.scale.setScalar(scale);
            mesh.position.set(x, BANANA_PEPPER_HEIGHT, z);
            this.group.add(mesh);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matPepper.color.copy(COLOR_BANANA_PEPPER).lerp(COLOR_BANANA_PEPPER.clone().multiply(COLOR_BAKED), progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matPepper.color.copy(COLOR_BANANA_PEPPER);
    }
}
