import * as THREE from "three";
import {
    PIZZA_RADIUS,
    CRUST_WIDTH,
    MAX_CHEESE,
    mulberry32,
    seedToNumber,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_CHEESE_MIN = new THREE.Color("#f6ce4a");
const COLOR_CHEESE_MAX = new THREE.Color("#e8801a");
const COLOR_CHEESE_BAKED = new THREE.Color("#c48520");
const COLOR_PATCH_LIGHT = new THREE.Color("#efd06a");
const COLOR_PATCH_ORANGE = new THREE.Color("#f0a625");
const CHEESE_Y_OFFSET = -0.0025;

const CHEESE_RINGS = 7;
const CHEESE_SEGS = 26;
const CHEESE_VARIATION_SEED = 0x43484545;
const N_BLOBS = 35;
const BLOB_STRENGTH = 0.95;

function makeCheeseDisk(radius: number): THREE.BufferGeometry {
    const verts: number[] = [];
    const idx: number[] = [];
    verts.push(0, 0, 0);
    for (let r = 1; r <= CHEESE_RINGS; r++) {
        const rad = (r / CHEESE_RINGS) * radius;
        for (let s = 0; s < CHEESE_SEGS; s++) {
            const a = (s / CHEESE_SEGS) * Math.PI * 2;
            verts.push(rad * Math.cos(a), rad * Math.sin(a), 0);
        }
    }
    for (let s = 0; s < CHEESE_SEGS; s++) {
        idx.push(0, 1 + s, 1 + (s + 1) % CHEESE_SEGS);
    }
    for (let r = 1; r < CHEESE_RINGS; r++) {
        const inner = 1 + (r - 1) * CHEESE_SEGS;
        const outer = 1 + r * CHEESE_SEGS;
        for (let s = 0; s < CHEESE_SEGS; s++) {
            const i0 = inner + s, i1 = inner + (s + 1) % CHEESE_SEGS;
            const o0 = outer + s, o1 = outer + (s + 1) % CHEESE_SEGS;
            idx.push(i0, o0, o1, i0, o1, i1);
        }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    return geo;
}

export class Cheese implements Topping {
    readonly group = new THREE.Group();
    readonly label = "CHEESE";
    count = 0;
    readonly maxCount = MAX_CHEESE;
    private readonly matFill = new THREE.MeshBasicMaterial({ vertexColors: true });
    private cheeseMesh: THREE.Mesh | null = null;
    private varBuffer: Float32Array = new Float32Array(0);

    valueLabel(model: PizzaModel): string { return String(this.count); }

    increase(model: PizzaModel): void {
        this.count = Math.min(MAX_CHEESE, this.count + 1);
        this.sync(model);
    }

    decrease(model: PizzaModel): void {
        this.count = Math.max(0, this.count - 1);
        this.sync(model);
    }

    clear(model: PizzaModel): void { this.count = 0; this.rebuild(model); }

    rebuild(model: PizzaModel): void {
        this.group.clear();

        const geo = makeCheeseDisk(PIZZA_RADIUS - CRUST_WIDTH + model.crustVariation);
        this.cheeseMesh = new THREE.Mesh(geo, this.matFill);
        this.cheeseMesh.rotation.x = -Math.PI / 2;
        this.cheeseMesh.position.y = CHEESE_Y_OFFSET;
        this.group.add(this.cheeseMesh);

        const rng = mulberry32(seedToNumber(model.seed) ^ CHEESE_VARIATION_SEED);
        const positions = geo.getAttribute("position") as THREE.BufferAttribute;
        const nVerts = positions.count;
        this.varBuffer = new Float32Array(nVerts);

        const cheeseR = PIZZA_RADIUS - CRUST_WIDTH;
        const blobs: { x: number; y: number; strength: number; radius: number }[] = [];
        for (let i = 0; i < N_BLOBS; i++) {
            const a = rng() * Math.PI * 2;
            const r = rng() * cheeseR * 0.88;
            blobs.push({
                x: r * Math.cos(a),
                y: r * Math.sin(a),
                strength: (rng() - 0.5) * 2 * BLOB_STRENGTH,
                radius: 0.10 + rng() * 0.22,
            });
        }

        for (let i = 0; i < nVerts; i++) {
            const vx = positions.getX(i);
            const vy = positions.getY(i);
            let v = 0;
            for (const b of blobs) {
                const dx = vx - b.x, dy = vy - b.y;
                const t = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / b.radius);
                v += b.strength * t * t;
            }
            this.varBuffer[i] = Math.max(-1, Math.min(1, v));
        }

        geo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(nVerts * 3), 3));
        this.sync(model);
    }

    private applyVertexColors(base: THREE.Color): void {
        if (!this.cheeseMesh) return;
        const colorAttr = this.cheeseMesh.geometry.getAttribute("color") as THREE.BufferAttribute;
        const tmp = new THREE.Color();
        for (let i = 0; i < this.varBuffer.length; i++) {
            const v = this.varBuffer[i];
            tmp.copy(base);
            if (v > 0) {
                tmp.lerp(COLOR_PATCH_ORANGE, v);
            } else {
                tmp.lerp(COLOR_PATCH_LIGHT, -v);
            }
            colorAttr.setXYZ(i, tmp.r, tmp.g, tmp.b);
        }
        colorAttr.needsUpdate = true;
    }

    sync(model: PizzaModel): void {
        const t = this.count / MAX_CHEESE;
        this.applyVertexColors(COLOR_CHEESE_MIN.clone().lerp(COLOR_CHEESE_MAX, t));
    }

    bake(progress: number, model: PizzaModel): void {
        const t = this.count / MAX_CHEESE;
        const raw = COLOR_CHEESE_MIN.clone().lerp(COLOR_CHEESE_MAX, t);
        const baked = raw.clone().lerp(raw.clone().multiply(COLOR_CHEESE_BAKED), 0.5);
        this.applyVertexColors(raw.clone().lerp(baked, progress));
    }

    resetColors(model: PizzaModel): void {
        this.sync(model);
    }
}
