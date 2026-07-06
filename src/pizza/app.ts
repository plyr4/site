import { createModel, createModelFromSeed } from "./model";
import { PizzaView } from "./view";
import { PizzaUI as PizzaBottomUI, PizzaTopUI } from "./ui";
import { PizzaController } from "./controller";

export type BakedPizza = { createdAt: string; seed: string; toppings: Record<string, number> };

export function runPizzaShop(canvas: HTMLCanvasElement): void {
    const model = createModel();
    const ui = new PizzaBottomUI();
    const topUi = new PizzaTopUI();
    const view = new PizzaView(canvas, ui.tex, 1, topUi.tex);
    view.setDefaultToppings(model);
    view.rebuild(model);
    const controller = new PizzaController(model, view, ui, topUi);

    canvas.addEventListener("click", (e: MouseEvent) => controller.handleClick(e));
    canvas.addEventListener("mousemove", (e: MouseEvent) => controller.handleMouseMove(e));

    function loop(time: number): void {
        controller.update(time);
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
}

export function renderBakedPizza(canvas: HTMLCanvasElement, pizza: BakedPizza, zoom = 1.5): () => void {
    const model = createModelFromSeed(pizza.seed);
    const view = new PizzaView(canvas, null, zoom);
    view.rebuild(model);
    view.allToppings.forEach(t => {
        t.count = pizza.toppings[t.label.toLowerCase()] ?? 0;
        t.sync(model);
    });
    view.applyBakingColors(1, model);

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

export function ratePizza(toppings: Record<string, number>): number {
    const counts = Object.entries(toppings)
        .filter(([k]) => k !== "cheese")
        .map(([, v]) => Number(v))
        .filter((v) => v > 0);

    if (counts.length === 0) return 2;

    const n = counts.length;
    const mean = counts.reduce((a, b) => a + b, 0) / n;
    if (mean >= 18) return 1;
    const variety =
        n <= 5 ? (n / 5) ** 0.6 : Math.max(0.7, 1 - (n - 5) * 0.05);
    let amount: number;
    if (mean < 2) amount = 0.3;
    else if (mean <= 8) amount = 0.3 + ((mean - 2) / 6) * 0.7;
    else if (mean <= 14) amount = 1 - ((mean - 8) / 6) * 0.65;
    else amount = Math.max(0.05, 0.35 - ((mean - 14) / 4) * 0.3);
    const variance = counts.reduce((a, v) => a + (v - mean) ** 2, 0) / n;
    const cv = n > 1 ? Math.sqrt(variance) / mean : 0;
    const balance = Math.max(0.3, 1 - cv * 0.5);
    const raw = variety * (0.55 * amount + 0.45 * balance);
    return Math.max(1, Math.min(10, Math.round(raw * 10)));
}
