---
layout: post
title: "A performance testing gotcha with the Canvas Web API"
summary: A gotcha that you might come across when trying to test the performance of the Canvas API.
date: 2020-08-23
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 78
---

## Introduction

The [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) is a rich and performant API for drawing 2D graphics in a Web browser. This blog post details a gotcha that I found when performance testing the [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) method.

## The initial attempt

The [`drawImage`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage) method is a synchronous method that allows you to draw an image to a [`<canvas>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas) HTML element or an [`OffscreenCanvas`](https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas). It accepts several types of image source and it allows you to crop and/or scale the image. I wanted to understand the performance cost of scaling for various combinations of source and target image sizes. To do this, I created [this performance test suite](https://jsbench.me/1dke2mcybs/2) on the [JSBench.me](https://jsbench.me/) Web site.

The test is simple. In the set-up I create a small source `<canvas>` element and a large destination `<canvas>` element. Then in each test I just invoke `drawImage` with some particular set of parameters:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
```

When I ran the test in Chrome v84 on macOS v10.15, my laptop froze and then crashed after a few moments. I tried [a new test](https://jsbench.me/nmke2uordl/1) with a smaller destination canvas which froze the Web page for a minute or so but did prevent a crash. But the result of that test was too good to be true: the browser was able to manage over 300,000 `drawImage` operations per second.

My understanding is that the `drawImage` action does not always get executed immediately. The action might instead get queued as part of a batching mechanism used to cut the number of GPU render calls. These calls are expensive so it is worth the browser performing this optimisation. Thus the `drawImage` call only has to queue the action. This speed encourages the [benchmarking code](https://benchmarkjs.com/) to invoke it many times to improve the accuracy of the test. Now there will be many pending `drawImage` actions which, when flushed, could overload the system.

## Finding a fix

I reasoned that I had to find a way to flush the batched action within the test body. The WebKit performance tests in the Chromium source code [include tests for `drawImage`](https://github.com/chromium/chromium/blob/2ca8c5037021c9d2ecc00b787d58a31ed8fc8bcb/third_party/blink/perf_tests/canvas/draw-dynamic-canvas-2d-to-hw-accelerated-canvas-2d.html). They use a completion action to trigger flushing:

```js
function ensureComplete() {
  // Using destCanvas2D as a source image is just to flush out the content when
  // accelerated 2D canvas is in use.
  dummyCtx2D.drawImage(destCanvas2D, 0, 0, 1, 1, 0, 0, 1, 1);
}
```

I tried this approach in [a version](https://jsbench.me/h9ke2s1seb) of the test suite. The following is an example test from that suite:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
// Force the drawImage call to be evaluated within this benchmark code:
$destContext.drawImage($destCanvas, 0, 0, 1, 1, 0, 0, 1, 1);
```

I still found issues with the page freezing in Chrome on macOS. More importantly, I saw significant variance in execution time of greater than ±100% for the first test. I looked for another way to force a flush. I thought of reading from the destination canvas immediately after the `drawImage` call. There are two ways that I know of to read pixel data from a canvas:

- [`CanvasRenderingContext2D.getImageData`](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData).
- [`createImageBitmap`](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/createImageBitmap) (not supported in Safari).

Using `createImageBitmap` works and the resulting performance test suite is [here](https://jsbench.me/ooke36wtsw/1). The following is an example test from that test suite:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
// Force the drawImage call to be evaluated within this benchmark code:
createImageBitmap($destCanvas, 0, 0, 1, 1).then(() => deferred.resolve());
```

Note that I only create a bitmap for a single pixel. This is to minimise the overhead that this action has on the test timings. I also have to run the test in asynchronous mode because `createImageBitmap` returns a promise.

The page still freezes for several seconds but the results look valid:

| Test                                                                     | Result                 |
| ------------------------------------------------------------------------ | ---------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 1435.57 ops/s ± 17.99% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 848.19 ops/s ± 8.88%   |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 480.4 ops/s ± 31.48%   |

I also tried using `getImageData`; the resulting test suite is [here](https://jsbench.me/0eke37hgep/1). The following is an example test from it:

```js
$destContext.drawImage($sourceCanvas, 0, 0, 300, 300, 0, 0, 900, 900);
// Force the drawImage call to be evaluated within this benchmark code:
$destContext.getImageData(0, 0, 1, 1);
```

Again I only read the image data for a single pixel. There is no page freezing when this test suite is run, but the results are poor:

| Test                                                                     | Result              |
| ------------------------------------------------------------------------ | ------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 59.11 ops/s ± 6.87% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 45.29 ops/s ± 3.04% |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 19.88 ops/s ± 1.47% |

My suspicion is that the destination canvas gets turned into a CPU canvas because of the calls to `getImageData`. Thus these results are without hardware acceleration. It is noticeable how much slower these results are compared to the previous test suite. This shows how much of a performance hit it can be if the browser runs a canvas as a CPU canvas rather than as a GPU canvas. (For more on this topic, see [my post here](/blog/posts/2020/08/21/cpu-versus-gpu-with-the-canvas-web-api).)

Note that how you flush the action might depend on the browser or even the browser version. You would have to experiment with the approaches given in this post.

## Some results for the `drawImage` method performance tests

I created two test suites for performance testing the `drawImage` method:

- [Scaling up performance](https://jsbench.me/ooke36wtsw/1) (the test suite from the previous section).
- [Scaling down performance](https://jsbench.me/cake67gtlb/1).

Both use `createImageBitmap` for flushing.

I performed these tests in Chrome v84 and Edge v84 on macOS v10.15 using a mid-2014 i5 MacBook Pro. The following is an example result for scaling up performance (duplicated from the last section):

| Test                                                                     | Result                 |
| ------------------------------------------------------------------------ | ---------------------- |
| Scaling from a 300x300 canvas area to a 300x300 canvas area (no scaling) | 1192.83 ops/s ± 17.05% |
| Scaling from a 300x300 canvas area to a 900x900 canvas area              | 794.14 ops/s ± 8.5%    |
| Scaling from a 300x300 canvas area to a 3000x3000 canvas area            | 458.93 ops/s ± 22.79%  |

The following is an example result for scaling down performance:

| Test                                                                         | Result                |
| ---------------------------------------------------------------------------- | --------------------- |
| Scaling from a 3000x3000 canvas area to a 300x300 canvas area                | 889.19 ops/s ± 42.13% |
| Scaling from a 3000x3000 canvas area to a 900x900 canvas area                | 56.26 ops/s ± 165.22% |
| Scaling from a 3000x3000 canvas area to a 3000x3000 canvas area (no scaling) | 64.05 ops/s ± 43.89%  |

I got comparable results running the tests in Chrome v84 and Edge v84 on Windows 10. I noticed that the results could vary a lot between runs, but the general trend was consistent.

Scaling up was performant regardless of the destination canvas area. Scaling down was only performant for the smallest destination canvas area. Thus the lower the total number of pixels involved (source plus destination), the more performant scaling will be. Of course, this makes sense intuitively.

## Conclusion

Performance testing in general can be difficult to do well. In the case of the Canvas API, I required an understanding of how browsers work to avoid invalid results. Finding a way to flush the pending draw actions solved the encountered problem.

---

## Changelog

- 2020-08-24 Initial version
- 2020-08-25 Plain English improvements
