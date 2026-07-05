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

function buildParams(rng: () => number): Pick<
    PizzaModel,
    "crustVariation" | "crustBumps" | "crustPhase" | "pepperoniPositions" | "sliceAngles"
> {
    const crustVariation = 0.005 + rng() * 0.02;
    const crustBumps = Math.floor(16 + rng() * 16);
    const crustPhase = rng() * Math.PI * 2;

    const pepperoniPositions: [number, number][] = [];
    const rings = [
        { r: 0.22, n: 3 },
        { r: 0.47, n: 7 },
        { r: 0.67, n: 10 },
    ];
    for (const ring of rings) {
        const offset = rng() * Math.PI * 2;
        for (let i = 0; i < ring.n; i++) {
            const baseA = (i / ring.n) * Math.PI * 2 + offset;
            const a = baseA + (rng() - 0.5) * 0.28;
            const r = ring.r + (rng() - 0.5) * 0.05;
            pepperoniPositions.push([r * Math.cos(a), r * Math.sin(a)]);
        }
    }

    const weights: number[] = [];
    for (let i = 0; i < SLICE_COUNT; i++) weights.push(1 + (rng() - 0.5) * 0.18);
    const total = weights.reduce((a, b) => a + b, 0);
    const sliceAngles: number[] = [];
    let acc = 0;
    for (let i = 0; i < SLICE_COUNT; i++) {
        // sliceAngles.push(acc);
        acc += (weights[i] / total) * Math.PI * 2;
    }

    return { crustVariation, crustBumps, crustPhase, pepperoniPositions, sliceAngles };
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
        ...buildParams(rng),
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
        ...buildParams(rng),
    });
}
