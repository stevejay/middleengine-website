---
layout: post
title: Tips for using Styled Components
summary: Tips and tricks to enhance your use of the Styled Components CSS-in-JS library.
date: 2019-11-10
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 52
---

## Introduction

The library [Styled Components](https://styled-components.com/) is one of many CSS-in-JS solutions for styling Web apps. I have been a big fan of [CSS Modules](https://github.com/css-modules/css-modules) but, having used Styled Components on a recent project, I am a convert. I have found some rough edges so I thought I would post about how I have improved my Styled Components usage.

## Theming

A key feature of Styled Components is that [it supports theming](https://styled-components.com/docs/advanced#theming). It makes sense to base your theme's shape around the [System UI Theme Specification](https://system-ui.com/theme/). Your theme will be compatible with any Styled Components-based library that uses it. For example, both [Styled System](https://styled-system.com/theme-specification/) and [XStyled System](https://xstyled.dev/docs/theme/) follow the specification.

**Note:** XStyled System has [changed significantly](https://xstyled.dev/docs/introduction/#story) since this post was written. It still looks like an excellent library to use in combination with Styled Components.

The specification defines a set of key/value pairs for the theme. Example keys are `space`, `fontSizes`, and `colors`. You need to decide what the type of each value will be. Generally your choice is for a value to be an array, an object, or an array with aliases:

```js
// space as an array:
space = [0, 4, 8, 16, 32, 64];

// space as an object:
space = {
  small: 4,
  medium: 8,
  large: 16,
};

// space as an array with aliases:
space = [0, 4, 8, 16, 32];
space.small = space[1];
space.medium = space[2];
space.large = space[3];
```

Sometimes the best choice is obvious, such as using an object for `colors`. But with theme keys like `space` there are arguments for using an array or an object.

## TypeScript

I write Web apps in TypeScript when I can. Styled Components comes with TypeScript typings. They declare the theme object as an empty interface called `DefaultTheme`. This supports you being able to type that theme object according to the theme object you are using in your app. You can create a `d.ts` file in your project and populate it like so, where `theme` is your theme object:

```ts
import { theme } from "./wherever";

declare module "styled-components" {
  type AppTheme = typeof theme;
  export interface DefaultTheme extends AppTheme {}
}
```

This works because TypeScript [merges interfaces](https://www.typescriptlang.org/docs/handbook/declaration-merging.html#merging-interfaces) that have the same identifier in the same namespace.

## CSS as a JavaScript object

If you create a simple styled component with only static CSS then the result is compact and readable:

```ts
const StyledExample = styled.div`
  color: white;
  background-color: #783654;
  padding: 2rem;
  margin: 1rem;
  font-family: sans-serif;
  font-size: 1.5rem;
`;
```

When you include references to theme values then the lambdas make the component harder to read:

```ts
const StyledExample = styled.div`
  color: ${(props) => props.theme.colors.white};
  background-color: ${(props) => props.theme.colors.primary900};
  padding: ${(props) => props.theme.space[3]};
  margin: ${(props) => props.theme.space[4]};
  font-family: ${(props) => props.theme.fonts.display};
  font-size: ${(props) => props.theme.fontSizes[4]};
`;
```

I saw a tweet by [@siddharthkp](https://twitter.com/siddharthkp/) (now deleted) that demonstrated how the above can be rewritten:

```ts
const StyledExample = styled.div(
  ({ theme }) => css`
    color: ${theme.colors.white};
    background-color: ${theme.colors.primary900};
    padding: ${theme.space[3]};
    margin: ${theme.space[4]};
    font-family: ${theme.fonts.display};
    font-size: ${theme.fontSizes[4]};
  `
);
```

You might find this version easier to read. The technique is in the Styled Components documentation in the section on [writing CSS as JavaScript objects](https://styled-components.com/docs/advanced#style-objects). Note that the `css` function is not required in the above example. I use it here to trigger highlighting of the enclosed CSS when using the [vscode-styled-components extension](https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components).

## Helper libraries

If you are writing styled components from scratch then you can also use [Styled System](https://styled-system.com/theme-specification/) or [XStyled System](https://xstyled.dev/docs/theme/). Both have the same benefits:

- Simplifying the creation of Styled Components that expose style props.
- Providing a succinct syntax for responsive styles.
- Providing alternative ways to access theme values.

The XStyled System site explains on [this page](https://xstyled.dev/docs/introduction/#story) why two libraries exist for this rather than one.

Styled System and XStyled System have TypeScript declarations in the [Definitely Typed](https://github.com/DefinitelyTyped/DefinitelyTyped) repository

## Using helper libraries to add style properties

Sometimes you want a styled component to be configurable via props. You might want to create a generalized flexbox-based `Box` component. It would support props for various flexbox, background, and spacing CSS properties. You could of course create this yourself:

```ts
type Props = {
  flexDirection: import("csstype").FlexDirectionProperty;
  justifyContent: import("csstype").JustifyContentProperty;
  alignItems: import("csstype").AlignItemsProperty;
  padding: import("csstype").PaddingProperty<string>;
  margin: import("csstype").MarginProperty<string>;
  color: import("csstype").ColorProperty;
  backgroundColor: import("csstype").BackgroundColorProperty;
  boxShadow: import("csstype").BoxShadowProperty;
  zIndex: import("csstype").ZIndexProperty;
};

const Box = styled.div<Props>`
  min-width: 0;
  display: flex;
  flex-direction: ${(props) => props.flexDirection};
  justify-content: ${(props) => props.justifyContent};
  align-items: ${(props) => props.alignItems};
  padding: ${(props) => props.padding};
  margin: ${(props) => props.margin};
  color: ${(props) => props.color};
  background-color: ${(props) => props.backgroundColor};
  box-shadow: ${(props) => props.boxShadow};
  z-index: ${(props) => props.zIndex};
  /* probably a bunch of other user-defined rules here */
`;
```

You can use the component like so:

```ts
import React from "react";
import { ThemeContext } from "styled-components";

const SomeComponent = () => {
  const theme = React.useContext(ThemeContext);

  return (
    <Box
      flexDirection="column"
      backgroundColor={theme.colors.primary900}
      padding={theme.space[3]}
    />
  );
};
```

This approach has problems:

- The CSS is verbose.
- You have to manually access theme values and pass them as prop values.
- The props do not support responsive values. What if you wanted the padding to be larger on a desktop display?

To solve these problems, you could instead use XStyled System or Styled System:

```ts
import {
  backgrounds,
  color,
  flexboxes,
  positioning,
  shadows,
  space,
  BackgroundsProps,
  ColorProps,
  FlexboxesProps,
  PositioningProps,
  ShadowsProps,
  SpaceProps,
} from "@xstyled/system";

type Props = FlexboxesProps &
  SpaceProps &
  ColorProps &
  BackgroundsProps &
  ShadowsProps &
  PositioningProps;

const Box = styled.div<Props>`
  min-width: 0;
  display: flex;
  ${flexboxes}
  ${space}
  ${color}
  ${backgrounds}
  ${shadows}
  ${positioning}
`;
```

While the names of the functions and props types differ between the two libraries, the effect is the same. The resulting styled component is both easier to write and easier to use:

```ts
import React from "react";

const SomeComponent = () => (
  <Box
    flexDirection="column"
    backgroundColor="primary900"
    padding={{ xs: 3, lg: 5 }}
  />
);
```

The only caveat is that there is no strong typing of theme keys, like `primary900` in the above example. But the advantages outweigh this disadvantage.

Both libraries include some functions that add multiple properties to your styled component. For example, `space` includes multiple margin and padding props. There are also finer grained functions like `marginTop` that add only one or a few properties. This allows you to make your styled component as flexible or constrained as it needs to be. For example, I only wanted a single `marginTop` prop on the following styled component:

```ts
import styled from "styled-components/macro";
import { marginTop, MarginTopProps } from "@xstyled/system";

const Stack = styled.div<MarginTopProps>`
  & > * + * {
    ${marginTop}
  }

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  width: 100%;
`;
```

This also allows me to support responsive `marginTop` prop values:

```ts
const SomeComponent = () => (
  <Stack marginTop={{ xs: 2, lg: 4 }}>
    <div>One</div>
    <div>Two</div>
  </Stack>
);
```

## Custom style properties in helper libraries

In the previous section I created a `Stack` component with a single `marginTop` prop. I preferred to give that prop a different name, one that better reflects what it represents. For example, I wanted to name the prop `verticalSpacing`.

XStyled System exports a `style` function for this purpose:

```ts
import { MarginTopProps, style, getSpace } from "@xstyled/system";

const verticalSpacing = style({
  // Can be an array, to support synonyms, e.g., marginTop and mt:
  prop: "verticalSpacing",
  // Can be an array, to support setting multiple CSS properties:
  cssProperty: "marginTop",
  themeGet: getSpace,
});

type Props = { verticalSpacing: MarginTopProps["marginTop"] };
```

Styled System provides similar functionality via the `system` function as described [here](https://styled-system.com/custom-props/):

```ts
import { system, MarginTopProps } from "styled-system";

const verticalSpacing = system({
  verticalSpacing: {
    // Can be an array, to support setting multiple CSS properties:
    property: "marginTop",
    scale: "space",
  },
});

export type VerticalSpacingProp = {
  verticalSpacing: MarginTopProps["marginTop"];
};
```

## Using helper libraries to access theme values

XStyled System includes getter functions for each type of theme prop. You can use them to rewrite the example styled component from the 'CSS as a JavaScript Object' section:

```ts
import { getColor, getSpace, getFont, getFontSize } from "@xstyled/system";

const StyledExample = styled.div`
  color: ${getColor("white")};
  background-color: ${getColor("primary900")};
  padding: ${getSpace(3)};
  margin: ${getSpace(4)};
  font-family: ${getFont("display")};
  font-size: ${getFontSize(4)};
`;
```

Or you can use the `th` function which has the same getter functions attached to it:

```ts
import { th } from "@xstyled/system";

const StyledExample = styled.div`
  color: ${th.color("white")};
  background-color: ${th.color("primary900")};
  padding: ${th.space(3)};
  margin: ${th.space(4)};
  font-family: ${th.font("display")};
  font-size: ${th.fontSize(4)};
`;
```

The getters are a more compact syntax compared to accessing the `theme` prop via lambda functions. They have the disadvantage of not supporting strongly typed theme property access. For example, the string `"display"` in `getFont("display")` may or may not be an actual theme prop alias. There is also no autocomplete in your IDE. But these getter functions process their arguments using the same algorithm as the custom style properties. The only exception is they do not support responsive values.

This can be very useful. Imagine that I want to allow you to specify the margin value around it via a prop. But the final value that the `margin` CSS property will have is an adjusted version of that value:

```ts
type Props = { margin: string };

const StyledExample = styled.div<Props>`
  margin: calc(${(props) => props.margin} / 2);
`;
```

Because it is an adjusted value, I cannot use the `margin` style property:

```ts
import { margin } from "@xstyled/system";

const StyledExample = styled.div<Props>`
  /* No way to use calc here! */
  ${margin}
`;
```

An advantage of the `margin` style property is that it allows you to specify the prop value in two ways:

- As a theme space index or alias, like `2` or `large`.
- As a regular CSS value, like `1.5rem` or `30px`.

At the moment only the latter style is permitted. But by using a getter I can offer this choice:

```ts
import { getSpace } from "@xstyled/system";

type Props = {
  spacing: string | number;
};

const StyledExample = styled.div<Props>`
  margin: calc(${(props) => getSpace(props.spacing)} / 2);
`;
```

I use it like so:

```ts
// A theme space prop index
const ExampleOne = () => <StyledExample spacing={3}>One</StyledExample>;

// A theme space prop alias
const ExampleTwo = () => <StyledExample spacing="large">Two</StyledExample>;

// Can still set a custom pixel value
const ExampleThree = () => <StyledExample spacing={40}>Three</StyledExample>;

// Can still set a custom rem value
const ExampleFour = () => <StyledExample spacing="10rem">Four</StyledExample>;
```

`@xstyled/styled` offers an extra form of getter. If you use the `styled` object from `@xstyled/styled-components`, you can write theme values directly into your CSS:

```ts
import styled from "@xstyled/styled-components";

const StyledExample = styled.div`
  color: white;
  background-color: primary900;
  padding: 3;
  margin: 4;
  font-family: display;
  font-size: 4;
`;
```

This makes for compact CSS rules, although you still do not get strong typing. This will definitely be too much magic for some developers.

Styled System includes a single getter function that is available in the `@styled-system/theme-get` package. You can use it like so:

```ts
import { themeGet } from "@styled-system/theme-get";

const StyledExample = styled.div`
  color: ${themeGet("colors.white")};
  background-color: ${themeGet("colors.primary900")};
  padding: ${themeGet("space.3")};
  margin: ${themeGet("space.4")};
  font-family: ${themeGet("fonts.display")};
  font-size: ${themeGet("fontSizes.4")};
`;
```

(At the time of writing, `@styled-system/theme-get` does not have a TypeScript declaration file.)

I do not think this getter is as useful as the ones in `@xstyled/styled`. The user would have to pass theme prop paths to access theme prop values:

```ts
const SomeComponent = () => (
  <StyledExample spacing="space.4">Hello you</StyledExample>
);
```

## Mixins

Mixins are straightforward to create. This is a mixin that visually hides an element while still leaving it visible to screen readers:

```ts
const visuallyHidden = () => css`
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
`;
```

Note that the `css` function is not required in the above example. It is being used to trigger highlighting of the enclosed CSS when using the [vscode-styled-components extension](https://marketplace.visualstudio.com/items?itemName=styled-components.vscode-styled-components).

You can use this `visuallyHidden` mixin like so:

```ts
const SomeComponent = styled.span`
  ${visuallyHidden}/* other CSS rules here */
`;
```

The mixin will automatically get the styled component's props passed to it. This means you can create a mixin that accesses those props:

```ts
type Props = { someProp: string };

const someMixin = (props: Props) => css`
  overflow: ${(props) => props.someProp};
`;
```

This is used in the same way as the previous mixin:

```ts
type Props = { someProp: string };

const SomeComponent = styled.span<Props>`
  ${someMixin}/* other CSS rules here */
`;
```

## Conclusion

Styled Components is a popular library for CSS-in-JS and it has a rich ecosystem. Hopefully I have expanded your knowledge of the ecosystem and demonstrated some patterns for you to adopt.

---

## Changelog

- 2019-11-10 Initial version
- 2020-06-28 Minor formatting and grammatical changes
- 2020-08-27 Plain English improvements
- 2021-10-21 Added a note about the new version of xstyled
- 2022-08-30 Fix 404 links
