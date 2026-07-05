import { createModel, createModelFromSeed } from "./model";
import { PizzaView } from "./view";
import { PizzaUI } from "./ui";
import { PizzaController } from "./controller";

export type BakedPizza = { seed: string; toppings: Record<string, number> };

export function renderBakedPizza(canvas: HTMLCanvasElement, pizza: BakedPizza, zoom = 1.5): () => void {
    const model = createModelFromSeed(pizza.seed, pizza.toppings.pepperoni ?? 0, pizza.toppings.cheese ?? 0);
    const view = new PizzaView(canvas, null, zoom);
    view.rebuild(model);
    view.toppings.forEach(t => t.sync(model));
    view.applyBakingColors(1, model);
    view.startSteam();

    let animId: number;
    function loop(time: number): void {
        view.render(model, time);
        animId = requestAnimationFrame(loop);
    }
    animId = requestAnimationFrame(loop);

    return () => {
        cancelAnimationFrame(animId);
        view.dispose();
    };
}

export function runPizzaShop(canvas: HTMLCanvasElement): void {
    const model = createModel();
    const ui = new PizzaUI();
    const view = new PizzaView(canvas, ui.tex);
    const controller = new PizzaController(model, view, ui);

    canvas.addEventListener("click", (e: MouseEvent) => controller.handleClick(e));
    canvas.addEventListener("mousemove", (e: MouseEvent) => controller.handleMouseMove(e));

    function loop(time: number): void {
        controller.update(time);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}
