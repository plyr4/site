import {
    type PizzaModel, GameState
} from "../model";
import type { PizzaView } from "../view";
import type { PizzaState } from "./state";
import type { PizzaUI, ButtonHit } from "../ui";
import { Build } from "./build";

export class Start implements PizzaState {
    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Start;
        view.rebuild(model);
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        if (hit === "build") {
            model.pepperoniCount = 0;
            return new Build();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        ui.begin();
        ui.centeredBtn("ADD TOPPINGS", "build");
        ui.end();
    }
}

