---
layout: post
title: "CPU versus GPU with the Canvas Web API"
summary: How the browser can use the CPU or the GPU to render to a canvas when using the Canvas Web API, and how this affects the performance of your Web app.
date: 2020-08-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 76
---

## Introduction

The [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) is a rich and performant API for drawing and manipulating 2D graphics in a Web browser. It is used with the [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) HTML element or an [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas). When rendering content to a canvas, the browser can choose to use either the CPU or the [GPU](https://en.wikipedia.org/wiki/Graphics_processing_unit). This post looks at how the browser makes this decision and the effect this has on performance.

## Browser heuristics

When you create a canvas, the browser has to decide where it should exist. It can store the data for the canvas in main memory, invoking functions running on the CPU to render to it. Or it can create the canvas on the GPU, invoking GPU commands to draw to it. I use the term _CPU canvas_ for the former and _GPU canvas_ for the latter. Unlike a CPU canvas, a GPU canvas is hardware accelerated. This will generally result in better performance, but not always. As a result, the browser might include heuristics for deciding which approach to adopt. It may even [change approach after the initial decision](https://www.reddit.com/r/javascript/comments/ac9hdb/calling_getimagedata_potentially_puts_you_canvas/) in response to how the canvas is being used. [This file](https://chromium.googlesource.com/chromium/src/+/41d279a5476937a3981a8413be722d42da0de0d2/third_party/WebKit/Source/platform/graphics/ExpensiveCanvasHeuristicParameters.h) is an example of the heuristics used in an older version of the [Blink](<https://en.wikipedia.org/wiki/Blink_(browser_engine)>) browser engine in Chrome.

One simple heuristic is the size of the canvas: a very small or very large canvas might be better as a CPU canvas. [Here is a discussion](https://groups.google.com/a/chromium.org/g/blink-dev/c/NPSQdiXSK4w/m/jgzIaJPJxh8J) in the Blink developers group about how canvas size matters. The browser might also choose to create any new canvases as CPU canvases if there are already many GPU canvases.

### Usages of `getImageData` and `putImageData`

The browser will be particularly interested if you use [`getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData) and [`putImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/putImageData). You can use these methods to operate on the underlying pixel data of a canvas. For example, you can change the [brightness or contrast](https://css-tricks.com/manipulating-pixels-using-canvas/#brightness-and-contrast) of the image. These manipulations are performed on the CPU and not the GPU. If you invoke `getImageData` on a GPU canvas then the browser needs to transfer the pixel data from the GPU to the CPU. This is sometimes termed a GPU readback and it is [well known for being a slow operation](https://superuser.com/questions/1478985/why-is-there-a-bottleneck-sending-data-from-a-gpu-to-a-cpu-but-less-so-from-cp). Similarly the browser has to copy the image data back to the GPU when you use `putImageData`. Thus the browser might decide to make the canvas a CPU canvas to avoid this data shuffling.

Sometimes you already know that a CPU canvas would be best for your use case. Currently you have to rely on getting one via browser heuristics, but you will soon be able to request it. This will be via a new 2D canvas context attribute called [`willReadFrequently`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext).

## The problem with heuristics

The browser's use of heuristics points to a fundamental limitation of the Canvas API: it is up to the browser whether a given canvas is a CPU canvas or a GPU canvas. You are relying on heuristics and they can change between browser versions. In one version, the browser might determine that a given canvas should be a GPU canvas. In another version, it might make the opposite determination. [One reason that Figma gave](https://www.figma.com/blog/building-a-professional-design-tool-on-the-web/) for using WebGL rather than the Canvas API was not being able to guarantee GPU acceleration.

The performance difference between the two types of canvas can be significant. I used the [JSBench.me](https://jsbench.me/) Web site to test this. In [this first test](https://jsbench.me/bbke790qc2/1) I try to get the browser to use a CPU canvas. In [this second test](https://jsbench.me/8ake791cw4/1) I try to get the browser to use a GPU canvas. The test itself is identical. It copies a part of the canvas to itself:

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

... but the set-up for the CPU canvas test includes a line designed to force the use of a CPU canvas in Chrome v84:

```js
context.getImageData(0, 0, 1, 1);
```

I get the following result when I run these tests in Chrome v84 on macOS v10.15:

| Test       | Result                |
| ---------- | --------------------- |
| CPU canvas | 76.81 ops/s ± 1.36%   |
| GPU canvas | 569.34 ops/s ± 32.76% |

This is a significant difference in performance, although the variability of the GPU canvas result is greater.

If you have a canvas that exists to do processing of image data using `getImageData` and `putImageData` then it should generally be a CPU canvas. (This avoids the overhead of GPU readbacks.) If you have a canvas that uses `getImageData` and `putImageData` sparingly then remove those usages. This is to try to prevent triggering a CPU canvas now or in the future. You can instead use a temporary canvas for those operations. When using getImageData, use [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) to copy the source data to the temporary canvas. Then use `getImageData` on that temporary canvas. When using `putImageData`, use it to write to the temporary canvas. Then use `drawImage` to copy from the temporary canvas to the destination canvas. Also consider if WebGL would be a better choice for canvas rendering in your app.

## Conclusion

The Canvas API is a performant and easy-to-use API for drawing 2D graphics in a Web browser, but it has caveats. It is currently not possible to guarantee getting a hardware accelerated canvas when the user's hardware supports it. This could lead to performance issues if the browser's heuristics change in the future. Web developers need to be aware of this, and should consider using WebGL instead.

---

## Changelog

- 2020-08-24 Initial version
- 2020-08-25 Plain English improvements
