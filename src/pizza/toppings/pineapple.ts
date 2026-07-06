import * as THREE from "three";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_PINEAPPLE_LINE = new THREE.Color("#f0d040");
const COLOR_PINEAPPLE = new THREE.Color("#d5b838");
const COLOR_BAKED = new THREE.Color("#b5b5b5");
const PINEAPPLE_HEIGHT = 0.025;
const MAX_PINEAPPLE = 20;

const PINEAPPLE_RINGS: { r: number; n: number }[] = [
    { r: 0.25, n: 4 },
    { r: 0.55, n: 8 },
    { r: 0.72, n: 8 },
];
const PINEAPPLE_ANGLE_JITTER = 0.3;
const PINEAPPLE_RADIUS_JITTER = 0.05;
const PINEAPPLE_BASE_W = 0.08;
const PINEAPPLE_BASE_H = 0.025;
const PINEAPPLE_BASE_D = 0.15;
const PINEAPPLE_SCALE_BASE = 1.0;
const PINEAPPLE_SCALE_JITTER = 0.2;
const PINEAPPLE_ASPECT_JITTER = 0.25;
const PINEAPPLE_SEED_OFFSET = 0x50494e45;

const pineappleGeo = new THREE.BoxGeometry(PINEAPPLE_BASE_W, PINEAPPLE_BASE_H, PINEAPPLE_BASE_D);

const pineappleOutlineGeo = (() => {
    const w = PINEAPPLE_BASE_W / 2;
    const h = PINEAPPLE_BASE_H / 2 + 0.003;
    const d = PINEAPPLE_BASE_D / 2;
    const pts = [
        new THREE.Vector3(-w, h, -d),
        new THREE.Vector3(w, h, -d),
        new THREE.Vector3(w, h, d),
        new THREE.Vector3(-w, h, d),
    ];
    return new THREE.BufferGeometry().setFromPoints(pts);
})();

interface PineapplePlacement {
    x: number;
    z: number;
    scale: number;
    scaleX: number;
    scaleZ: number;
    rotation: number;
}

function generatePlacements(seed: string): PineapplePlacement[] {
    const rng = mulberry32(seedToNumber(seed) ^ PINEAPPLE_SEED_OFFSET);
    const placements: PineapplePlacement[] = [];
    for (const ring of PINEAPPLE_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * PINEAPPLE_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * PINEAPPLE_RADIUS_JITTER;
            const scale = PINEAPPLE_SCALE_BASE + (rng() - 0.5) * PINEAPPLE_SCALE_JITTER;
            const scaleX = 1.0 + (rng() - 0.5) * PINEAPPLE_ASPECT_JITTER;
            const scaleZ = 1.0 + (rng() - 0.5) * PINEAPPLE_ASPECT_JITTER;
            placements.push({ x: r * Math.cos(a), z: r * Math.sin(a), scale, scaleX, scaleZ, rotation: rng() * Math.PI * 2 });
        }
    }
    return placements;
}

export class Pineapple implements Topping {
    readonly group = new THREE.Group();
    readonly label = "PINEAPPLE";
    count = 0;
    readonly maxCount = MAX_PINEAPPLE;
    private placements: PineapplePlacement[] = [];
    private readonly matPineapple = new THREE.MeshBasicMaterial({ color: COLOR_PINEAPPLE.clone() });
    private readonly matLine = new THREE.LineBasicMaterial({ color: COLOR_PINEAPPLE_LINE });

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
            const { x, z, scale, scaleX, scaleZ, rotation } = this.placements[i];
            const piece = new THREE.Group();
            piece.rotation.y = rotation;
            piece.scale.set(scale * scaleX, scale, scale * scaleZ);
            piece.position.set(x, PINEAPPLE_HEIGHT, z);
            piece.add(new THREE.Mesh(pineappleGeo, this.matPineapple));
            piece.add(new THREE.LineLoop(pineappleOutlineGeo, this.matLine));
            this.group.add(piece);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matPineapple.color.copy(COLOR_PINEAPPLE).lerp(COLOR_PINEAPPLE.clone().multiply(COLOR_BAKED), progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matPineapple.color.copy(COLOR_PINEAPPLE);
    }
}
