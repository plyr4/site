import * as THREE from "three";
import {
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_CAP = new THREE.Color("#6f6f6f");
const COLOR_STEM = new THREE.Color("#f5f5f5");
const COLOR_BAKED = new THREE.Color("#b5b5b5");
const MUSHROOM_HEIGHT = 0.08;
const MAX_MUSHROOM = 20;

const MUSHROOM_RINGS: { r: number; n: number }[] = [
    { r: 0.25, n: 4 },
    { r: 0.55, n: 8 },
    { r: 0.72, n: 8 },
];
const MUSHROOM_ANGLE_JITTER = 0.3;
const MUSHROOM_RADIUS_JITTER = 0.05;
const MUSHROOM_SCALE_BASE = 0.65;
const MUSHROOM_SCALE_JITTER = 0.1;
const MUSHROOM_SEED_OFFSET = 0x4d555348;

interface MushroomPlacement {
    x: number;
    z: number;
    scale: number;
    rotation: number;
}

function generatePlacements(seed: string): MushroomPlacement[] {
    const rng = mulberry32(seedToNumber(seed) ^ MUSHROOM_SEED_OFFSET);
    const placements: MushroomPlacement[] = [];
    for (const ring of MUSHROOM_RINGS) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * MUSHROOM_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * MUSHROOM_RADIUS_JITTER;
            const scale = MUSHROOM_SCALE_BASE + (rng() - 0.5) * MUSHROOM_SCALE_JITTER;
            placements.push({ x: r * Math.cos(a), z: r * Math.sin(a), scale, rotation: rng() * Math.PI * 2 });
        }
    }
    return placements;
}

export class Mushroom implements Topping {
    readonly group = new THREE.Group();
    readonly label = "MUSHROOM";
    count = 0;
    readonly maxCount = MAX_MUSHROOM;
    private placements: MushroomPlacement[] = [];
    private readonly matStem = new THREE.MeshBasicMaterial({ color: COLOR_STEM.clone() });
    private readonly matCap = new THREE.MeshBasicMaterial({ color: COLOR_CAP.clone() });

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
        this.placements = generatePlacements(model.seed);
        this.group.clear();
    }

    sync(_model: PizzaModel): void {
        this.group.clear();
        const count = Math.min(this.count, this.placements.length);
        for (let i = 0; i < count; i++) {
            const { x, z, scale, rotation } = this.placements[i];

            const stemR = 0.07;
            const capR = 0.18;
            const stemH = 0.1;
            const capYOffset = 0.05;
            const segs = 8;

            const mushroom = new THREE.Group();

            const stem = new THREE.Mesh(
                new THREE.CylinderGeometry(stemR, stemR, stemH, segs),
                this.matStem
            );
            mushroom.add(stem);

            const cap = new THREE.Mesh(
                new THREE.SphereGeometry(capR, segs * 2, segs * 2, 0, Math.PI * 2, 0, Math.PI / 2),
                this.matCap
            );
            cap.position.y = capYOffset;
            mushroom.add(cap);
            mushroom.setRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, rotation));

            mushroom.scale.set(scale, scale, 0.1);
            mushroom.position.set(x, MUSHROOM_HEIGHT, z);

            this.group.add(mushroom);
        }
    }

    bake(progress: number, _model: PizzaModel): void {
        this.matCap.color.copy(COLOR_CAP).lerp(COLOR_CAP.clone().multiply(COLOR_BAKED), progress);
        this.matStem.color.copy(COLOR_STEM).lerp(COLOR_STEM.clone().multiply(COLOR_BAKED), progress);
    }

    resetColors(_model: PizzaModel): void {
        this.matCap.color.copy(COLOR_CAP);
        this.matStem.color.copy(COLOR_STEM);
    }
}