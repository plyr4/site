export const PIZZA_RADIUS = 1.0;
export const CRUST_WIDTH = 0.12;
export const SLICE_COUNT = 8;
export const BAKING_DURATION = 4.0;
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
    bakingProgress: number;
    crustVariation: number;
    crustBumps: number;
    crustPhase: number;
    sliceAngles: number[];
    pizzaScale: number;
}

export function createModel(): PizzaModel {
    const seed = generateSeed();
    const rng = mulberry32(seedToNumber(seed));
    return {
        seed,
        state: GameState.Start,
        bakingProgress: 0,
        ...buildParams(rng, false),
    };
}

export function createModelFromSeed(seed: string): PizzaModel {
    const rng = mulberry32(seedToNumber(seed));
    return {
        seed,
        state: GameState.Baked,
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

export function seedToNumber(seed: string): number {
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
const SLICE_WEIGHT_JITTER = 0.18;
const PIZZA_SCALE_MIN = 0.8;
const PIZZA_SCALE_RANGE = 0.4;

function buildParams(rng: () => number, sliced: boolean): Pick<
    PizzaModel,
    "crustVariation" | "crustBumps" | "crustPhase" | "sliceAngles" | "pizzaScale"
> {
    const crustVariation = CRUST_VARIATION_MIN + rng() * CRUST_VARIATION_RANGE;
    const crustBumps = Math.floor(CRUST_BUMPS_MIN + rng() * CRUST_BUMPS_RANGE);
    const crustPhase = rng() * Math.PI * 2;
    const pizzaScale = PIZZA_SCALE_MIN + rng() * PIZZA_SCALE_RANGE;

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

    return { crustVariation, crustBumps, crustPhase, sliceAngles, pizzaScale };
}
