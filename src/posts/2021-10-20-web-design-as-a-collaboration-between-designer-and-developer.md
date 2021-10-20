---
layout: post
title: "Web design as a collaboration between designer and developer"
summary: How designer and developer need to collaborate to achieve pixel perfect Web sites
date: 2021-10-20
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 104
draft: false
---

## Introduction

I recently saw a Web developer job specification that emphasised the need for pixel perfect design implementations. While I strive to achieve pixel perfection, I believe that it is only possible through a close collaboration between developer and designer. A Web developer cannot simply be a passive recipient of Web site designs. They should instead raise certain issues for discussion before work starts. These issues will be the focus of this post. Note that I assume the designer is using [Figma](https://www.figma.com) as that has been my recent experience.

## Use a design system

Every Web app and many Web sites will likely benefit from being built using a [design system](https://en.wikipedia.org/wiki/Design_system). Designs created using a suitably constrained design system will be consistent, and will be easier to construct and maintain.

Consistency is important for a good user experience and it also simplifies the process of translating designs into HTML and CSS. This results in less clarification between developer and designer regarding design details. To support consistency, the Figma features of [components](https://help.figma.com/hc/en-us/articles/360038662654-Guide-to-Components-in-Figma), [variants](https://help.figma.com/hc/en-us/articles/360056440594-Create-and-use-variants) and [component swapping](https://help.figma.com/hc/en-us/articles/360039150413-Swap-components-and-instances) should be used to create designs where everything has a single source of truth. By updating just that single source, the change gets applied to all usages. (Note that there are currently some limitations with variants and component swapping in Figma. In particular, overrides that have been previously applied do not always persist over a swap.)

The design system should be constrained to a deliberately reduced set of choices for each of its aspects. This simplifies the design system and simplifies every choice that the designer makes when creating a design. It will also be intuitively more obvious to the developer which values should be used for a given design element. This is very useful for achieving what some might consider the end-goal of a design system: the ability for the developer to work directly from a wireframe. If an entire step in the development process can sometimes be elided then development cycle times will be reduced. However, a design system that is too fine-grained will miss out on these advantages.

The lowest level building blocks for a design system are the permitted font variations (the combinations of font family, size, weight, and line height), colors, icons, and spacings. From my experience, the permitted spacings are most likely to be missing. The design system might instead allow arbitrary values, or might allow just about any value so long as it is exactly divisible by some number. Such approaches do not make for a design system with the previously discussed advantages. What normally makes sense is to use a geometric scale, one where the gaps between allowed values get larger as the sequence progresses. [This post by Nathan Curtis](https://medium.com/eightshapes-llc/space-in-design-systems-188bcbae0d62) is a good guide to the topic.

## Use Figma's auto layout and layout grid options

Figma includes auto layout and layout grid options on frame elements. They are analogous respectively to flexbox and grid in CSS. Use them to create the design system and the designs. Their use will encourage consistency. The layout of design elements will now be controlled automatically rather than through manual positioning. And as they have their equivalents in CSS, the developer can more easily translate the designs into CSS.

These layout options also allow the responsive behaviour of a design to be explored and specified, again in a way that is compatible with CSS. This is particularly useful for specifying the layout _between_ each breakpoint in a responsive site's design, not just the layout exactly at each breakpoint. If the developer is given the ability to resize layouts in Figma then they can easily see for themselves how the contents of a layout should resize.

## Decide how to handle text leading

Consider the following scenario. The designer creates a card design that consists of a heading followed by some summary text. The designer uses auto layout for the card's layout, and opts for a gap all around of 24px between the outline of the card and the text. This will look like so:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/card-no-leading-trim-2x.png "A basic card")

Notice that there is extra whitespace above the heading and below the summary text, in addition to the 24px gap:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/card-no-leading-trim-with-arrows-2x.png "Extra space above and below the card's text")

This is due to the [half-leading model used in Figma for line height](https://www.figma.com/blog/line-height-changes/). In this card example, the heading has a font size of 16px and a line height of 24px. With half-leading, the difference between the font size and line height is distributed evenly above and below the text.

Additionally, even though the font size is specified as 16px, the glyphs in the font do not necessarily fill that height. For example, with Helvetica Neue, there is a gap between tops of the Latin alphabet's capital letters and the top of the font's bounding box:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/foo-bar-2x.png "Bounding box for the Helvetica Neue font")

Figma adopted the same half-leading model as is used in CSS, so this card design can actually be reproduced perfectly by the developer. However, the designer might have wanted to eliminate that extra vertical space, and so the design would instead be the following:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/card-leading-trim-2x.png "Card with leading trimmed")

The extra vertical space has now been trimmed:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/card-leading-trim-with-markers-2x.png "Card with leading trimmed and annotations")

The developer can recreate this design in CSS without too much effort using negative vertical margins on the text elements. (This is [best done using pseudo-elements](https://gavinmcfarland.co.uk/thoughts/caveats-and-uses-for-leading-trim).) The downside is that the exact negative margin values to use are highly specific to the particular font family and font size. If the browser has to substitute a different font for the specified font, the text will likely not be vertically positioned correctly. The ultimate solution is the [proposed `leading-trim` CSS attribute](https://css-tricks.com/leading-trim-the-future-of-digital-typesetting/#:~:text=leading-trim%20is%20a%20suggested%20new%20CSS%20property%20that,of%20the%20Inline%20Layout%20Module%20Level%203%20spec.), which will make the process of trimming leading both trivial and configurable.

The real problem with this card design is from the perspective of the designer. They cannot have created this design in Figma using auto layout as Figma does not have a way to trim leading while using that layout option. Therefore the card design must have been manually sized and the text manually positioned.

I believe that there are currently only two viable options on how to proceed:

1. Accept the extra vertical space for now, and consider removing it when Figma supports trimming leading.
2. Remove the extra vertical space but accept that auto layout cannot be used in Figma for text positioning.

I feel that auto layout is too important a tool to lose so I would suggest that the first option is currently the best option.

For more information on trimming leading, please see [this post by Matthias Ott](https://matthiasott.com/notes/the-thing-with-leading-in-css).

## Prefer to use a font size of 16px or larger for input elements

Nowadays we create responsive Web sites that work well across many devices, including mobile phones. In Safari for iOS, when an input element has a computed font size that is less than 16px and the element has focus, [the browser automatically zooms into the page to enlarge the element](https://stackoverflow.com/questions/2989263/disable-auto-zoom-in-input-text-tag-safari-on-iphone/6394497#6394497). However, when the element loses focus, the browser does not restore the zoom level. This can be frustrating for users as now some previously visible parts of the site are hidden from view. The simplest solution is to use a font size of 16px or greater for input elements.

## Decide on the units to use for border widths, breakpoints, and everything else

CSS allows many size attributes to be specified in several different units, including `em`, `rem`, `px`, and `ch`. The basic advice I would give is the following:

- `px` for border widths
- `em` or `px` for breakpoints
- `rem` for everything else

As you can see, there is a choice between `em` or `px` for breakpoints. (You could use `rem` instead of `em`, but `em` is preferred here [due to Safari bugs](https://zellwk.com/blog/media-query-units/).) Breakpoints are often specified in `px`, but this can be problematic when the user has increased the font size setting in their browser. If the breakpoints are specified in `px` and the user has increased the font size setting to its maximum, the text might struggle to fit in the available space. As an example, consider the [BBC News site](https://www.bbc.co.uk/). At a viewport width of 1024px and with a font size of 'Medium' in Chrome, one section of the site looks like so:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/bbc-original-2x.png "The BBC news site at the 'Medium' font size")

If I increase the browser font size to 'Very large'—with no change in viewport width—then the text increases in size but the layout also changes. Specifically, the layout changes to that for a smaller breakpoint:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/bbc-very-large-text-2x.png "The BBC news site at the 'Very large' font size")

This layout change occurs because the developers of the BBC News site opted to specify the site's breakpoints using `rem`.

If I simulate the effect of specifying the breakpoints in `px` and I set the font size to 'Very large' then the layout will not change:

![](/images/2021-10-20-web-design-as-a-collaboration-between-designer-and-developer/bbc-px-very-large-text-2x.png "The BBC news site at the 'Very large' font size with a simulated breakpoint in px")

The result is that the card headings need to wrap more, and some might consider this harder to read. It is up to the designer and developer to decide which behaviour is better, although this is a decision that is easy to change.

## Decide how to style focus rings (without breaking accessibility)

Designers and clients can consider focus rings to be unsightly additions to a design, but they are important for accessibility. Thus the option of removing them entirely should be rejected. A compromise solution is to only show them if the user is currently using their keyboard to navigate the Web site and to hide them otherwise.

## Conclusion

An effective collaboration between designer and developer is important for the success of a project and the quality of its implementation. This post has covered some best practises to adopt and some decisions to be made to simplify and streamline that collaboration. The outcome should be designs that are suited to accurate recreation in the browser.

---

## Changelog

- 2021-10-20 Initial version
