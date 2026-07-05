import * as THREE from "three";

export const ROW_H_NDC = 0.22;
export const MAX_ROWS = 3;
const PANEL_BOTTOM = -1.0;
const MIN_TEX_HEIGHT = 8;
const BTN_PADDING = 2;
const BTN_FONT_RATIO = 0.5;
const MIN_BTN_FONT_SZ = 6;
const LABEL_FONT_RATIO = 0.42;
const MIN_LABEL_FONT_SZ = 4;
const CENTER_BTN_WIDTH_RATIO = 0.5;
const COLOR_BTN_BG = "#080808";
const COLOR_BTN_BORDER = "#c78f36";
const COLOR_BTN_TEXT = "#f6ce4a";
const COLOR_LABEL_DEFAULT = "#c8c8c8";

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
    private btnFontSz = 8;
    private labelFontSz = 10;
    private rowH = 1;
    private regions: ButtonRegion[] = [];

    get panelH(): number { return ROW_H_NDC * MAX_ROWS; }
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
        const texH = Math.max(MIN_TEX_HEIGHT, Math.round(texW * (this.panelH / 2)));
        this.texW = texW;
        this.texH = texH;
        this.offscreen.width = texW;
        this.offscreen.height = texH;
        this.rowH = Math.floor(texH / MAX_ROWS);
        this.btnSz = this.rowH - BTN_PADDING * 2;
        this.btnFontSz = Math.max(MIN_BTN_FONT_SZ, Math.floor(this.btnSz * BTN_FONT_RATIO));
        this.labelFontSz = Math.max(MIN_LABEL_FONT_SZ, Math.floor(this.rowH * LABEL_FONT_RATIO));
        this.btnLX1 = BTN_PADDING;
        this.btnRX1 = texW - BTN_PADDING - this.btnSz;
        const cw = Math.floor(texW * CENTER_BTN_WIDTH_RATIO);
        this.btnCX1 = Math.floor((texW - cw) / 2);
        this.btnCX2 = this.btnCX1 + cw;
    }

    begin(): void {
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.clearRect(0, 0, this.texW, this.texH);
        this.regions = [];
    }

    end(): void {
        this.tex.needsUpdate = true;
    }

    sideBtn(side: "left" | "right", label: string, id: ButtonHit, row = 0): void {
        const x1 = side === "left" ? this.btnLX1 : this.btnRX1;
        const rowY = (MAX_ROWS - 1 - row) * this.rowH;
        const y = rowY + BTN_PADDING;
        const { ctx, btnSz, btnFontSz } = this;
        ctx.fillStyle = COLOR_BTN_BG;
        ctx.fillRect(x1, y, btnSz, btnSz);
        ctx.strokeStyle = COLOR_BTN_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(x1 + 0.5, y + 0.5, btnSz - 1, btnSz - 1);
        ctx.fillStyle = COLOR_BTN_TEXT;
        ctx.font = `bold ${btnFontSz}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x1 + btnSz / 2, y + btnSz / 2);
        this.regions.push({ id, x1, x2: x1 + btnSz, y1: y, y2: y + btnSz });
    }

    centeredBtn(label: string, id: ButtonHit, row = 0): void {
        const { ctx, btnFontSz } = this;
        const x1 = this.btnCX1;
        const w = this.btnCX2 - this.btnCX1;
        const h = this.btnSz;
        const rowY = (MAX_ROWS - 1 - row) * this.rowH;
        const y = rowY + BTN_PADDING;
        ctx.fillStyle = COLOR_BTN_BG;
        ctx.fillRect(x1, y, w, h);
        ctx.strokeStyle = COLOR_BTN_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(x1 + 0.5, y + 0.5, w - 1, h - 1);
        ctx.fillStyle = COLOR_BTN_TEXT;
        ctx.font = `bold ${btnFontSz}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, x1 + w / 2, y + h / 2);
        this.regions.push({ id, x1, x2: x1 + w, y1: y, y2: y + h });
    }

    label(text: string, color = COLOR_LABEL_DEFAULT, row = 0): void {
        const { ctx, texW, labelFontSz, rowH } = this;
        ctx.fillStyle = color;
        ctx.font = `bold ${labelFontSz}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, texW / 2, (MAX_ROWS - 1 - row) * rowH + rowH / 2);
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
