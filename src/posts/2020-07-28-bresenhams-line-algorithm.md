---
layout: post
title: "Bresenham's line algorithm: An exploration"
summary: An introduction, explanation, and exploration of this classic line rasterisation algorithm.
date: 2020-07-28
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
draft: true
---

## Introduction

I have recently been working on a [pixel art](https://en.wikipedia.org/wiki/Pixel_art) editor. This editor has a variety of tools, including for drawing simple graphics primitives like lines, rectangles, and ellipses. An algorithm for line-drawing that is commonly used in pixel art is [Bresenham's line algorithm](https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm). This post explains why this is, how the algorithm works, and a possible variation.

## Line-drawing and rasterisation

In a vector graphics editor, a line drawn by the user is represented mathematically and so always appears smooth regardless of the magnification level. This is in contrast to a raster graphics editor, such as Adobe Photoshop, where the image is represented using discrete pixels that you can see if you zoom into it:

![](/images/2020-07-28-bresenhams-line-algorithm/01_vector-vs-raster-2x.png "Vector graphics compared to raster graphics when magnified")

When a user draws a line in a raster graphics editor, this geometry needs to be [rasterised](https://en.wikipedia.org/wiki/Rasterisation) to determine which pixels in the image should be filled. Normally the aim is to produce a smooth result and so [anti-aliasing](https://en.wikipedia.org/wiki/Spatial_anti-aliasing) is applied as part of this process. The user might also want to draw lines that start and end on fractional coordinates. This is in contrast to pixel art, where the jagged look of non- anti-aliased rasterisation is normally preferred and where the coordinate values are integer values.

![](/images/2020-07-28-bresenhams-line-algorithm/02_aliased-vs-non-aliased-with-originals-2x.png "Comparing rasterisation performed with and without anti-aliasing")

The line rasterisation algorithm that is often used for the non- anti-aliased look is [Bresenham's line algorithm](https://en.wikipedia.org/wiki/Bresenham%27s_line_algorithm). It was invented by Jack Elton Bresenham in 1962. The algorithm does not accept or output fractional coordinate values and so the result has the desired [jaggies](https://en.wikipedia.org/wiki/Jaggies). The algorithm also only uses integer operations, which was a particularly useful feature at the time of invention when floating point arithmetic was computationally expensive. The following animation shows the result of using the algorithm to rasterise a variety of lines:

![](/images/2020-07-28-bresenhams-line-algorithm/03_bresenham-12x12-example.gif "Examples of line rasterisation using Bresenham's line algorithm")

## The Bresenham line algorithm explained

Explanations of the algorithm available on the Web at Wikipedia, YouTube and other sites usually focus on deriving the equation that underlies it. I have found it more useful to understand the algorithm by working through an example rasterisation.

Let us try to rasterise the following line:

![](/images/2020-07-28-bresenhams-line-algorithm/04_bresenham-guide-2x.png "The line to be rasterised")

An observation we can make about this line is that, as we rasterise it, we will **always** be incrementing the X-axis coordinate but we will only **sometimes** be incrementing the Y-axis coordinate. This is because the change in X, which is 3, is greater than the change in Y, which is 2. The change in X is termed delta X, or ΔX, and the change in Y is termed delta Y, or ΔY. Here we use the Bresenham line algorithm to answer the question of when the Y-axis coordinate value should be incremented.

Conventionally, the 'always' axis is called the fast axis and the 'sometimes' axis is called the slow axis:

![](/images/2020-07-28-bresenhams-line-algorithm/05_bresenham-guide-2x.png "Classifying the axes as fast and slow")

Depending on the line being rasterised, it is not always the case that the X-axis is the fast axis and the Y-axis is the slow axis. The following diagram shows how the fast axis classification depends upon the directional vector of the line, and also how this determines whether we need to increment or decrement the fast axis coordinate value:

![](/images/2020-07-28-bresenhams-line-algorithm/06_bresenham-guide-2x.png "The fast axis classification")

Similarly, the following diagram shows how the slow axis classification also depends on the directional vector of the line, and how it also determines whether we need to sometimes increment or sometimes decrement the slow axis coordinate value:

![](/images/2020-07-28-bresenhams-line-algorithm/07_bresenham-guide-2x.png "The slow axis classification")

The directional vector of the example line is shown below, confirming that the fast axis is the X-axis and we always increment its coordinate value, and that the slow axis is the Y-axis and we sometimes increment its coordinate value:

![](/images/2020-07-28-bresenhams-line-algorithm/08_bresenham-guide-2x.png "The directional vector of the example line")

Having classified the axes, we can start the rasterisation process. The first step is easy: the pixel at the start of the line is always filled. For the example line, this is the pixel at (0, 0). The problem is to determine the next pixel to be filled. We know that the next X-axis coordinate value is 1 because the X-axis is the fast axis. For the Y-axis, we either do or do not increment its coordinate value. This gives us a choice between two possible pixels to fill: the pixel at (1, 0) or the pixel at (1, 1):

![](/images/2020-07-28-bresenhams-line-algorithm/09_bresenham-guide-2x.png "Possible next pixels when X equals 1")

It is possible to think of each pixel as being a point rather than a square. If we do this, we can see that the line to rasterise passes somewhere between the two possible pixels:

![](/images/2020-07-28-bresenhams-line-algorithm/10_bresenham-guide-2x.png "Thinking of the pixels as points")

What we are are interested in is which pixel is the line closest to when it passes between them (so when X equals 1). If we draw a line between the two possible pixels, then the line to rasterise will intersect it at some point between them:

![](/images/2020-07-28-bresenhams-line-algorithm/11_bresenham-guide-2x.png "The intersection point between the two possible next pixels")

The midpoint is of course exactly between these two pixels:

![](/images/2020-07-28-bresenhams-line-algorithm/12_bresenham-guide-2x.png "The midpoint between the two possible pixels")

We can now define a rule: only increment the Y coordinate value if the intersection point is equal to or above the midpoint. In this example, the intersection point is above the midpoint and so we would fill the pixel at (1, 1) rather than the pixel at (1, 0).

How do we express this mathematically? We can do so using just rates of change, which has the advantage of avoiding floating point values in the calculations. The line to rasterise has a ΔX of 3 and a ΔY of 2. The line that passes through the midpoint has a ΔX of 3 and a ΔY of ΔX/2, which is 1.5. The following diagram illustrates these values:

![](/images/2020-07-28-bresenhams-line-algorithm/13_bresenham-guide-2x.png "Using rates of change to determine the intersection point")

We will use epsilon, which has the symbol ε, to represent the current rate of change in Y. (As you will see, the current rate of change in Y can vary depending on any error introduced in each iteration of the algorithm.) The initial value for ε is zero, and for each iteration of the algorithm we will add ΔY to it. This addition represents the change in Y that occurs each time we step along the X-axis. Since we are currently in the first iteration of the algorithm, we add ΔY to ε and so the value of ε is now 2.

We can now compare the value of ε to the value of the midpoint:

![](/images/2020-07-28-bresenhams-line-algorithm/14_bresenham-guide-2x.png "Comparing ε to the midpoint")

To avoid a floating point value here, we can multiply both values by two before comparing them, such that we are comparing 2ε (4) with ΔX (3):

![](/images/2020-07-28-bresenhams-line-algorithm/15_bresenham-guide-2x.png "Avoiding floating point values when comparing ε to the midpoint")

Because the value of ε is greater than the midpoint value, we know that we need to increment the Y-axis coordinate value and so we fill the pixel at (1, 1):

![](/images/2020-07-28-bresenhams-line-algorithm/16_bresenham-guide-2x.png "Filling the pixel at (1, 1)")

Although we determined that the intersection point was closer to the pixel at (1, 1) than to the pixel at (1, 0), it did not fall directly on it. This means that by filling the pixel at (1, 1), the change in Y is ΔX rather than ΔY:

![](/images/2020-07-28-bresenhams-line-algorithm/17_bresenham-guide-2x.png "Desired change in Y versus actual change in Y")

The difference between the desired change (ΔY) and the actual change (ΔX) is the rasterisation error. We need to take this into account when calculating the next pixel to fill. If we did not do this then we would draw some very odd-looking lines:

![](/images/2020-07-28-bresenhams-line-algorithm/18_bresenham-guide-2x.png "An odd line when the error term is not included")

The value of ε includes this error. However, we need to adjust the value of ε before the next iteration of the algorithm. We found that we needed to increment the Y coordinate value, and so we filled the pixel at (1, 1) rather than (1, 0). We now need to adjust the value of ε so that it is relative to this new pixel. We can do this by subtracting ΔX from ε, which is 2 - 3 and so the new value of ε is -1:

![](/images/2020-07-28-bresenhams-line-algorithm/19_bresenham-guide-2x.png "Adjusting ε")

We can now move on to the next iteration of the algorithm, to determine the next pixel to be filled:

![](/images/2020-07-28-bresenhams-line-algorithm/20_bresenham-guide-2x.png "The third pixel to be filled")

As before we have to determine if the Y coordinate value should be incremented or not. And as before we add ΔY to ε. Since the value of ε after the last iteration was -1, the new value of ε is 1:

![](/images/2020-07-28-bresenhams-line-algorithm/21_bresenham-guide-2x.png "Using rates of change to determine the intersection point")

Because of this error adjustment, the line that we are checking is actually the line that extends from the pixel that we last filled to the point at which the line being rasterised passes between the two pixels that we are currently considering. This is shown as the blue dashed line in the following diagram:

![](/images/2020-07-28-bresenhams-line-algorithm/22_bresenham-guide-2x.png "The effective line being tested")

Again, to avoid a floating point value, we can multiply both values by two before making the comparison so that we are comparing 2ε (2) with ΔX (3):

![](/images/2020-07-28-bresenhams-line-algorithm/23_bresenham-guide-2x.png "Avoiding floating point values when comparing ε to the midpoint")

Since this green line does not pass above the threshold, we do not increment Y for this next pixel and so it is pixel (2, 1) that is filled.

![](/images/2020-07-28-bresenhams-line-algorithm/24_bresenham-guide-2x.png "Filling the pixel at (2, 1)")

Because the value of ε is not greater than the midpoint value, the next pixel has the same Y coordinate as the current pixel and we do not need to adjust the value of ε.

Now we can determine the final pixel to fill:

![](/images/2020-07-28-bresenhams-line-algorithm/25_bresenham-guide-2x.png "The final pixel to fill")

Again we have to determine if Y should be incremented or not, and so we determine which pixel the line to rasterise is closest to:

![](/images/2020-07-28-bresenhams-line-algorithm/26_bresenham-guide-2x.png "Using rates of change to determine the intersection point")

And as before, the line that we are checking is actually the line that extends from the pixel that we last filled to the point at which the line being rasterised passes between the two pixels that we are currently considering. This is shown as the blue dashed line in the following diagram:

![](/images/2020-07-28-bresenhams-line-algorithm/27_bresenham-guide-2x.png "The effective line being tested")

As before, we multiply the values by 2 when comparing:

![](/images/2020-07-28-bresenhams-line-algorithm/28_bresenham-guide-2x.png "Avoiding floating point values when comparing ε to the midpoint")

The value of ε is greater than the threshold so the final pixel to fill is (3, 2) rather than (3, 1):

![](/images/2020-07-28-bresenhams-line-algorithm/29_bresenham-guide-2x.png "The final rasterisation result")

And with that the rasterisation of the example line is complete.
