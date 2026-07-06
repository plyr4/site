import * as THREE from "three";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_SAUSAGE = new THREE.Color("#49260c");
const COLOR_BAKED = new THREE.Color("#b5b5b5");
const SAUSAGE_HEIGHT = 0.045;
const MAX_SAUSAGE = 20;

const SAUSAGE_RINGS: { r: number; n: number }[] = [
    { r: 0.25, n: 4 },
    { r: 0.55, n: 8 },
    { r: 0.72, n: 8 },
];
const SAUSAGE_ANGLE_JITTER = 0.3;
const SAUSAGE_RADIUS_JITTER = 0.05;
const SAUSAGE_SPHERE_RADIUS = 0.06;
const SAUSAGE_Y_SQUISH = 0.72;
const SAUSAGE_SCALE_BASE = 1.0;
const SAUSAGE_SCALE_JITTER = 0.3;
const SAUSAGE_SEED_OFFSET = 0x53415553;

const sausageGeo = new THREE.SphereGeometry(SAUSAGE_SPHERE_RADIUS, 8, 6);

interface SausagePlacement {
    x: number;
    z: number;
    scale: number;
}

function generatePlacements(seed: string): SausagePlacement[] {
    const rng = mulberry32(seedToNumber(seed) ^ SAUSAGE_SEED_OFFSET);
    const placements: SausagePlacement[] = [];
    for (const ring of SAUSAGE_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * SAUSAGE_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * SAUSAGE_RADIUS_JITTER;
            const scale = SAUSAGE_SCALE_BASE + (rng() - 0.5) * SAUSAGE_SCALE_JITTER;
            placements.push({ x: r * Math.cos(a), z: r * Math.sin(a), scale });
        }
    }
    return placements;
}

export class Sausage implements Topping {
    readonly group = new THREE.Group();
    readonly label = "SAUSAGE";
    count = 0;
    readonly maxCount = MAX_SAUSAGE;
    private placements: SausagePlacement[] = [];
    private readonly matSausage = new THREE.MeshBasicMaterial({ color: COLOR_SAUSAGE.clone() });

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
            const { x, z, scale } = this.placements[i];
            const mesh = new THREE.Mesh(sausageGeo, this.matSausage);
            mesh.scale.set(scale, scale * SAUSAGE_Y_SQUISH, scale);
            mesh.position.set(x, SAUSAGE_HEIGHT, z);
            this.group.add(mesh);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matSausage.color.copy(COLOR_SAUSAGE).lerp(COLOR_SAUSAGE.clone().multiply(COLOR_BAKED), progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matSausage.color.copy(COLOR_SAUSAGE);
    }
}
