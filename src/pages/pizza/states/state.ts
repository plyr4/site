import { type PizzaModel } from "../model";
import type { PizzaView } from "../view";
import type { PizzaUI, ButtonHit } from "../ui";

export interface PizzaState {
    onEnter(model: PizzaModel, view: PizzaView): void;
    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null;
    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null;
    drawUI(model: PizzaModel, ui: PizzaUI): void;
}
