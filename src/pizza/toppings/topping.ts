import * as THREE from "three";
import {
    type PizzaModel,
} from "../model";

export interface Topping {
    readonly group: THREE.Group;
    readonly label: string;
    count: number;
    valueLabel(model: PizzaModel): string;
    increase(model: PizzaModel): void;
    decrease(model: PizzaModel): void;
    clear(model: PizzaModel): void;
    rebuild(model: PizzaModel): void;
    sync(model: PizzaModel): void;
    bake(progress: number, model: PizzaModel): void;
    resetColors(model: PizzaModel): void;
}