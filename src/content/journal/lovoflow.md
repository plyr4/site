---
title: lovoflow
description: making a game with a single 32x32 texture and a shader
pubDate: 2025-01-29
---

"Lovoflow" was my solo-dev submission for [Global Game Jam](https://globalgamejam.org/) built in a single week for the theme "Bubbles".

![lovoflow](./lovoflow-2.png)

The game runs on an HLSL shader-based implementation of [Metaballs](https://en.wikipedia.org/wiki/Metaballs).

One material powers the game using a 32x32 texture file as input to tell the shader where to draw the metaballs. The shader has various properties to tweak how things are shown, like color, goopiness, and "heat". 

Each pixel of the 32x32 input texture represents a "bubble" or a "metaball" that renders in the shader. The single pixel holds a color value which represents various properties of the bubble. 

For example, the red (R) channel in the input texture represents an ID of a color in a palette lookup table, meaning with an extra lookup we can represent a wide range of colors using a single channel.

A main controller synchronizes the game state with the input texture by writing changes every frame. This tells the shader where bubbles move, which ones collide, etc. This let me integrate cool things like physics into a 2d world rendered entirely via one shader.
