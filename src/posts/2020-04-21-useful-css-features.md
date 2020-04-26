---
layout: post
title: Useful CSS features
summary: A few CSS features that you might find useful on your next Web project.
date: 2020-04-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: tZc3vjPCk-Q
---

This post introduces a few CSS-related items that I have found useful on recent projects.

## The pre-line white space property value

Sometimes you need to display some text that includes newline characters, and you want these to be respected by the browser. This can be achieved using the `pre-line` keyword for the `white-space` CSS property:

> Sequences of white space are collapsed. Lines are broken at newline characters, at &#60;br&#62;, and as necessary to fill line boxes.
> — [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/white-space)

Let us say that I need to display the following text: 'First line\nSecond line'. Without using the `pre-line` value, newlines are treated the same as other white space:

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

The markup does not change, and no JavaScript is involved, so how is this transformation achieved? The header value for each pair, e.g., the 'Movie Title' text, is actually a `:before` pseudo element where its `content` property value is the value of a `data-th` data attribute on its owner `td` cell. The markup for each row looks like this:

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

Support for the attr function [is good](https://caniuse.com/#feat=css-gencontent), but only when used within the `content` property of a pseudo element so this function is not widely usable with other properties. Also, this particular table styling has the downside that the width of the pseudo element cannot be dynamically set; it has to be hard-coded to a value greater than or equal to the width of the longest column header text.

## The owl selector

By default, Web browsers style many elements with default top and bottom margins. This works very well when rendering prose, for example a blog post or a news article. With such content, the page consists of a sequence of headings, paragraphs, block quotes, lists, etc. Each of these elements has predetermined vertical margin values, and the vertical margins collapse, so that regardless of the order that the different elements occur in, there is always the correct amount of vertical margin between them. The result is the application of an automatic rhythm to the vertical spacing of the page's elements. The blog post you are currently reading uses this approach to vertical margins (although the exact margin top and bottom values for each element type have been set to custom values, rather than relying on the browser defaults).

While this works well for prose, it does not work so well for content in other forms, such as information in the form of a collection of cards. An example of this is the list of posts on the [blog page](/blog) of the Web site you are reading now. The listing is styled as a grid of cards, one for each post, where each includes the post's title, author, date, and a summary sentence. Here is a screen shot of one such card:

![](/images/2020-04-21-useful-css-features/card-2x.png "A post summary card")

The card HTML mark-up is basically this:

```html
<li class="card">
  <h3>...</h3>
  <div class="byline">...</div>
  <p>...</p>
  <a>...</a>
</li>
```

If the card styling used the default vertical margins on the elements that form each card, the vertical spacing between those elements would be too great:

![](/images/2020-04-21-useful-css-features/card-default-2x.png "A post summary card with default margins")

What might be required for a card is a particular vertical margin value between each child element of the card, regardless of the element type. This can be achieved in two stages:

1. Remove the default vertical margins on each card's child elements.
2. Add the same vertical margin value between each card's child elements.

The first stage can be implemented as follows:

```css
.card > * {
  margin: 0;
}
```

This CSS rule can be phrased as: "for every direct descendent of elements with the `.card` class, set all its margin values to zero".

For the second stage, we want a CSS rule that only applies vertical margin between adjacent child elements of the card, not also before the first child or after the last child. An elegant way to achieve this is to use the owl selector (a.k.a. lobotomised owl selector), which is `*+*`. This selector selects an element only if it has a prior sibling element. The rule to use in this card example is the following:

```css
.card > * + * {
  margin-top: 8px;
}
```

This rule can be phrased as "for every direct descendent of elements with the `.card` class that also have a prior sibling element, set its margin top value to 8 pixels". Notice that the first child element will **not** get the margin top value applied to it, since it is has no prior sibling.

An alternative to using the owl selector is the following, but it requires two rules:

```css
.card > * {
  margin-top: 8px;
}

.card > :first-child {
  margin-top: 0;
}
```
