---
layout: post
title: "A performance testing gotcha with the Canvas Web API"
summary: A description of a gotcha that you might come across when trying to test the performance of methods of the Canvas API.
date: 2020-08-23
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
draft: true
issueNumber: 78
---

## Introduction

The [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) is a rich and performant API for drawing and manipulating two-dimensional (2D) graphics in a Web browser. This blog post details a gotcha that I found when performance testing its methods, in particular when trying to test the [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) method.

## The initial attempt

The [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) method of the Canvas API is a synchronous method that allows you to draw an image to a [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) HTML element or an [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas). It accepts several types of image source and it allows you to crop and/or scale the image at the same time. I was interested in the performance cost of scaling for various combinations of source and target image sizes, and so I created [this performance test suite](https://jsbench.me/1dke2mcybs/2) on the [JSBench.me](https://jsbench.me/) Web site.

The test is quite simple. In the set-up I create a small source `<canvas>` element and a large destination `<canvas>` element. Then in each test I just invoke `drawImage` with some particular set of parameters:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
```

However, when I ran the test in Chrome v84 on macOS v10.15 (Catalina), the browser and indeed the OS froze and then a few moments later my laptop crashed. I tried creating [a new test](https://jsbench.me/nmke2uordl/1) with a smaller destination canvas, which prevented a crash but still froze the Web page for the duration. On checking the test result, I decided that it seemed too good to be true: the browser was apparently able to manage over 300,000 `drawImage` operations per second.

My understanding for this behaviour is that the `drawImage` call does not necessarily execute the specified drawing action immediately, but rather that action normally gets deferred as part of a batching mechanism used to reduce the number of GPU render calls. (These calls are expensive so it is worthwhile for the browser to perform this optimisation.) This means that the `drawImage` call itself executes very quickly, giving the appearance of a fast function that the benchmarking library ([Benchmark.js](https://benchmarkjs.com/)) opts to invoke many times, presumably to improve the accuracy of the test. Thus there will be many pending `drawImage` actions which, when flushed, take time and computing resources to execute, potentially enough to crash the computer.

## Finding a fix

I reasoned that the answer was to somehow cause the batched action to be flushed within the test body. The WebKit performance tests in the Chromium source code include tests for `drawImage` [like this one](https://github.com/chromium/chromium/blob/2ca8c5037021c9d2ecc00b787d58a31ed8fc8bcb/third_party/blink/perf_tests/canvas/draw-dynamic-canvas-2d-to-hw-accelerated-canvas-2d.html) and they use a completion action to trigger flushing:

```js
function ensureComplete() {
  // Using destCanvas2D as a source image is just to flush out the content when
  // accelerated 2D canvas is in use.
  dummyCtx2D.drawImage(destCanvas2D, 0, 0, 1, 1, 0, 0, 1, 1);
}
```

I tried this approach in [this version](https://jsbench.me/h9ke2s1seb) of the test suite. The following is an example test from that suite:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
// Force the drawImage call to be evaluated within this benchmark code:
$destContext.drawImage($destCanvas, 0, 0, 1, 1, 0, 0, 1, 1);
```

I still found issues with the page freezing in Chrome on macOS but more importantly I saw significant variance in execution time of greater than ±100% for the first test. In theory an alternative way to force a flush is to read from the destination canvas immediately after writing to it. There are two ways that I know of to read pixel data from a canvas:

- [`CanvasRenderingContext2D.getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData)
- [`createImageBitmap`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap)

Using `createImageBitmap` works well and the resulting performance test suite can be found [here](https://jsbench.me/ooke36wtsw/1). The following is an example test from that test suite:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
// Force the drawImage call to be evaluated within this benchmark code:
createImageBitmap($destCanvas, 0, 0, 1, 1).then(() => deferred.resolve());
```

Note that I only create a bitmap for a single pixel to try to minimise the overhead that this action has on the test timings. Also, because `createImageBitmap` returns a promise, I have to run the performance test in asynchronous mode.

The page still freezes for several seconds but the results look valid:

| Test                                                                     | Result                 |
| ------------------------------------------------------------------------ | ---------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 1435.57 ops/s ± 17.99% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 848.19 ops/s ± 8.88%   |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 480.4 ops/s ± 31.48%   |

I also tried using `getImageData`, for which the resulting performance test suite can be found [here](https://jsbench.me/0eke37hgep/1). The following is an example test from it:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
// Force the drawImage call to be evaluated within this benchmark code:
$destContext.getImageData(0, 0, 1, 1);
```

Again I only read the image data for a single pixel. There is no page freezing when this test suite is run, but the results are quite poor:

| Test                                                                     | Result              |
| ------------------------------------------------------------------------ | ------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 59.11 ops/s ± 6.87% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 45.29 ops/s ± 3.04% |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 19.88 ops/s ± 1.47% |

My suspicion is that the destination canvas gets turned into a CPU canvas because of the calls to `getImageData`, and so these results are without hardware acceleration. It is noticeable how much slower these results are compared to those from the previous test suite. This demonstrates how much of a performance hit it can be if the browser runs a canvas as a CPU canvas rather than as a GPU canvas. For more on this topic, please see [my post here](/blog/posts/2020/08/21/cpu-versus-gpu-with-the-canvas-web-api).

## Some results for the `drawImage` method performance tests

I created two test suites for performance testing the `drawImage` method, both using `createImageBitmap` for flushing:

- [Scaling up performance](https://jsbench.me/ooke36wtsw/1) (the test suite from the previous section).
- [Scaling down performance](https://jsbench.me/cake67gtlb/1).

I performed these tests from Chrome v84 on macOS v10.15 using a mid-2014 i5 MacBook Pro. The following is an example test run result for scaling up performance (duplicated from the previous section):

| Test                                                                     | Result                 |
| ------------------------------------------------------------------------ | ---------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 1435.57 ops/s ± 17.99% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 848.19 ops/s ± 8.88%   |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 480.4 ops/s ± 31.48%   |

The following is an example test run result for scaling down performance:

| Test                                                                         | Result                |
| ---------------------------------------------------------------------------- | --------------------- |
| Scaling from a 3000x3000 canvas area to a 300x300 canvas area                | 1018.38 ops/s ± 22.7% |
| Scaling from a 3000x3000 canvas area to a 900x900 canvas area                | 502.38 ops/s ± 21.1%  |
| Scaling from a 3000x3000 canvas area to a 3000x3000 canvas area (no scaling) | 317.33 ops/s ± 5.64%  |

The most significant factor in performance appears to be the size of the destination image area: the smaller the destination image area, the better the performance. Even when scaling from a large image area to a small image area, the performance was over 1000 operation per seconds. That said, the size of the source image area does also affect performance, with smaller source image areas producing better results than larger source image areas.

## Conclusion

Performance testing in general can be difficult to do well and consistently, and in the case of the Canvas API some information is required about how browsers work internally in order to avoid invalid results. In this case finding a way to flush the pending draw actions solved the encountered problem.

---

## Changelog

- 2020-08-23 Initial version
