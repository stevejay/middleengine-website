---
layout: post
title: "Behaviours of the HTML canvas element"
summary: Various behaviours that I have noted when using the HTML canvas element with the Canvas API.
date: 2020-08-06
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
draft: true
---

## Introduction

The [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) is a powerful and performant API for drawing and manipulating two-dimensional (2D) graphics in a Web browser. Drawing can be performed using the [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) HTML element or an instance of the ['OffscreenCanvas'](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas) class. Having used the Canvas API recently, I have observed certain behaviours and I thought it would be useful to detail them in a blog post.

Note: The `<canvas>` element also supports displaying three-dimensional (3D) graphics using the [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), but in this post I focus solely on its use for 2D graphics.

## Software and GPU canvases

In rendering content to a `<canvas>` element or `OffscreenCanvas` instance, browsers can choose to either use the CPU or the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit) for this purpose. In this post I refer to the former as a software canvas and the latter as a GPU canvas. Generally a GPU canvas is preferred because this results in hardware-accelerated rendering, but both approaches have advantages and disadvantages. Because of this, the browser might include complex heuristics for deciding which to use, potentially even [changing the approach after the initial decision](https://www.reddit.com/r/javascript/comments/ac9hdb/calling_getimagedata_potentially_puts_you_canvas/) in response to how it sees the canvas is being used.

The size of the canvas is a potential heuristic in the decision. A very small canvas might be better handled by the CPU, and a very large canvas or a canvas created when there are already many GPU canvases might also benefit being a software canvas in order to not overload the GPU.

An important heuristic is whether or not [`CanvasRenderingContext2D.getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) and [`CanvasRenderingContext2D.putImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData) are used with the canvas. Generally these methods are used to read the values of particular pixels and potentially do processing on them, such as applying a desaturation filter. If the canvas is a GPU canvas then these methods require a GPU to CPU transfer (sometimes termed a GPU readback), which is [known as being a slow operation](https://superuser.com/questions/1478985/why-is-there-a-bottleneck-sending-data-from-a-gpu-to-a-cpu-but-less-so-from-cp). If the canvas is often being used in this way then it might be better if it was a software canvas. Indeed, browsers are starting to support a new [`willReadFrequently`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) 2D canvas context attribute that will allow you to choose to get a software canvas when you know your use case will benefit from it.

The use of these heuristics does point to a fundamental limitation of the Canvas API: you are beholden to the browser as to whether a given canvas is a software canvas or a GPU canvas. Although the `willReadFrequently` attribute will ensure that you can get a software canvas when you need it, in other situations you are relying on the browser's heuristics and these can change between releases. It is possible for a canvas to be a GPU canvas when your app runs in the current version of a browser but then be downgraded in the next release because of a change to the heuristics. This would likely be a major and unexpected performance regression in many Web apps. If you have a canvas that uses `getImageData` and/or `putImageData` sparingly then I suggest considering removing those usages in order to not potentially trigger a software canvas now or in the future. To replace `getImageData` you can create a temporary canvas, use [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) to copy the pixels of interest to it, and then use `getImageData` on that temporary canvas. Similarly you can use a temporary canvas for `putImageData` to write to and then use `drawImage` to copy its content to the original canvas.

https://bugs.chromium.org/p/chromium/issues/detail?id=524628
Chrome's 2D canvas implementation has a threshold (256x256) at or below which canvases are not GPU-accelerated.

## drawImage and performance testing

The [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) method of the Canvas API is a synchronous method that allows you to draw an image to a `<canvas>` element or `OffscreenCanvas` instance. It accepts several types of image source, including another `<canvas>` element, and it allows you to crop and/or scale the image in the process. I was interested to understand the performance cost of scaling with various combinations of source and target image sizes, and so I created [this performance test](https://jsbench.me/1dke2mcybs/2) on the JSBench.me Web site.

The test is quite simple. In the set-up I create a small source `<canvas>` element, filled with a single color, and create a large destination `<canvas>` element. Then in each test I just invoke `drawImage` with some particular set of parameters:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  1000,
  1000
);
```

However, when I ran the test in Chrome v84 on macOS v10.15 (Catalina), my computer first froze and then a few moments later crashed. I then created [this new test](https://jsbench.me/nmke2uordl/1) that had a smaller destination canvas, which still caused the browser to freeze for a short while but did not lead to a crash. When running this test I see a major spike in CPU usage and the performance seems too good to be true, at over 300,000 operations per second.

This behaviour can be explained if the `drawImage` call does not result in the specified drawing action being performed immediately, but rather that the action gets deferred by a batching mechanism in order to reduce the number of expensive GPU render calls. This means that the `drawImage` call itself executes very quickly, giving the appearance of a fast function that the JSBench.me code opts to invoke many times, presumably to improve the accuracy of the benchmark. This results in there being many pending `drawImage` actions which take time and computing resources to complete. The freezing of the GUI is explained if the tests run on the site's main JavaScript thread (rather than in a Web Worker), and it seems the required computing resources can be enough to crash a computer.

I reasoned that I needed to find a way to caused the batched action to be flushed immediately. Looking at the WebKit performance tests in the Chromium source code, I see tests for `drawImage` [like this one](https://github.com/chromium/chromium/blob/2ca8c5037021c9d2ecc00b787d58a31ed8fc8bcb/third_party/blink/perf_tests/canvas/draw-dynamic-canvas-2d-to-hw-accelerated-canvas-2d.html) that include a completion action for exactly this purpose:

```js
function ensureComplete() {
  // Using destCanvas2D as a source image is just to flush out the content when
  // accelerated 2D canvas is in use.
  dummyCtx2D.drawImage(destCanvas2D, 0, 0, 1, 1, 0, 0, 1, 1);
}
```

Thus I tried adding a second `drawImage` call to my test:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  1000,
  1000
);
$destContext.drawImage($destCanvas, 0, 0, 1, 1, 0, 0, 1, 1);
```

However I still found issues with browser freezing but more importantly with significant variance in the test runs:

![](/images/2020-08-06-behaviours-of-the-html-canvas-element/perf-variance-2x.png "Significant variance in the initial performance tests")

I decided to try the approach of reading the value of a single pixel in the destination canvas directly after the `drawImage` call in the hope that this would force a flush. I thought of two ways of doing this:

- Using [`createImageBitmap`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap) to read a 1 pixel by 1 pixel area of the destination canvas.
- Using [`CanvasRenderingContext2D.getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) to read a 1 pixel by 1 pixel area of the destination canvas.

Using `createImageBitmap` worked well and the resulting performance test suite can be found [here](https://jsbench.me/ooke36wtsw/1). The following is an example test from that test suite:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  600,
  600
);
// Force the drawImage call to be evaluated within this benchmark code:
createImageBitmap($destCanvas, 0, 0, 1, 1).then(() => deferred.resolve());
```

Since `createImageBitmap` returns a Promise, I needed to run the performance test in asynchronous mode. When run, I find that Chrome still freezes for several seconds but the results look valid:

| Test                                                                     | Result                 |
| ------------------------------------------------------------------------ | ---------------------- |
| Scaling from a 100x100 canvas area to a 100x100 canvas area (no scaling) | 1477.82 ops/s ± 10.53% |
| Scaling from a 100x100 canvas area to a 600x600 canvas area              | 909.52 ops/s ± 6.92%   |
| Scaling from a 100x100 canvas area to a 3000x3000 canvas area            | 438.64 ops/s ± 54.69%  |

I then tried using `getImageData`; the resulting performance test suite can be found [here](https://jsbench.me/0eke37hgep/1). The following is an example test using it:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  $sourceWidth,
  $sourceHeight
);
// Force the drawImage call to be evaluated within this benchmark code:
$destContext.getImageData(0, 0, 1, 1);
```

When this test suite is run, there is no page freezing but the results are, shall we say, surprising:

| Test                                                                     | Result              |
| ------------------------------------------------------------------------ | ------------------- |
| Scaling from a 100x100 canvas area to a 100x100 canvas area (no scaling) | 9.88 ops/s ± 11.74% |
| Scaling from a 100x100 canvas area to a 600x600 canvas area              | 8.29 ops/s ± 5.9%   |
| Scaling from a 100x100 canvas area to a 3000x3000 canvas area            | 8.36 ops/s ± 2.74%  |

Canvas rendering is implemented in Chrome using a graphics engine called [Skia](https://en.wikipedia.org/wiki/Skia_Graphics_Engine). Skia supports a variety of types of rendering, including CPU rendering and GPU hardware-accelerated rendering. Where possible, Chrome uses hardware acceleration for canvas rendering, but this is not always the case. As I understand it, if you use `getImageData` on a 2D canvas, hardware acceleration will be disabled on it and from then on the canvas will be rendered by the CPU. (I believe Skia used to use a complex set of heuristics for when to disable hardware acceleration but it was removed relatively recently in favour of this simpler behaviour.)

CPU canvas: https://www.reddit.com/r/javascript/comments/ac9hdb/calling_getimagedata_potentially_puts_you_canvas/
Figma's approach and thoughts: https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/
Heuristics: https://chromium.googlesource.com/chromium/src/+/41d279a5476937a3981a8413be722d42da0de0d2/third_party/WebKit/Source/platform/graphics/ExpensiveCanvasHeuristicParameters.h
Google GPU readbacks
Bug where turning off of gpu acceleration was a problem: https://monorail-prod.appspot.com/p/chromium/issues/detail?id=650116
And this one: https://bugs.chromium.org/p/chromium/issues/detail?id=652906

looking for gpu acceleration: From the traces it is easy to confirm that gpu acceleration is being used in the good case (Canvas2DLayerBridge::flush) on the main thread. In the bad case, we are in software rendering mode (non-display list).

I reasoned that I needed a way to prevent the browser deferring the drawing action that the `drawImage` method performs. In theory one way to do this is to read the value of a pixel from the destination canvas immediately after the `drawImage` call, so forcing the evaluation of that call to occur within the test. I could think of two ways of doing this:

- Using [`CanvasRenderingContext2D.getImageData()`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData).
- Using ['createImageBitmap`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap).

I could think of two ways

// $destContext.getImageData(0, 0, 1, 1);
//$destContext.fillRect(0, 0, 1, 1);

The only way I could see to do this was to get the value of a pixel from the destination canvas immediately after the `drawImage` call, as part of each test:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  1000,
  1000
);
// Force the drawImage call to be evaluated within this benchmark code:
$destContext.getImageData(0, 0, 1, 1);
```

(Note that it is not sufficient to add the extra line to the test's teardown function.)

The result is that only a few invocations of the test are run and the browser does not freeze or crash. The problem now is t

createImageBitmap(\$destCanvas, 0, 0, 1, 1).then(() => deferred.resolve());

Running the test froze my machine while it ran and the result for

You can see a more extreme example of the problem in [this peformance test](https://jsbench.me/1dke2mcybs/1) on the JSBench.me (**warning** this test crashes my laptop so run it at your own peril).

The issue appears to be that, in this case, the actual drawing performed by `drawImage` appears to get deferred.

particularly with regards scaling up a small source image onto a large target canvas.

is a flexible way to draw an image to a canvas.

Testing the performance of DrawImage

The problem with performance testing DrawImage

## Layered canvas issues

A recommended optimisation when using the `<canvas>` element for complex scenes is to [use multiple layered canvases](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas).

Say you are creating an image editor that supports multiple layers in the image, but the user can only draw to the currently selected layer. One approach is to use a single `<canvas>` element to display all of the layers, but this is inefficient: you have to redraw all layers whenever the user draws to the current layer, even though the layers above and the layers below have not changed.

despite there being no changes to the layers below and the layers above. An alternative approach is to use three `<canvas>` elements, one for the layers below, one for the current layer, and one for the layers above. With this approach, you only need to redraw the current layer's canvas when the user draws on it; the two other canvases

Rather than using one canvas and redrawing all layers when the user draws on the current layer, you could instead use separate canvases for the layers below, the current

A recommended optimisation when using

is to use multiple canvas elements that are layered on top of the other rather than a single canvas element.

https://stackoverflow.com/questions/4899799/whats-the-best-way-to-set-a-single-pixel-in-an-html5-canvas

I recently had reason to wonder what the fastest way to set a single pixel on a `<canvas>` element was. I found [this question](https://stackoverflow.com/questions/4899799/whats-the-best-way-to-set-a-single-pixel-in-an-html5-canvas) on Stack Overflow. From the answers, the two main contenders are:
