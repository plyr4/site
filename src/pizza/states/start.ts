import {
    type PizzaModel, GameState
} from "../model";
import type { PizzaView } from "../view";
import type { PizzaState } from "./state";
import type { PizzaUI, PizzaTopUI, ButtonHit } from "../ui";
import { Build } from "./build";

export class Start implements PizzaState {
    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Start;
        view.setDefaultToppings(model);
        view.rebuild(model);
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        if (hit === "build") {
            return new Build();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        ui.begin();
        ui.centeredBtn("START", "build");
        ui.end();
    }

    drawTopUI(model: PizzaModel, topUi: PizzaTopUI): void {
        topUi.begin();
        topUi.label("IT'S PIZZA TIME");
        topUi.end();
    }
}

