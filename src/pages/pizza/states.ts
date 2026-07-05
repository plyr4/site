import {
    GameState,
    BAKING_DURATION,
    resetModel,
    type PizzaModel,
} from "./model";
import type { PizzaView } from "./view";
import type { PizzaUI, ButtonHit } from "./ui";
import type { Topping } from "./topping";

export interface PizzaState {
    rowCount(): number;
    onEnter(model: PizzaModel, view: PizzaView): void;
    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null;
    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null;
    drawUI(model: PizzaModel, ui: PizzaUI): void;
}

export class StartState implements PizzaState {
    rowCount(): number { return 1; }

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
            return new BuildState();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        ui.begin();
        ui.centeredBtn("BUILD", "build");
        ui.end();
    }
}

export class BuildState implements PizzaState {
    private selectedIndex = 0;
    private toppings: Topping[] = [];

    rowCount(): number { return 2; }

    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Build;
        this.toppings = view.toppings;
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
        } else if (hit === "bake") {
            return new BakingState();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        const topping = this.toppings[this.selectedIndex];
        ui.begin();

        // this button renders at row "zero"
        ui.centeredBtn("BAKE", "bake");

        // these 3 following elements should render one row above the BAKE button
        ui.sideBtn("left", "\u2212", "minus");
        ui.sideBtn("right", "+", "plus");
        ui.label(topping.valueLabel(model), "#f6ce4a");

        // these 3 following elements should render two rows above the BAKE button
        ui.sideBtn("left", "<", "toppingPrev");
        ui.sideBtn("right", ">", "toppingNext");
        ui.label(topping.label, "#c8c8c8");
        ui.end();
    }
}

export class BakingState implements PizzaState {
    rowCount(): number { return 1; }

    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Baking;
        model.bakingProgress = 0;
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        model.bakingProgress = Math.min(1, model.bakingProgress + dt / BAKING_DURATION);
        view.applyBakingColors(model.bakingProgress, model);
        if (model.bakingProgress >= 1) return new BakedState();
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        const dots = ".".repeat(Math.floor(Date.now() / 400) % 4);
        const blankDots = " ".repeat(dots.length);
        ui.begin();
        ui.label(`${blankDots}BAKING${dots}`, "#c78f36", 0);
        ui.end();
    }
}

export class BakedState implements PizzaState {
    rowCount(): number { return 1; }

    onEnter(model: PizzaModel, view: PizzaView): void {
        model.state = GameState.Baked;
    }

    update(dt: number, model: PizzaModel, view: PizzaView): PizzaState | null {
        return null;
    }

    handleInput(hit: ButtonHit, model: PizzaModel, view: PizzaView): PizzaState | null {
        if (hit === "retry") {
            resetModel(model);
            view.rebuild(model);
            return new StartState();
        }
        return null;
    }

    drawUI(model: PizzaModel, ui: PizzaUI): void {
        ui.begin();
        ui.centeredBtn("RETRY", "retry");
        ui.end();
    }
}
