---
layout: post
title: The dangers of fragile patterns in React lifecycle methods
summary: A cautionary look at the guarantees or lack thereof in React lifecycle methods.
date: 2018-12-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 56
---

The [React 16.4 update](https://reactjs.org/blog/2018/05/23/react-v-16-4.html#changelog) altered how the static `getDerivedStateFromProps` lifecycle method behaved. This method was previously only invoked if the component's props or state had changed. This can be seen in a [React lifecycle diagram](https://twitter.com/dan_abramov/status/981712092611989509) that Dan Abramov created. Its behaviour was altered in React 16.4. It now gets invoked unconditionally _before_ every render of the component. The Twitter user [@ManuelBieh](https://twitter.com/ManuelBieh) updated Dan's diagram in [this tweet](https://twitter.com/ManuelBieh/status/994618772999884800) to include the change. And [this](https://github.com/facebook/react/pull/12600#pullrequestreview-114158562) is a good explanation on why the change was made.

The fix caused an [angry response from some in the React community](https://github.com/facebook/react/issues/12898)&#8212;their apps worked with React 16.3 but broke when updated to React 16.4. The problems were due to a misunderstanding about `getDerivedStateFromProps`. The assumption was that it was an analogue for the deprecated `componentWillReceiveProps` method. It had the guarantee that it would only be invoked if the component's props were changing.

The following code, [available here](https://github.com/mui-org/material-ui/blob/492766850d38e7a86583404fe05f06d2ed7220d1/packages/material-ui/src/SwipeableDrawer/SwipeableDrawer.js#L30-L35), demonstrates this misunderstanding:

```jsx
class SwipeableDrawer extends React.Component {
  static getDerivedStateFromProps() {
    // Reset the maybeSwiping state every time we receive new properties.
    return {
      maybeSwiping: false,
    };
  }

  ...
```

The author of SwipeableDrawer wants `maybeSwiping` to be reset to `false` only when the component receives new props. They do not want to reset every time the component renders. This code breaks with React 16.4.

This episode demonstrates that it is possible in React to write code that is fragile. You can base your code on assumptions about behaviour that are not guaranteed. The components might work at the time of writing, but they could stop working later. So what guarantees do we have?

I find misunderstandings in React tend to be around the lifecycle methods and when they get invoked. The situation was complicated by the changes to the React component lifecycle that debuted in [React 16.3](https://reactjs.org/blog/2018/03/29/react-v-16-3.html#component-lifecycle-changes). These were necessary for the [React Fibre](https://github.com/acdlite/react-fiber-architecture) project, in particular to support incremental rendering.

When React decides that the subtree needs to be rendered, it performs the work in two phases: the render phase and the commit phase. The render phase is when React works out how the browser DOM needs to change to reflect the current state of the app. It does this by creating the new virtual DOM state and diffing it with the current virtual DOM state. The commit phase is when React applies those changes to the browser DOM. React Fibre required supporting incremental rendering in React and this lead to the lifecycle changes in React 16.3. The invocation guarantees for certain render-phase lifecycle methods could no longer be maintained. One such guarantee was that `componentWillReceiveProps` only gets called when a component's props change.

I am only aware of the following guarantees around lifecycle method invocations:

- The method `componentDidMount` will be invoked exactly once after the component mounts. The render and commit phases need to first complete without error.
- The method `componentDidUpdate` will be invoked exactly once when the component is updated (as opposed to mounted). This is at the end of a successful commit phase.
- The method `getSnapshotBeforeUpdate` will be invoked exactly once at the start of a commit phase.
- The method `componentWillUnmount` will be invoked sometime after the component is removed from the virtual DOM. It is only invoked if the component successfully mounted in the first place.
- The render phase lifecycle methods&#8212;`static getDerivedStateFromProps`, `shouldComponentUpdate`, and `render`&#8212;could be invoked multiple times for no clear reason at any point during rendering. (So not just because of a props or a state change.)

We can go further with the lack of guarantees for shouldComponentUpdate and the related React.memo and React.PureComponent tools. All are intended as optimizations and not as ways to prevent rendering so that your app works correctly. Your app should still behave correctly if you were to remove all their usages (although it would presumably be less responsive, since we should not prematurely optimise).

In summary, you should create boring components whenever possible. Use lifecycle methods as little as possible. Scrutinize any use of lifecycle methods or render optimizations for behaviour that is not guaranteed.

---

## Changelog

- 2020-08-28 Plain English and structure improvements
