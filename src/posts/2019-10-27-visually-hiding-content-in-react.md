---
layout: post
title: Visually hiding content in React
summary: Implement visually hidden content and skip links for a11y support in React.
date: 2019-10-27
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: Kp1Oz5fSxiw
---

I am interested in accessibility (a11y) and what patterns and practises I can adopt to improve the Web sites I work on. For example, I learned about the [roving tabindex](https://www.stefanjudis.com/today-i-learned/roving-tabindex/) pattern and I created a [React implementation](https://www.npmjs.com/package/react-roving-tabindex) in response. Another a11y pattern I have read about is including visually hidden content on a Web page to help a11y users understand and navigate the page. This is the pattern I am going to discuss today.

There are two basic variations on this pattern. The first is when the content is always visually hidden but it is hidden in a way that allows screen reader programs to still 'see' it. This could be used to, say, include additional information in a form so people using screen readers can better understand the form's inputs.

The second variation is when the content is by default visually hidden but it appears when the user is using the TAB key to navigate the page and the content receives focus. An example of such content is the [skip link](https://a11yproject.com/posts/skip-nav-links/). If you want to see this variation in action, the [MDN Web site](https://developer.mozilla.org/en-US/) includes a list of skip links at the top of the page, and the [Starbucks Web site](https://www.starbucks.com/) includes skip links in the header that skip to the navigation, main content, and footer.

Hiding content is not as simple as adding `display: none` or `display: none`. These both hide the content from screen readers. An approach that does work is implemented by Bootstrap's [sr-only SASS mixin](https://github.com/twbs/bootstrap/blob/master/scss/mixins/_screen-reader.scss):

```scss
@mixin sr-only {
  position: absolute !important;
  width: 1px !important;
  height: 1px !important;
  padding: 0 !important;
  margin: -1px !important;
  overflow: hidden !important;
  clip: rect(0, 0, 0, 0) !important;
  white-space: nowrap !important;
  border: 0 !important;
}
```

This technique is basically an update to one [described in 2011](https://snook.ca/archives/html_and_css/hiding-content-for-accessibility).

For content that should become visible when the user is tabbing through a page's focusable elements, Bootstrap includes the following mixin:

```scss
@mixin sr-only-focusable {
  &:not(:focus) {
    @include sr-only();
  }
}
```

This adds the CSS from the `sr-only` mixin, but only if the styled element does not have focus. The negation pseudo-class selector is supported in [IE9+ and modern browsers](https://caniuse.com/#feat=mdn-css_selectors_not).

Nowadays I use Styled Components for styling React components and I noticed that the GOV.UK developers created the [@govuk-react/skip-link](https://www.npmjs.com/package/@govuk-react/skip-link) React component using it. The component is designed to be used for both variations in hiding content, but it implements the focusable variation in a different way to Bootstrap. It always applies the CSS attributes to hide the content and then if the content is focusable it applies an extra rule to reset those attributes on focus. The following is the helper function that the component uses to do this:

```jsx
function visuallyHidden({
  important: isImportant = true,
  focusable: isFocusable = false,
} = {}) {
  const important = isImportant ? " !important" : "";
  return Object.assign(
    {},
    {
      position: `absolute${important}`,

      width: `1px${important}`,
      height: `1px${important}`,
      margin: `0${important}`,

      overflow: `hidden${important}`,
      clip: `rect(0 0 0 0)${important}`,
      clipPath: `inset(50%)${important}`,

      border: `0${important}`,

      whiteSpace: `nowrap${important}`,
    },
    isFocusable
      ? {
          "&:active,&:focus": {
            position: `static${important}`,

            width: `auto${important}`,
            height: `auto${important}`,
            margin: `inherit${important}`,

            overflow: `visible${important}`,
            clip: `auto${important}`,
            clipPath: `none${important}`,

            whiteSpace: `inherit${important}`,
          },
        }
      : {
          padding: `0${important}`,
        }
  );
}
```

This is problematic because it is sometimes not certain what each CSS attribute should be reset to on focus. For example, in the above function `position` is reset to be `static`, but maybe it needs to remain as `absolute`.

I instead created the following component:

```jsx
const VisuallyHidden = styled.span`
  /* && for increased specificity: */
  &&${(props) => (props.isFocusable ? ":not(:focus):not(:active)" : "")} {
    border: 0;
    clip: rect(0 0 0 0);
    clip-path: inset(50%);
    height: auto;
    margin: 0;
    overflow: hidden;
    padding: 0;
    position: absolute;
    white-space: nowrap;
    width: 1px;
  }
`;
```

To increase the specificity of the rule, I opted to use multiple ampersands rather than `!important`. This is a technique suggested in the Styled Components [documentation](https://www.styled-components.com/docs/faqs#how-can-i-override-styles-with-higher-specificity). You can adjust the specificity as you please; you might find that you require no additional specificity.

I then used this VisuallyHidden component to create a `SkipLink` component. First I created a styled component for the visual appearance of the skip link:

```jsx
const SkipLinkButton = styled.button`
  position: absolute;
  left: 1em;
  top: 1em;
  appearance: none;
  background: ${(props) => props.theme.colors.white};
  border-spacing: 0;
  border-radius: ${(props) => props.theme.radii[1]};
  color: ${(props) => props.theme.colors.link};
  font-weight: ${(props) => props.theme.fontWeights.normal};
  text-decoration: underline;
  padding: ${(props) => props.theme.space.xs};
`;
```

As you can see, I decided to implement it as a button that is positioned absolutely. I then used this styled button and the VisuallyHidden component to create the final skip link component:

```jsx
const SkipLink = ({ skipRef, children }) => {
  const handleClick = () => {
    // The skipping magic happens here.
  };

  return (
    <VisuallyHidden isFocusable as={SkipLinkButton} onClick={handleClick}>
      {children}
    </VisuallyHidden>
  );
};
```

I set the SkipLinkButton as the `as` [polymorphic prop](https://www.styled-components.com/docs/api#as-polymorphic-prop) of the VisuallyHidden component, which changes the underlying DOM element of the latter to a `button`.

Implementing a robust mechanism to skip to the target element is not straightforward. Often the target element is a non-focusable element like `h1`, `main`, `div` or `footer`, and a11y requirements and browser differences complicate the matter. There is an [excellent post by Axess Lab](https://axesslab.com/skip-links/) which describes the problems that can occur with the naive solution and how it can be fixed. In particular, I found the 'Update 3 - A comment from gov.uk' addition very useful. You can see the complete source code for my skip links solution in [this repository](https://github.com/stevejay/react-performance). It takes the approach of&#8212;if required&#8212;setting a `tabindex` value of `-1` on the target element before invoking `focus` and `scrollIntoView` on it, before removing the `tabindex` value on blur.
