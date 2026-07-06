import type { PizzaModel } from "./model";
import type { PizzaView } from "./view";
import type { PizzaUI, PizzaTopUI } from "./ui";
import { type PizzaState } from "./states/state";
import * as States from "./states";

export class PizzaController {
    private model: PizzaModel;
    private view: PizzaView;
    private ui: PizzaUI;
    private topUi: PizzaTopUI;
    private lastTime = 0;
    private currentState: PizzaState;

    constructor(model: PizzaModel, view: PizzaView, ui: PizzaUI, topUi: PizzaTopUI) {
        this.model = model;
        this.view = view;
        this.ui = ui;
        this.topUi = topUi;
        this.currentState = new States.default.Start();
        this.currentState.onEnter(model, view);
    }

    private transition(next: PizzaState): void {
        this.currentState = next;
        next.onEnter(this.model, this.view);
    }

    handleClick(e: MouseEvent): void {
        const hit = this.ui.hitTest(e, this.view.getCanvas());
        if (!hit) return;
        const next = this.currentState.handleInput(hit, this.model, this.view);
        if (next) this.transition(next);
    }

    handleMouseMove(e: MouseEvent): void {
        const canvas = this.view.getCanvas();
        canvas.style.cursor = this.ui.hitTest(e, canvas) ? "pointer" : "default";
    }

    update(time: number): void {
        const dt = this.lastTime > 0 ? (time - this.lastTime) / 1000 : 0;
        this.lastTime = time;

        const next = this.currentState.update(dt, this.model, this.view);
        if (next) this.transition(next);

        this.ui.resize(this.view.getCanvas().clientWidth);
        this.currentState.drawUI(this.model, this.ui);

        this.topUi.resize(this.view.getCanvas().clientWidth);
        this.currentState.drawTopUI(this.model, this.topUi);

        this.view.render(this.model, time);
    }
}
