import * as THREE from "three";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_OLIVE = new THREE.Color("#222222");
const COLOR_BAKED = new THREE.Color("#b5b5b5");
const BLACK_OLIVE_HEIGHT = 0.07;
const MAX_BLACK_OLIVE = 20;

const BLACK_OLIVE_RINGS: { r: number; n: number }[] = [
    { r: 0.25, n: 4 },
    { r: 0.55, n: 8 },
    { r: 0.72, n: 8 },
];
const BLACK_OLIVE_ANGLE_JITTER = 0.3;
const BLACK_OLIVE_RADIUS_JITTER = 0.05;
const BLACK_OLIVE_OUTER_RADIUS = 0.052;
const BLACK_OLIVE_INNER_RADIUS = 0.028;
const BLACK_OLIVE_RING_HALF_HEIGHT = 0.020;
const BLACK_OLIVE_SEGS = 20;
const BLACK_OLIVE_SCALE_BASE = 1.0;
const BLACK_OLIVE_SCALE_JITTER = 0.2;
const BLACK_OLIVE_SEED_OFFSET = 0x424c4f4c;

function makeBlackOliveRingGeometry(): THREE.BufferGeometry {
    const segs = BLACK_OLIVE_SEGS;
    const ro = BLACK_OLIVE_OUTER_RADIUS;
    const ri = BLACK_OLIVE_INNER_RADIUS;
    const halfH = BLACK_OLIVE_RING_HALF_HEIGHT;

    const verts: number[] = [];
    const idxArr: number[] = [];

    for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
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

const blackOliveRingGeo = makeBlackOliveRingGeometry();

interface BlackOlivePlacement {
    x: number;
    z: number;
    scale: number;
    rotation: number;
}

function generatePlacements(seed: string): BlackOlivePlacement[] {
    const rng = mulberry32(seedToNumber(seed) ^ BLACK_OLIVE_SEED_OFFSET);
    const placements: BlackOlivePlacement[] = [];
    for (const ring of BLACK_OLIVE_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * BLACK_OLIVE_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * BLACK_OLIVE_RADIUS_JITTER;
            const scale = BLACK_OLIVE_SCALE_BASE + (rng() - 0.5) * BLACK_OLIVE_SCALE_JITTER;
            placements.push({ x: r * Math.cos(a), z: r * Math.sin(a), scale, rotation: rng() * Math.PI * 2 });
        }
    }
    return placements;
}

export class BlackOlive implements Topping {
    readonly group = new THREE.Group();
    readonly label = "BLACK OLIVE";
    count = 0;
    readonly maxCount = MAX_BLACK_OLIVE;
    private placements: BlackOlivePlacement[] = [];
    private readonly matOlive = new THREE.MeshBasicMaterial({ color: COLOR_OLIVE.clone() });

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
            const mesh = new THREE.Mesh(blackOliveRingGeo, this.matOlive);
            mesh.rotation.y = rotation;
            mesh.scale.setScalar(scale);
            mesh.position.set(x, BLACK_OLIVE_HEIGHT, z);
            this.group.add(mesh);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matOlive.color.copy(COLOR_OLIVE).lerp(COLOR_OLIVE.clone().multiply(COLOR_BAKED), progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matOlive.color.copy(COLOR_OLIVE);
    }
}
