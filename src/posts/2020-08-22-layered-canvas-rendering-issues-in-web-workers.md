---
layout: post
title: "A layered canvas rendering issue in Web Workers"
summary: An issue that I found in Chrome when rendering to layered canvases from Web Workers.
date: 2020-08-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 77
---

## Introduction

When using a [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) element to render a complex scene, a common optimisation is to use [multiple layered canvases](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) rather than a single canvas. In this post I discuss an issue I found in Chrome when using the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) to render to layered canvases in a Web Worker.

**Note:** The `<canvas>` element also supports displaying 3D graphics using the [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), but in this post I have only used the 2D Canvas API.{class=note}

## Web Workers and layered canvases

I wanted to try the new and experimental [`transferControlToOffscreen`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen) method. You can use this method to transfer control of a `<canvas>` element from the main thread to a Web Worker. This allows you to move your rendering code to the worker, hopefully improving performance and responsiveness. The method is currently supported in Chromium-based browsers. I decided to convert an image editor I have been working on to use a Web Worker for canvas rendering.

The image editor uses the layered canvases optimisation. Imagine that you are creating an image editor that supports many layers. In this editor, the user can only draw to the currently selected layer. One approach is to use a single `<canvas>` element to display all the layers, but this will be inefficient. You will have to redraw all layers when the user draws to the current layer. This is despite the fact that the layers above and the layers below have not changed. You could instead use three `<canvas>` elements: one for the layers below, one for the current layer, and one for the layers above. Now you have to redraw only the current layer's `<canvas>` element when the user draws to it. You only need to redraw all canvases when the user performs an action like zooming in or out of the image.

## Problems with update timings

I soon saw a problem with the updated image editor. When all the layered canvases need to be redrawn, the updates do not always occur on the same frame. This happens even though I issue all the updates in the same `requestAnimationFrame` callback. The result can be tearing: one canvas layer get updated with the new image data but the other canvas layers do not. The other layers continue to show the old image data until the next frame. This tearing does not happen at all when performing the rendering on the main thread.

To show this, I have created a widget that consists of two equal-sized canvases, one on top of the other. Using the Canvas API I fill the lower canvas with grey, except for a square in the centre. I then draw a square in the centre of the upper canvas that exactly covers the empty area on the lower canvas:

![](/images/2020-08-22-layered-canvas-rendering-issues-in-web-workers/canvas-rendering-test-image-2x.png "Canvas test with two layered canvases")

I use a slider to control the size of the squares, simulating zooming in and out of the image. The colour behind the canvases is [rebeccapurple](https://medium.com/@valgaze/the-hidden-purple-memorial-in-your-web-browser-7d84813bb416). When I move the slider, both canvases get updated to show the grey/empty square at its new size. If the two canvases always get updated on the same frame then the purple background will never be visible. The square on the upper canvas and the hole in the bottom canvas will always match up exactly. If the canvases get updated on different frames then there will be a momentary mismatch. One canvas will show the new square size while the other canvas will still show the old image. If this happens when zooming out, the purple background may become visible for a moment.

I tried this test in Chrome v84 on macOS v10.15 Catalina and Windows 10. I first tried it when performing the canvas updates on the main thread and then when performing the updates on the Web Worker. I never saw the purple background when using the main thread, but I did when using the Web Worker, as shown in this video:

![](/images/2020-08-22-layered-canvas-rendering-issues-in-web-workers/tearing-1-2x.gif "Tearing when using a Web Worker for canvas updates")

I also sometimes saw nasty rendering glitches when the canvases flashed white:

![](/images/2020-08-22-layered-canvas-rendering-issues-in-web-workers/tearing-2-2x.gif "Flashes when using a Web Worker for canvas updates")

If you want to try this test for yourself then the HTML file I used is available <a href="/iframes/canvas-tearing.html" data-turbolinks="false">here</a>. It contains two demonstration widgets. The first one uses a Web Worker to update the canvases and the second one uses the main thread. The file will only work in a browser that supports `transferControlToOffscreen`.

## Conclusion

I found a timing issue in Chrome when using the Canvas API to render to a canvas from a Web Worker. It impacts the common rendering optimisation of using layered canvases for complex scenes. This is something to be aware of if you are looking to move rendering off of the main thread and onto a Web Worker. That said, rendering to a canvas from a Web Worker is an experimental feature and hopefully this issue will get resolved.

---

## Changelog

- 2020-08-24 Initial version
- 2020-08-25 Plain English improvements
