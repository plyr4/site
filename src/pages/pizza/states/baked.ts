import {
    type PizzaModel, GameState, resetModel
} from "../model";
import type { PizzaView } from "../view";
import type { PizzaState } from "./state";
import type { PizzaUI, ButtonHit } from "../ui";
import { Start } from "./start";

export class Baked implements PizzaState {
    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Baked;
        view.startSteam();
        window.dispatchEvent(new CustomEvent("pizza:baked", {
            detail: {
                seed: model.seed,
                toppings: {
                    pepperoni: model.pepperoniCount,
                    cheese: model.cheeseLevel,
                },
            },
        }));
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        if (hit === "retry") {
            resetModel(model);
            view.rebuild(model);
            return new Start();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        ui.begin();
        ui.centeredBtn("MAKE ANOTHER", "retry");
        ui.end();
    }
}
