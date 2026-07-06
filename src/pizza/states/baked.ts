import {
    type PizzaModel, GameState, resetModel
} from "../model";
import type { PizzaView } from "../view";
import type { PizzaState } from "./state";
import type { PizzaUI, PizzaTopUI, ButtonHit } from "../ui";
import { Build } from "./build";

export class Baked implements PizzaState {
    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Baked;
        view.stopHeat();
        const toppings: Record<string, number> = {};
        for (const t of view.allToppings) {
            toppings[t.label.toLowerCase()] = t.count;
        }
        window.dispatchEvent(new CustomEvent("pizza:baked", {
            detail: { seed: model.seed, toppings },
        }));
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        if (hit === "retry") {
            resetModel(model);
            view.rebuild(model);
            return new Build();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        ui.begin();
        ui.centeredBtn("MAKE ANOTHER", "retry");
        ui.end();
    }

    drawTopUI(model: PizzaModel, topUi: PizzaTopUI): void {
        topUi.begin();
        topUi.label("ENJOY YOUR PIZZA!");
        topUi.end();
    }
}
