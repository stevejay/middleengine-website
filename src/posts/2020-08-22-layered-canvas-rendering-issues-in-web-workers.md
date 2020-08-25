---
layout: post
title: "A layered canvas rendering issue in Web Workers"
summary: Using layered canvases is a common optimisation when rendering complex scenes in Web apps. I demonstrate a rendering issue that I have found in Chrome when rendering to layered canvases from Web Workers.
date: 2020-08-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 77
---

## Introduction

A recommended optimisation when using a [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) HTML element to render a complex scene is to [use multiple canvases layered together](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) rather than just a single canvas. This post details an issue that I have found in Chrome when using the [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) to render to layered canvases from within a Web Worker.

**Note:** The `<canvas>` element also supports displaying 3D graphics using the [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), but in this post I have only used the 2D Canvas API for rendering.{class=note}

## Web Workers and layered canvases

I was interested in trying the new and experimental [`HTMLCanvasElement.transferControlToOffscreen`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen) method to be able to render to a `<canvas>` element from within a Web Worker. The advantage is that it removes the rendering code from the main thread, hopefully improving the responsiveness of the page. The `transferControlToOffscreen` method is already supported in Chrome so I decided to convert some code from an image editor I have been working on to offload its canvas rendering to a Web Worker.

The image editor uses the layered canvases optimisation. Imagine that you are creating an image editor that supports multiple layers, but the user can only draw to the currently selected layer. One approach is to use a single `<canvas>` element to display all of the layers, but this will be inefficient. You have to redraw all of the layers whenever the user draws to the current layer, even though the layers above and the layers below have not changed. A better approach is to use three `<canvas>` elements, one for the layers below, one for the current layer, and one for the layers above. Now you can just redraw the current layer's `<canvas>` element when the user draws to it. It is only when the user performs an action like zooming in or out of the image that you need to redraw all of the canvases.

## Problems with update timings

I soon saw a problem with the image editor conversion: when all of the layered canvases need to be redrawn, for example when zooming, all of the updates do not necessarily occur on the same frame. This is despite the fact that I issue all of the updates within the same `requestAnimationFrame` callback. The result can be tearing, where one canvas layer has been updated with the new image data but the other canvas layers have not and so they still display the old image data. Importantly, this tearing does not happen _at all_ if rendering is performed on the main thread.

To show this, I have created a widget that consists of two equal-sized canvases, one on top of the other. Using the Canvas API I fill the lower canvas with grey, except for a square in the centre. I then draw a square in the centre of the upper canvas that exactly covers the empty area on the lower canvas:

![](/images/2020-08-22-layered-canvas-rendering-issues-in-web-workers/canvas-rendering-test-image-2x.png "Canvas test with two layered canvases")

A slider is used to control the size of the squares, simulating zooming in and out of the image. The color behind the canvases is [rebeccapurple](https://medium.com/@valgaze/the-hidden-purple-memorial-in-your-web-browser-7d84813bb416). When the slider is moved, both canvases are updated to show the grey/empty square at its new size. If the two canvases always get updated on the same frame then the purple background will never be visible, since the square on the upper canvas and the hole in the bottom canvas will always match up exactly. However, if the canvases get updated on different frames then there will be a moment when one canvas will have been updated with the new square size while the other canvas will still be showing the old image. If this happens when zooming out, the purple background may become momentarily visible.

I tried this test in Chrome v84 on macOS v10.15 Catalina, once when the canvas updates were performed on the main thread and once when they were performed on the Web Worker. I never saw the purple background when they were performed on the main thread, but I regularly did when they were performed on the Web Worker. This is a video of what I saw when using the Web Worker:

![](/images/2020-08-22-layered-canvas-rendering-issues-in-web-workers/tearing-1-2x.gif "Tearing when using a Web Worker for canvas updates")

I also sometimes saw nasty rendering glitches where nearly the entire canvas flashed white:

![](/images/2020-08-22-layered-canvas-rendering-issues-in-web-workers/tearing-2-2x.gif "Flashes when using a Web Worker for canvas updates")

If you want to try this test for yourself then the HTML file I used is available <a href="/iframes/canvas-tearing.html" data-turbolinks="false">here</a>. It contains two demonstration widgets. The first one uses a Web Worker to update the canvases and the second one uses the main thread. The file will only work in a browser that supports `transferControlToOffscreen`.

## Conclusion

Rendering to a canvas using the Canvas API from a Web Worker has an issue with timing in Chrome that may impact the common rendering optimisation of using layered canvases for complex scenes. This is something to be aware of if you are looking to move rendering off of the main thread and onto a Web Worker. That said, it is an experimental feature and hopefully this issue will be rectified.

---

## Changelog

- 2020-08-24 Initial version
- 2020-08-25 Plain english improvements
