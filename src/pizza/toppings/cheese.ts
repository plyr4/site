import * as THREE from "three";
import {
    PIZZA_RADIUS,
    CRUST_WIDTH,
    MAX_CHEESE,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const COLOR_CHEESE_MIN = new THREE.Color("#f6ce4a");
const COLOR_CHEESE_MAX = new THREE.Color("#e8801a");
const COLOR_CHEESE_BAKED = new THREE.Color("#d4942e");
const CHEESE_MESH_SEGMENTS = 64;
const CHEESE_Y_OFFSET = -0.0025;

export class Cheese implements Topping {
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
            new THREE.CircleGeometry(PIZZA_RADIUS - CRUST_WIDTH + model.crustVariation, CHEESE_MESH_SEGMENTS),
            this.matFill
        );
        cheeseFill.rotation.x = -Math.PI / 2;
        cheeseFill.position.y = CHEESE_Y_OFFSET;
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
