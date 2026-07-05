import {
    type PizzaModel, GameState, BAKING_DURATION
} from "../model";
import type { PizzaView } from "../view";
import type { PizzaState } from "./state";
import type { PizzaUI, ButtonHit } from "../ui";
import { Baked } from "./baked";

const DOTS_INTERVAL_MS = 400;
const DOTS_STEPS = 4;
const COLOR_BAKING_LABEL = "#c78f36";

export class Baking implements PizzaState {
    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Baking;
        model.bakingProgress = 0;
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        model.bakingProgress = Math.min(1, model.bakingProgress + dt / BAKING_DURATION);
        view.applyBakingColors(model.bakingProgress, model);
        if (model.bakingProgress >= 1) return new Baked();
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        const dots = ".".repeat(Math.floor(Date.now() / DOTS_INTERVAL_MS) % DOTS_STEPS);
        const blankDots = " ".repeat(dots.length);
        ui.begin();
        ui.label(`${blankDots}BAKING${dots}`, COLOR_BAKING_LABEL, 0);
        ui.end();
    }
}