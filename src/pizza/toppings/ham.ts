import * as THREE from "three";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_HAM_FILL = new THREE.Color("#e69ea6");
const COLOR_BAKED = new THREE.Color("#b5b5b5");
const COLOR_HAM_LINE = new THREE.Color("#c84d6c");
const HAM_HEIGHT = 0.025;
const MAX_HAM = 20;

const HAM_RINGS: { r: number; n: number }[] = [
    { r: 0.25, n: 4 },
    { r: 0.55, n: 8 },
    { r: 0.72, n: 8 },
];
const HAM_ANGLE_JITTER = 0.3;
const HAM_RADIUS_JITTER = 0.05;
const HAM_HALF_W = 0.09;
const HAM_HALF_H = 0.12;
const OUTLINE_LIFT = 0.005;
const HAM_SCALE_BASE = 1.0;
const HAM_SCALE_JITTER = 0.25;
const HAM_SEED_OFFSET = 0x48414d21;

const hamFillGeo = (() => {
    const w = HAM_HALF_W;
    const h = HAM_HALF_H;
    const verts = new Float32Array([
        0, 0, -h,
        w, 0, 0,
        0, 0, h,
        -w, 0, 0,
    ]);
    const idx = new Uint16Array([0, 2, 1, 0, 3, 2]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(verts, 3));
    geo.setIndex(new THREE.BufferAttribute(idx, 1));
    return geo;
})();

const hamOutlineGeo = (() => {
    const w = HAM_HALF_W;
    const h = HAM_HALF_H;
    const pts = [
        new THREE.Vector3(0, 0, -h),
        new THREE.Vector3(w, 0, 0),
        new THREE.Vector3(0, 0, h),
        new THREE.Vector3(-w, 0, 0),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
})();

interface HamPlacement {
    x: number;
    z: number;
    scale: number;
    rotation: number;
}

function generatePlacements(seed: string): HamPlacement[] {
    const rng = mulberry32(seedToNumber(seed) ^ HAM_SEED_OFFSET);
    const placements: HamPlacement[] = [];
    for (const ring of HAM_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * HAM_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * HAM_RADIUS_JITTER;
            const scale = HAM_SCALE_BASE + (rng() - 0.5) * HAM_SCALE_JITTER;
            placements.push({ x: r * Math.cos(a), z: r * Math.sin(a), scale, rotation: rng() * Math.PI * 2 });
        }
    }
    return placements;
}

export class Ham implements Topping {
    readonly group = new THREE.Group();
    readonly label = "HAM";
    count = 0;
    private readonly maxCount = MAX_HAM;
    private placements: HamPlacement[] = [];
    private readonly matFill = new THREE.MeshBasicMaterial({ color: COLOR_HAM_FILL.clone() });
    private readonly matLine = new THREE.LineBasicMaterial({ color: COLOR_HAM_LINE });

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

            const fill = new THREE.Mesh(hamFillGeo, this.matFill);
            fill.rotation.y = rotation;
            fill.scale.setScalar(scale);
            fill.position.set(x, HAM_HEIGHT, z);
            this.group.add(fill);

            const outline = new THREE.LineLoop(hamOutlineGeo, this.matLine);
            outline.rotation.y = rotation;
            outline.scale.setScalar(scale);
            outline.position.set(x, HAM_HEIGHT + OUTLINE_LIFT, z);
            this.group.add(outline);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matFill.color.copy(COLOR_HAM_FILL).lerp(COLOR_HAM_FILL.clone().multiply(COLOR_BAKED), progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matFill.color.copy(COLOR_HAM_FILL);
    }
}
