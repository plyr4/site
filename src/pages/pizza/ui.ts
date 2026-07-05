import * as THREE from "three";

export const ROW_H_NDC = 0.22;
const PANEL_BOTTOM = -1.0;

export type ButtonHit = "minus" | "plus" | "build" | "bake" | "retry" | "toppingPrev" | "toppingNext" | null;

interface ButtonRegion {
    id: ButtonHit;
    x1: number;
    x2: number;
    y1: number;
    y2: number;
}

export class PizzaUI {
    private offscreen: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private texW = 1;
    private texH = 1;
    private btnSz = 1;
    private btnLX1 = 0;
    private btnRX1 = 0;
    private btnCX1 = 0;
    private btnCX2 = 0;
    private btnFontSz = 12;
    private labelFontSz = 10;
    private rowH = 1;
    private regions: ButtonRegion[] = [];

    get panelH(): number { return ROW_H_NDC; }
    get panelY(): number { return PANEL_BOTTOM + this.panelH / 2; }

    readonly tex: THREE.CanvasTexture;

    constructor() {
        this.offscreen = document.createElement("canvas");
        this.offscreen.width = 1;
        this.offscreen.height = 1;
        this.ctx = this.offscreen.getContext("2d")!;

        this.tex = new THREE.CanvasTexture(this.offscreen);
        this.tex.generateMipmaps = false;
        this.tex.magFilter = THREE.LinearFilter;
        this.tex.minFilter = THREE.LinearFilter;
    }

    resize(canvasClientWidth: number): void {
        const texW = Math.max(1, Math.floor(canvasClientWidth * window.devicePixelRatio));
        const texH = Math.max(8, Math.round(texW * (this.panelH / 2)));
        this.texW = texW;
        this.texH = texH;
        this.offscreen.width = texW;
        this.offscreen.height = texH;
        this.rowH = texH;
        this.btnSz = this.rowH - 4;
        this.btnFontSz = Math.max(6, Math.floor(this.btnSz * 0.7));
        this.labelFontSz = Math.max(4, Math.floor(this.rowH * 0.42));
        this.btnLX1 = 2;
        this.btnRX1 = texW - 2 - this.btnSz;
        const cw = Math.floor(texW * 0.38);
        this.btnCX1 = Math.floor((texW - cw) / 2);
        this.btnCX2 = this.btnCX1 + cw;
    }

    begin(): void {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.fillStyle = "#060606";
        this.ctx.fillRect(0, 0, this.texW, this.texH);
        this.regions = [];
    }

    end(): void {
        this.tex.needsUpdate = true;
    }

    sideBtn(side: "left" | "right", label: string, id: ButtonHit): void {
        const x1 = side === "left" ? this.btnLX1 : this.btnRX1;
        const y = 2;
        const { ctx, btnSz, btnFontSz } = this;
        ctx.fillStyle = "#080808";
        ctx.fillRect(x1, y, btnSz, btnSz);
        ctx.strokeStyle = "#c78f36";
        ctx.lineWidth = 1;
        ctx.strokeRect(x1 + 0.5, y + 0.5, btnSz - 1, btnSz - 1);
        ctx.fillStyle = "#f6ce4a";
        ctx.font = `bold ${btnFontSz}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x1 + btnSz / 2, y + btnSz / 2);
        this.regions.push({ id, x1, x2: x1 + btnSz, y1: this.rowH, y2: this.rowH + btnSz });
    }

    centeredBtn(label: string, id: ButtonHit): void {
        const { ctx, btnFontSz } = this;
        const x1 = this.btnCX1;
        const w = this.btnCX2 - this.btnCX1;
        const h = this.btnSz;
        const y = 2;
        ctx.fillStyle = "#080808";
        ctx.fillRect(x1, y, w, h);
        ctx.strokeStyle = "#c78f36";
        ctx.lineWidth = 1;
        ctx.strokeRect(x1 + 0.5, y + 0.5, w - 1, h - 1);
        ctx.fillStyle = "#f6ce4a";
        ctx.font = `bold ${btnFontSz}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x1 + w / 2, y + h / 2);
        this.regions.push({ id, x1, x2: x1 + w, y1: y, y2: y + h });
    }

    label(text: string, color = "#c8c8c8", row = 0): void {
        const { ctx, texW, labelFontSz, rowH } = this;
        ctx.fillStyle = color;
        ctx.font = `bold ${labelFontSz}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, texW / 2, row * rowH + rowH / 2);
    }

    hitTest(e: MouseEvent, canvas: HTMLCanvasElement): ButtonHit {
        const rect = canvas.getBoundingClientRect();
        const ny = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        const { panelH, panelY } = this;
        if (ny < panelY - panelH / 2 || ny > panelY + panelH / 2) return null;

        const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        const tx = ((nx + 1) / 2) * this.texW;
        const ty = ((panelY + panelH / 2 - ny) / panelH) * this.texH;

        for (const region of this.regions) {
            if (tx >= region.x1 && tx <= region.x2 && ty >= region.y1 && ty <= region.y2) return region.id;
        }
        return null;
    }
}
