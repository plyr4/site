import * as THREE from "three";
import { makeCircle } from "../geometry";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const PEPPERONI_RADIUS = 0.11;
const MAX_PEPPERONI = 20;
const PEPPE_HEIGHT = 0.02;
const PEPPERONI_MESH_SEGMENTS = 32;
const OUTLINE_LIFT = 0.01;
const COLOR_PEP_FILL_RAW = new THREE.Color("#7a2020");
const COLOR_PEP_FILL_BAKED = new THREE.Color("#3d1010");
const COLOR_PEP_LINE = new THREE.Color("#c94040");

const PEPPERONI_RINGS: { r: number; n: number }[] = [
    { r: 0.22, n: 3 },
    { r: 0.47, n: 7 },
    { r: 0.67, n: 10 },
];
const PEPPERONI_ANGLE_JITTER = 0.28;
const PEPPERONI_RADIUS_JITTER = 0.05;
const PEPPERONI_SEED_OFFSET = 0x50455050;

function generatePositions(seed: string): [number, number][] {
    const rng = mulberry32(seedToNumber(seed) ^ PEPPERONI_SEED_OFFSET);
    const positions: [number, number][] = [];
    for (const ring of PEPPERONI_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * PEPPERONI_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * PEPPERONI_RADIUS_JITTER;
            positions.push([r * Math.cos(a), r * Math.sin(a)]);
        }
    }
    return positions;
}

export class Pepperoni implements Topping {
    readonly group = new THREE.Group();
    readonly label = "PEPPERONI";
    count = 0;
    readonly maxCount = MAX_PEPPERONI;
    private positions: [number, number][] = [];
    private readonly matFill = new THREE.MeshBasicMaterial({ color: COLOR_PEP_FILL_RAW.clone() });
    private readonly matLine = new THREE.LineBasicMaterial({ color: COLOR_PEP_LINE });

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
        this.positions = generatePositions(model.seed);
        this.group.clear();
    }

    sync(_model: PizzaModel): void {
        this.group.clear();
        const count = Math.min(this.count, this.positions.length);
        for (let i = 0; i < count; i++) {
            const [cx, cz] = this.positions[i];
            const fill = new THREE.Mesh(new THREE.CircleGeometry(PEPPERONI_RADIUS, PEPPERONI_MESH_SEGMENTS), this.matFill);
            fill.rotation.x = -Math.PI / 2;
            fill.position.set(cx, PEPPE_HEIGHT, cz);
            this.group.add(fill);

            const outline = new THREE.LineLoop(makeCircle(PEPPERONI_RADIUS), this.matLine);
            outline.position.set(cx, PEPPE_HEIGHT + OUTLINE_LIFT, cz);
            this.group.add(outline);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matFill.color.copy(COLOR_PEP_FILL_RAW).lerp(COLOR_PEP_FILL_BAKED, progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matFill.color.copy(COLOR_PEP_FILL_RAW);
    }
}
