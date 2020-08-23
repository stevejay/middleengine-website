---
layout: post
title: "CPU versus GPU with the Canvas Web API"
summary: An explanation of how the browser can use either the CPU or the GPU to render to a canvas when using the Canvas Web API, and how this decision can affect the performance of your Web app.
date: 2020-08-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
draft: true
issueNumber: 76
---

## Introduction

The [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) is a rich and performant API for drawing and manipulating 2D graphics in a Web browser. Drawing can be performed using the [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) HTML element or an [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas). When rendering content to a canvas, the browser can choose to use either the CPU or the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit). This post examines how this decision is made and what effect this can have on rendering performance.

**Note:** The `<canvas>` element also supports displaying 3D graphics using the [WebGL API](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API), but in this post I focus solely on its use in 2D graphics.{class=note}

## Browser heuristics

When you create a `<canvas>` element or an `OffscreenCanvas`, the browser has to decide whether to store the data for the canvas in main memory and use functions running on the CPU to render to it, or whether to create the canvas on the GPU and render to it by invoking GPU draw instructions. I use the term _CPU canvas_ for a canvas that the browser is using the CPU to render to, and the term _GPU canvas_ when the browser is instead using the GPU. Generally a GPU canvas is preferred as rendering will be hardware accelerated, but both approaches have advantages and disadvantages. Because of this, the browser might include complex heuristics for deciding which approach to use, potentially even [changing approach after the initial decision](https://www.reddit.com/r/javascript/comments/ac9hdb/calling_getimagedata_potentially_puts_you_canvas/) in response to how it sees the canvas is being used. [This file](https://chromium.googlesource.com/chromium/src/+/41d279a5476937a3981a8413be722d42da0de0d2/third_party/WebKit/Source/platform/graphics/ExpensiveCanvasHeuristicParameters.h) is an example of the heuristics used in an older version of the [Blink](<https://en.wikipedia.org/wiki/Blink_(browser_engine)>) browser engine in Chrome.

### Size can matter

One potential and simple heuristic is the size of the canvas: a very small or very large canvas might be better as a CPU canvas. There is some discussion about how canvas size is important [here in the Blink developers group](https://groups.google.com/a/chromium.org/g/blink-dev/c/NPSQdiXSK4w/m/jgzIaJPJxh8J). The browser might also choose to create any new canvases as CPU canvases regardless of their size if there are already many GPU canvases.

### Usages of `getImageData` and `putImageData`

A very important heuristic is whether or not [`CanvasRenderingContext2D.getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) and [`CanvasRenderingContext2D.putImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData) are used with the canvas. Generally these two methods are used to read the values of particular pixels to process them in some way, such as applying a desaturation filter to an image, and they are handled by the CPU not the GPU. If the canvas is a GPU canvas then these methods require a GPU to CPU transfer of the pixel data (sometimes termed a GPU readback) which is [well known for being a slow operation](https://superuser.com/questions/1478985/why-is-there-a-bottleneck-sending-data-from-a-gpu-to-a-cpu-but-less-so-from-cp). Given this, if you use `getImageData` or `putImageData` on a canvas then the browser might decide to make that canvas a CPU canvas in order to avoid GPU readbacks.

Browsers are also starting to support a new [`willReadFrequently`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) 2D canvas context attribute that allows you to request a CPU canvas when you know that your use case will benefit from one, rather than you having to rely on getting one via browser heuristics.

## The problem with heuristics

The use of heuristics points to a fundamental limitation of the Canvas API: you are beholden to the browser as to whether a given canvas is a CPU canvas or a GPU canvas. Although the `willReadFrequently` attribute will ensure that you can get a CPU canvas when you need one, you are otherwise relying on heuristics and they can change between browser versions. It is possible for one version of a browser to determine that a given canvas should be a GPU canvas rather than a CPU canvas and for another version to make the opposite determination. This lack of control over GPU acceleration is [one reason that Figma gave](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/) for opting to use WebGL rather than the 2D Canvas API.

The performance difference between the two types of canvas can be significant. I created two performance tests on the [JSBench.me](https://jsbench.me/) Web site, [this one](https://jsbench.me/bbke790qc2/1) that is designed to trigger the usage of a CPU canvas and [this one](https://jsbench.me/8ake791cw4/1) that should use a GPU canvas. The test itself is identical in the two files and simply copies a part of the canvas to itself:

```js
context.drawImage(canvas, 0, 0, 960, 540, 0, 0, 1920, 1080);
// Force the drawImage call to be evaluated within this benchmark code:
createImageBitmap(canvas, 0, 0, 1, 1).then(() => deferred.resolve());
```

The difference is in the set-up functions. Both include the same initial code...

```js
var canvas = document.createElement("canvas");
canvas.width = 1920;
canvas.height = 1080;
var context = canvas.getContext("2d");
```

... but the set-up function for the CPU canvas test then includes one final line designed to trigger usage of a CPU canvas in Chrome v84:

```js
context.getImageData(0, 0, 1, 1);
```

When I run these tests in Chrome v84 on macOS v10.15, I get the following result:

| Test       | Result                |
| ---------- | --------------------- |
| CPU canvas | 76.81 ops/s ± 1.36%   |
| GPU canvas | 569.34 ops/s ± 32.76% |

This is a significant difference in performance, although notice that the variability of the GPU canvas result is much greater.

If you have a canvas that essentially exists to do processing of image data using `getImageData` and `putImageData` then it will likely make sense for it to be a CPU canvas (to avoid the overhead of GPU readbacks). If however you have a canvas that uses `getImageData` and/or `putImageData` sparingly then I suggest removing those usages to help prevent triggering a CPU canvas now or in the future. Instead, use a temporary canvas for those operations. When using `getImageData`, first use [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) to copy the pixels of interest to the temporary canvas and then only use `getImageData` on that temporary canvas. When using `putImageData`, use it to write to the temporary canvas and then use `drawImage` to copy from that temporary canvas to the destination canvas. You should also consider if WebGL would be a better choice for canvas rendering in your app, since you will always get a GPU canvas that way.

## Conclusion

The Canvas API is in theory a performant and easy-to-use API for drawing and manipulating 2D graphics in a Web browser, but in reality there are important caveats to its usage. It is not currently possible to guarantee getting a hardware accelerated canvas, which could lead to performance regressions if the browser heuristics for the type of canvas used change in the future. Web developers need to be aware of this, and should consider if WebGL would be a better choice for canvas rendering.

---

## Changelog

- 2020-08-21 Initial version
