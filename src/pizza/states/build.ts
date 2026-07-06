import {
    type PizzaModel, GameState
} from "../model";
import type { PizzaView } from "../view";
import type { PizzaState } from "./state";
import type { PizzaUI, PizzaTopUI, ButtonHit } from "../ui";
import type { Topping } from "../toppings/topping";
import * as States from "./index";
import * as Toppings from "../toppings";

const COLOR_TOPPING_LABEL = "#c8c8c8";

export class Build implements PizzaState {
    private selectedIndex = 0;
    private toppings: Topping[] = [];

    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Build;
        this.toppings = view.allToppings;
        this.toppings.forEach(t => t.clear(model));
        this.toppings.forEach(t => t.sync(model));
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        if (hit === "minus") {
            this.toppings[this.selectedIndex].decrease(model);
        } else if (hit === "plus") {
            this.toppings[this.selectedIndex].increase(model);
        } else if (hit === "toppingPrev") {
            this.selectedIndex = (this.selectedIndex - 1 + this.toppings.length) % this.toppings.length;
        } else if (hit === "toppingNext") {
            this.selectedIndex = (this.selectedIndex + 1) % this.toppings.length;
        } else if (hit === "clear") {
            this.toppings.forEach(t => t.clear(model));
        } else if (hit === "bake") {
            return new States.default.Baking();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        const topping = this.toppings[this.selectedIndex];
        ui.begin();

        ui.leftOfCenterBtn("CLEAR", "clear", 0);
        ui.centeredBtn("BAKE PIZZA", "bake", 0);

        ui.sideBtn("left", "\u2212", "minus", 1);
        ui.sideBtn("right", "+", "plus", 1);
        ui.progressBar(topping.count, topping.maxCount, 1);

        ui.sideBtn("left", "<", "toppingPrev", 2);
        ui.sideBtn("right", ">", "toppingNext", 2);
        ui.label(topping.label, COLOR_TOPPING_LABEL, 2);
        ui.end();
    }

    drawTopUI(model: PizzaModel, topUi: PizzaTopUI): void {
        topUi.begin();
        topUi.label("CUSTOMIZE YOUR PIZZA");
        topUi.end();
    }
}
