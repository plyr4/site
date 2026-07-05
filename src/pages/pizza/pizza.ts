import { createModel } from "./model";
import { PizzaView } from "./view";
import { PizzaUI } from "./ui";
import { PizzaController } from "./controller";

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
