export const PIZZA_RADIUS = 1.0;
export const CRUST_WIDTH = 0.12;
export const SLICE_COUNT = 8;
export const PEPPERONI_RADIUS = 0.11;
export const BAKING_DURATION = 2.0;
export const MAX_PEPPERONI = 20;
export const MAX_CHEESE = 5;

export enum GameState {
    Start = "start",
    Build = "build",
    Baking = "baking",
    Baked = "baked",
}

export interface PizzaModel {
    seed: string;
    state: GameState;
    pepperoniCount: number;
    cheeseLevel: number;
    bakingProgress: number;
    crustVariation: number;
    crustBumps: number;
    crustPhase: number;
    pepperoniPositions: [number, number][];
    sliceAngles: number[];
}

export function createModel(): PizzaModel {
    const seed = generateSeed();
    const rng = mulberry32(seedToNumber(seed));
    return {
        seed,
        state: GameState.Start,
        pepperoniCount: 0,
        cheeseLevel: 0,
        bakingProgress: 0,
        ...buildParams(rng, false),
    };
}

export function createModelFromSeed(seed: string, pepperoniCount = 0, cheeseLevel = 0): PizzaModel {
    const rng = mulberry32(seedToNumber(seed));
    return {
        seed,
        state: GameState.Baked,
        pepperoniCount,
        cheeseLevel,
        bakingProgress: 1,
        ...buildParams(rng, true),
    };
}

export function resetModel(model: PizzaModel): void {
    const seed = generateSeed();
    const rng = mulberry32(seedToNumber(seed));
    Object.assign(model, {
        seed,
        state: GameState.Start,
        pepperoniCount: 0,
        cheeseLevel: 0,
        bakingProgress: 0,
        ...buildParams(rng, false),
    });
}

function generateSeed(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
}

function seedToNumber(seed: string): number {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let n = 0;
    for (let i = 0; i < seed.length; i++) n = n * 36 + chars.indexOf(seed[i]);
    return n;
}

export function mulberry32(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let z = Math.imul(s ^ (s >>> 15), 1 | s);
        z = (z + Math.imul(z ^ (z >>> 7), 61 | z)) ^ z;
        return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
    };
}

const CRUST_VARIATION_MIN = 0.005;
const CRUST_VARIATION_RANGE = 0.02;
const CRUST_BUMPS_MIN = 16;
const CRUST_BUMPS_RANGE = 16;
const PEPPERONI_RINGS: { r: number; n: number }[] = [
    { r: 0.22, n: 3 },
    { r: 0.47, n: 7 },
    { r: 0.67, n: 10 },
];
const PEPPERONI_ANGLE_JITTER = 0.28;
const PEPPERONI_RADIUS_JITTER = 0.05;
const SLICE_WEIGHT_JITTER = 0.18;

function buildParams(rng: () => number, sliced: boolean): Pick<
    PizzaModel,
    "crustVariation" | "crustBumps" | "crustPhase" | "pepperoniPositions" | "sliceAngles"
> {
    const crustVariation = CRUST_VARIATION_MIN + rng() * CRUST_VARIATION_RANGE;
    const crustBumps = Math.floor(CRUST_BUMPS_MIN + rng() * CRUST_BUMPS_RANGE);
    const crustPhase = rng() * Math.PI * 2;

    const pepperoniPositions: [number, number][] = [];
    const rings = PEPPERONI_RINGS;
    for (const ring of rings) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * PEPPERONI_ANGLE_JITTER;
            const r = ring.r + (rng() - 0.5) * PEPPERONI_RADIUS_JITTER;
            pepperoniPositions.push([r * Math.cos(a), r * Math.sin(a)]);
        }
    }

    const sliceAngles: number[] = [];
    if (sliced) {
        const weights: number[] = [];
        for (let i = 0; i < SLICE_COUNT; i++) weights.push(1 + (rng() - 0.5) * SLICE_WEIGHT_JITTER);
        const total = weights.reduce((a, b) => a + b, 0);
        let acc = 0;
        for (let i = 0; i < SLICE_COUNT; i++) {
            sliceAngles.push(acc);
            acc += (weights[i] / total) * Math.PI * 2;
        }
    }

    return { crustVariation, crustBumps, crustPhase, pepperoniPositions, sliceAngles };
}
