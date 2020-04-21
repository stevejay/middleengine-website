---
layout: post
title: Useful CSS features
summary: A few CSS features that you might find useful on your next Web project.
date: 2020-04-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: tZc3vjPCk-Q
draft: true
---

The following sections introduce a few CSS features that I have found useful on recent projects.

## The pre-line white space property value

Sometimes you need to display some text that includes newline characters, and you want these to be respected by the browser. This can be achieved using the `pre-line` keyword for the `white-space` CSS property:

> Sequences of white space are collapsed. Lines are broken at newline characters, at &#60;br&#62;, and as necessary to fill line boxes.
> — [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)

Let us say I need to display the following text: 'First line\nSecond line'. Without using the `pre-line` value, newlines are treated the same as other white space:

![](/images/2020-04-21-useful-css-features/white-space-normal-2x.png "Newlines treated as other white space")

But with the `pre-line` value, the text is placed over two lines:

![](/images/2020-04-21-useful-css-features/white-space-pre-line-2x.png "Newlines observed")

Support for this keyword [is good](https://caniuse.com/#search=white-space%20pre-line).

## The attr function

One problem with HTML tables on mobile devices is that the table is often too wide for the narrow screens, and so horizontal scrolling is required to see the whole table. This is generally an unsatisfactory user experience. I saw a very nice approach in [this codepen](https://codepen.io/geoffyuen/pen/FCBEg) that involves styling an HTML table so that it displays well on both wide and narrow screens.

On a wide screen, the table displays as expected with the `td` cells in each row laid out horizontally:

![](/images/2020-04-21-useful-css-features/wide-table-2x.png "The table on a wide screen")

But on a narrow screen, each table row has its `td` cells laid out vertically, with the corresponding header value alongside each `td` cell value:

![](/images/2020-04-21-useful-css-features/narrow-table-2x.png "The table on a narrow screen")

The markup does not change, and no JavaScript is involved, so how is this transformation achieved? The header value for each pair, e.g., the 'Movie Title' text, is actually a `:before` pseudo element where its `content` property value is the value of a `data-th` data attribute on its owner `td` cell. The markup for each row looks like the following:

```html
<tr>
  <td data-th="Movie Title">Star Wars</td>
  <td data-th="Genre">Adventure, Sci-fi</td>
  <td data-th="Year">1977</td>
  <td data-th="Gross">$460,935,665</td>
</tr>
```

The CSS magic to this work is use of the `attr` function within the `content` property's value:

```css
td:before {
  content: attr(data-th) ": ";
}
```

Support for the attr function [is good](https://caniuse.com/#feat=css-gencontent), but only when used within the `content` property of a pseudo element, so this function is not widely usable with other properties. Also, this particular table styling has the downside that the width of the pseudo element cannot be dynamically set; it has to be hard-coded to a value greater than or equal to the width of the longest column header text.
