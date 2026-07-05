import * as THREE from "three";

export function makeCircle(radius: number): THREE.BufferGeometry {
    const segments = 96;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(radius * Math.cos(a), 0, radius * Math.sin(a)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
}

export function makeWavyCircle(
    baseR: number,
    variation: number,
    bumps: number,
    phase = 0
): THREE.BufferGeometry {
    const segments = 128;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const r = baseR + variation * Math.sin(bumps * a + phase);
        pts.push(new THREE.Vector3(r * Math.cos(a), 0, r * Math.sin(a)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
}

export function makeWavyRing(
    outerR: number,
    baseInnerR: number,
    variation: number,
    bumps: number,
    phase = 0
): THREE.BufferGeometry {
    const segments = 128;
    const verts: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        const innerR = baseInnerR + variation * Math.sin(bumps * a + phase);
        const co = Math.cos(a), si = Math.sin(a);
        verts.push(outerR * co, 0, outerR * si);
        verts.push(innerR * co, 0, innerR * si);
    }
    for (let i = 0; i < segments; i++) {
        const o = i * 2, n = (i + 1) * 2;
        idx.push(o, o + 1, n);
        idx.push(o + 1, n + 1, n);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(verts, 3));
    geo.setIndex(idx);
    return geo;
}
