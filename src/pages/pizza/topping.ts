import * as THREE from "three";
import { makeCircle } from "./geometry";
import {
    PIZZA_RADIUS,
    CRUST_WIDTH,
    PEPPERONI_RADIUS,
    MAX_PEPPERONI,
    MAX_CHEESE,
    type PizzaModel,
} from "./model";

const PEPPE_HEIGHT = 0.02;

const COLOR_PEP_FILL_RAW = new THREE.Color("#7a2020");
const COLOR_PEP_FILL_BAKED = new THREE.Color("#3d1010");
const COLOR_PEP_LINE = new THREE.Color("#c94040");

const COLOR_CHEESE_MIN = new THREE.Color("#f6ce4a");
const COLOR_CHEESE_MAX = new THREE.Color("#e8801a");
const COLOR_CHEESE_BAKED = new THREE.Color("#f5bc41");

export interface Topping {
    readonly group: THREE.Group;
    readonly label: string;
    valueLabel(model: PizzaModel): string;
    increase(model: PizzaModel): void;
    decrease(model: PizzaModel): void;
    rebuild(model: PizzaModel): void;
    sync(model: PizzaModel): void;
    bake(progress: number, model: PizzaModel): void;
    resetColors(model: PizzaModel): void;
}

export class PepperoniTopping implements Topping {
    readonly group = new THREE.Group();
    readonly label = "PEPPERONI";
    private readonly matFill = new THREE.MeshBasicMaterial({ color: COLOR_PEP_FILL_RAW.clone() });
    private readonly matLine = new THREE.LineBasicMaterial({ color: COLOR_PEP_LINE });

    valueLabel(model: PizzaModel): string { return String(model.pepperoniCount); }

    increase(model: PizzaModel): void {
        model.pepperoniCount = Math.min(MAX_PEPPERONI, model.pepperoniCount + 1);
        this.sync(model);
    }

    decrease(model: PizzaModel): void {
        model.pepperoniCount = Math.max(0, model.pepperoniCount - 1);
        this.sync(model);
    }

    rebuild(_model: PizzaModel): void {
        this.group.clear();
    }

    sync(model: PizzaModel): void {
        this.group.clear();
        const count = Math.min(model.pepperoniCount, model.pepperoniPositions.length);
        for (let i = 0; i < count; i++) {
            const [cx, cz] = model.pepperoniPositions[i];
            const fill = new THREE.Mesh(new THREE.CircleGeometry(PEPPERONI_RADIUS, 32), this.matFill);
            fill.rotation.x = -Math.PI / 2;
            fill.position.set(cx, PEPPE_HEIGHT, cz);
            this.group.add(fill);

            const outline = new THREE.LineLoop(makeCircle(PEPPERONI_RADIUS), this.matLine);
            outline.position.set(cx, PEPPE_HEIGHT + 0.01, cz);
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

export class CheeseTopping implements Topping {
    readonly group = new THREE.Group();
    readonly label = "CHEESE";
    private readonly matFill = new THREE.MeshBasicMaterial({ color: COLOR_CHEESE_MIN.clone() });

    valueLabel(model: PizzaModel): string { return String(model.cheeseLevel); }

    increase(model: PizzaModel): void {
        model.cheeseLevel = Math.min(MAX_CHEESE, model.cheeseLevel + 1);
        this.sync(model);
    }

    decrease(model: PizzaModel): void {
        model.cheeseLevel = Math.max(0, model.cheeseLevel - 1);
        this.sync(model);
    }

    rebuild(model: PizzaModel): void {
        this.group.clear();
        const cheeseFill = new THREE.Mesh(
            new THREE.CircleGeometry(PIZZA_RADIUS - CRUST_WIDTH + model.crustVariation, 64),
            this.matFill
        );
        cheeseFill.rotation.x = -Math.PI / 2;
        cheeseFill.position.y = -0.0025;
        this.group.add(cheeseFill);
        this.sync(model);
    }

    sync(model: PizzaModel): void {
        const t = model.cheeseLevel / MAX_CHEESE;
        this.matFill.color.copy(COLOR_CHEESE_MIN).lerp(COLOR_CHEESE_MAX, t);
    }

    bake(progress: number, model: PizzaModel): void {
        const t = model.cheeseLevel / MAX_CHEESE;
        const rawColor = COLOR_CHEESE_MIN.clone().lerp(COLOR_CHEESE_MAX, t);
        this.matFill.color.copy(rawColor).lerp(rawColor.clone().lerp(rawColor.clone().multiply(COLOR_CHEESE_BAKED), 0.5), progress);
    }

    resetColors(model: PizzaModel): void {
        this.sync(model);
    }
}
