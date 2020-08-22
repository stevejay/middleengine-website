---
layout: post
title: "Observations when using the Canvas Web API"
summary: Various behaviours that I have observed when using the Canvas API to render 2D graphics in Web browsers.
date: 2020-08-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
draft: true
---

## Introduction

The [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) is a rich and performant API for drawing and manipulating two-dimensional (2D) graphics in a Web browser. Drawing can be performed using the [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) HTML element or an [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas). Having recently used the Canvas API, I have observed certain interesting behaviours and I thought it would be useful to detail them in a blog post.

**Note:** The `<canvas>` element also supports displaying three-dimensional (3D) graphics using the [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), but in this post I focus solely on its use in 2D graphics.{class=note}

## CPU and GPU canvases

In rendering content to a given `<canvas>` element or `OffscreenCanvas`, browsers can choose to do so using either the CPU or the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit). In this post I refer to the former as a CPU canvas and the latter as a GPU canvas. Generally a GPU canvas is preferred because rendering is hardware accelerated, but both approaches have advantages and disadvantages. Because of this, the browser might include complex heuristics for deciding which approach to use, potentially even [changing approach after the initial decision](https://www.reddit.com/r/javascript/comments/ac9hdb/calling_getimagedata_potentially_puts_you_canvas/) in response to how it sees the canvas is being used. [This file](https://chromium.googlesource.com/chromium/src/+/41d279a5476937a3981a8413be722d42da0de0d2/third_party/WebKit/Source/platform/graphics/ExpensiveCanvasHeuristicParameters.h) is an example of the heuristics used in an older version of the [Blink](<https://en.wikipedia.org/wiki/Blink_(browser_engine)>) browser engine.

One potential and simple heuristic is the size of the canvas: a very small or very large canvas might be better as a CPU canvas. There is some discussion about how canvas size is important [here in the Blink developers group](https://groups.google.com/a/chromium.org/g/blink-dev/c/NPSQdiXSK4w/m/jgzIaJPJxh8J). The browser might also choose to create any new canvases as CPU canvases regardless of their size if there are already many GPU canvases.

A very important heuristic is whether or not [`CanvasRenderingContext2D.getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) and [`CanvasRenderingContext2D.putImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData) are used with the canvas. Generally these two methods are used to read the values of particular pixels to process them in some way, such as applying a desaturation filter to an image, and they are handled by the CPU not the GPU. If the canvas is a GPU canvas then these methods require a GPU to CPU transfer of the pixel data (sometimes termed a GPU readback) which is [well known for being a slow operation](https://superuser.com/questions/1478985/why-is-there-a-bottleneck-sending-data-from-a-gpu-to-a-cpu-but-less-so-from-cp). It might in fact be better for this canvas to be a CPU canvas to avoid the overhead of GPU readbacks. Indeed, browsers are starting to support a new [`willReadFrequently`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) 2D canvas context attribute that allows you to request a CPU canvas when you know that your use case will benefit from one.

The use of heuristics points to a fundamental limitation of the Canvas API: you are beholden to the browser as to whether a given canvas is a CPU canvas or a GPU canvas. Although the `willReadFrequently` attribute will ensure that you can get a CPU canvas when you need one, you are otherwise relying on heuristics and they can change between browser versions. It is possible for one version of a browser to determine that a given canvas should be a GPU canvas rather than a CPU canvas and for another version to make the opposite determination. This lack of control over GPU acceleration is [one reason that Figma gave](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/) for opting to use WebGL rather than the 2D Canvas API.

If you have a canvas that uses `getImageData` and/or `putImageData` only sparingly then I suggest removing those usages to help prevent triggering a CPU canvas now or in the future. Instead, use a temporary canvas for those operations. When using `getImageData`, first use [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) to copy the pixels of interest to the temporary canvas and then only use `getImageData` on that temporary canvas. When using `putImageData`, use it to write to the temporary canvas and then use `drawImage` to copy from that temporary canvas to the destination canvas. You should also consider if WebGL would be a better choice for canvas rendering in your app.

## Performance testing the `drawImage` method

The [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) method of the Canvas API is a synchronous method that allows you to draw an image to a `<canvas>` element or an `OffscreenCanvas`. It accepts several types of image source, including another `<canvas>` element, and it allows you to crop and/or scale the image at the same time. I was interested to understand the performance cost of scaling for various combinations of source and target image sizes, and so I created [this performance test suite](https://jsbench.me/1dke2mcybs/2) on the [JSBench.me](https://jsbench.me/) Web site.

The test is quite simple. In the set-up I create a small source `<canvas>` element and a large destination `<canvas>` element. Then in each test I just invoke `drawImage` with some particular set of parameters:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  900,
  900
);
```

However, when I ran the test in Chrome v84 on macOS v10.15 (Catalina), the browser and indeed the OS first froze and then a few moments later my laptop crashed. I tried creating [a new test](https://jsbench.me/nmke2uordl/1) with a smaller destination canvas, which prevented a crash but still froze the Web page for the duration. On checking the test result, I decided that it seemed too good to be true: the browser was apparently able to manage over 300,000 `drawImage` operations per second.

My understanding for this behaviour is that the `drawImage` call does not necessarily execute the specified drawing action immediately, but rather that action normally gets deferred as part of a batching mechanism used to reduce the number of GPU render calls. (These calls are expensive so it is worthwhile for the browser to perform this optimisation.) This means that the `drawImage` call itself executes very quickly, giving the appearance of a fast function that the JSBench.me code opts to invoke many times, presumably to improve the accuracy of the benchmark. Thus there will be many pending `drawImage` actions which, when flushed, take time and computing resources to execute, potentially enough to crash the computer.

I reasoned that the answer was to somehow cause the batched action to be flushed within the test body. The WebKit performance tests in the Chromium source code include tests for `drawImage` [like this one](https://github.com/chromium/chromium/blob/2ca8c5037021c9d2ecc00b787d58a31ed8fc8bcb/third_party/blink/perf_tests/canvas/draw-dynamic-canvas-2d-to-hw-accelerated-canvas-2d.html) and those use a completion action to trigger flushing:

```js
function ensureComplete() {
  // Using destCanvas2D as a source image is just to flush out the content when
  // accelerated 2D canvas is in use.
  dummyCtx2D.drawImage(destCanvas2D, 0, 0, 1, 1, 0, 0, 1, 1);
}
```

I tried this approach in [this version](https://jsbench.me/h9ke2s1seb) of the test suite. The following is an example test from that suite:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  900,
  900
);
$destContext.drawImage($destCanvas, 0, 0, 1, 1, 0, 0, 1, 1);
```

I still found issues with the page freezing in Chrome on macOS but more importantly I saw significant variance in execution time of greater than ±100% for the first test. In theory an alternative way to force a flush is to read from the destination canvas immediately after writing to it. There are two ways that I know of to read pixel data from a canvas:

- [`CanvasRenderingContext2D.getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData)
- [`createImageBitmap`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap)

Using `createImageBitmap` works well and the resulting performance test suite can be found [here](https://jsbench.me/ooke36wtsw/1). The following is an example test from that test suite:

```js
$destContext.drawImage(
  $sourceCanvas,
  0,
  0,
  $sourceWidth,
  $sourceHeight,
  0,
  0,
  900,
  900
);
// Force the drawImage call to be evaluated within this benchmark code:
createImageBitmap($destCanvas, 0, 0, 1, 1).then(() => deferred.resolve());
```

Because `createImageBitmap` returns a promise, I run the performance test in asynchronous mode. The page still freezes for several seconds but the results look valid:

| Test                                                                     | Result                 |
| ------------------------------------------------------------------------ | ---------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 1435.57 ops/s ± 17.99% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 848.19 ops/s ± 8.88%   |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 480.4 ops/s ± 31.48%   |

I also tried using `getImageData`, for which the resulting performance test suite can be found [here](https://jsbench.me/0eke37hgep/1). The following is an example test from it:

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

There is no page freezing when this test suite is run, but the results are consistently and surprisingly poor:

| Test                                                                     | Result              |
| ------------------------------------------------------------------------ | ------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 9.88 ops/s ± 11.74% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 8.29 ops/s ± 5.9%   |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 8.36 ops/s ± 2.74%  |

My suspicion is that the destination canvas gets turned into a CPU canvas because of the calls to `getImageData`, and so these results are without hardware acceleration. It is noticeable just how much slower these results are compared to those from the previous test suite. This demonstrates just how much of a performance hit it can be if the browser runs a canvas as a CPU canvas rather than as a GPU canvas.

## Layered canvas issues

A recommended optimisation when using a `<canvas>` element to render a complex scene is to [use multiple canvases layered together](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) rather than a single canvas. Imagine that you are creating an image editor that supports multiple layers, but the user can only draw to the currently selected layer. One approach is to use a single `<canvas>` element to display all of the layers, but this will be inefficient: you have to redraw all of the layers whenever the user draws to the current layer, even though the layers above and the layers below have not changed. A better approach is to use three `<canvas>` elements, one for the layers below, one for the current layer, and one for the layers above. Now you only need to redraw the current layer's `<canvas>` element when the user draws to it, although in some situations you still need to redraw all of the canvases, such as when zooming into or out of the image.

I was interested in using the new and experimental [`HTMLCanvasElement.transferControlToOffscreen`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen) method to be able to render to a `<canvas>` element from within a Web Worker. It is already supported in Chrome so I tried converting some code for an image editor that uses this layered canvases optimisation to use a Web Worker for its canvas rendering. I found that when multiple canvases need to be redrawn at the same time, the updates do not necessarily occur on the same frame. This is despite that fact that I update all of the canvases within the same `requestAnimationFrame` callback. The result can be tearing, where one canvas layer has been updated with the new image data but the other canvas layers have not and so they still display the old image data. This tearing does not happen at all if rendering is performed on the main thread.

I can demonstrate this with a test that uses two canvases of the same size layered together. On one I draw a grey square. On the other I fill the entire canvas with that gray colour but I erase the area covered by that grey square:

![](/images/2020-08-22-observations-when-using-the-html-canvas-element-for-web-browsers/canvas-rendering-test-image-2x.png "Canvas test with two layered canvases")

There is a slider that controls the size of the grey square, simulating zooming in and out of the image. The color behind the canvases is [rebeccapurple](https://medium.com/@valgaze/the-hidden-purple-memorial-in-your-web-browser-7d84813bb416). When the slider is moved, both canvases get updated to show the new size for the square. If the two canvases always get updated on the same frame then the purple background will never be visible. However, if the canvases get updated on different frames then there will be a moment when one canvas will have been updated with the new square size while the other canvas will still be displaying the old square. Depending on the exact zoom change, the purple background may become momentarily visible.

I tried this test in Chrome v84 on macOS v10.15 (Catalina), once when the canvas updates are performed on the main thread and once when they are performed on the Web Worker. When they are performed on the main thread then I _never_ see the purple background but I regularly do when they are performed on the Web Worker:

![](/images/2020-08-22-observations-when-using-the-html-canvas-element-for-web-browsers/tearing-1-2x.gif "Tearing when using a Web Worker for canvas updates")

Also using the Web Worker, I sometimes see nasty flashes:

![](/images/2020-08-22-observations-when-using-the-html-canvas-element-for-web-browsers/tearing-2-2x.gif "Flashes when using a Web Worker for canvas updates")

This test HTML file is available [here](/iframes/canvas-tearing.html) if you wish to run it yourself. It will only work in a browser that supports [`HTMLCanvasElement.transferControlToOffscreen`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/transferControlToOffscreen). It should be stressed that this feature is experimental and hopefully the issues I have seen will be rectified in due course.

## Conclusion

The Canvas API is in theory a performant and easy-to-use API for drawing and manipulating 2D graphics in a Web browser, but in reality there are caveats to its usage. It is not currently possible to guarantee getting a hardware accelerated canvas, which could lead to serious performance regressions. The experimental feature of rendering to a canvas from a Web Worker has issues with timing that may affect a common rendering optimisation. There are also gotchas when performance testing the Canvas API, and not being able to guarantee hardware acceleration makes it harder to compare test results across browsers and platforms.
