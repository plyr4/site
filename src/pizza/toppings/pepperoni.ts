import * as THREE from "three";
import { makeCircle } from "../geometry";
import {
    PEPPERONI_RADIUS,
    MAX_PEPPERONI,
    type PizzaModel,
} from "../model";
import type { Topping } from "./topping";

const PEPPE_HEIGHT = 0.02;
const PEPPERONI_MESH_SEGMENTS = 32;
const OUTLINE_LIFT = 0.01;
const COLOR_PEP_FILL_RAW = new THREE.Color("#7a2020");
const COLOR_PEP_FILL_BAKED = new THREE.Color("#3d1010");
const COLOR_PEP_LINE = new THREE.Color("#c94040");

export class Pepperoni implements Topping {
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
