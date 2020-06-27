---
layout: post
title: The dangers of fragile patterns in React lifecycle methods
summary: A cautionary look at the guarantees or lack thereof in React lifecycle methods.
date: 2018-12-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
---

The [React 16.4 update](https://reactjs.org/blog/2018/05/23/react-v-16-4.html#changelog) altered how the static `getDerivedStateFromProps` lifecycle method behaved. Previously the method was only invoked if the component's props or state had changed, as can be seen in [this React lifecycle diagram](https://twitter.com/dan_abramov/status/981712092611989509) that Dan Abramov created. That method's behaviour was altered in the update such that it now gets invoked unconditionally before _every_ render of the component. The Twitter user [@ManuelBieh](https://twitter.com/ManuelBieh) updated Dan's diagram [in this tweet](https://twitter.com/ManuelBieh/status/994618772999884800) to include the change. ([This](https://github.com/facebook/react/pull/12600#pullrequestreview-114158562) is a good explanation as to why the change was made.)

The fix caused an [angry response among some in the React community](https://github.com/facebook/react/issues/12898)&#8212;their apps worked with React 16.3 but broke when updated to React 16.4. The problems were ultimately due to a misunderstanding about how `getDerivedStateFromProps` behaved, specifically that it was an analogue for the deprecated `componentWillReceiveProps` method which had the guarantee that it would only be invoked if the component's props were changing.

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

The author of the SwipeableDrawer component wants `maybeSwiping` to be reset to `false` only when the component receives new props, not every time the component renders. This code breaks with React 16.4.

This entire episode demonstrates that it is possible in React to write code that is fragile and based on assumptions about behaviour that are not guaranteed. The components might work at the time of writing, but they could cease to work later. So what guarantees do we have?

I think the main misunderstandings in React are around the lifecycle methods and when they get invoked. I think the situation has been complicated by the changes that occurred to the React component lifecycle with the release of [React 16.3](https://reactjs.org/blog/2018/03/29/react-v-16-3.html#component-lifecycle-changes). These were necessary changes for the [React Fibre](https://github.com/acdlite/react-fiber-architecture) project, in particular to support incremental rendering.

When React decides that the app needs to be rendered, e.g., because a component receives new props, `setState` is invoked, or `forceUpdate` is invoked, it performs the work in two phases: the render phase and the commit phase. The render phase is when React works out how the browser DOM needs to be changed to reflect the current state of the app. It does this by creating the new virtual DOM state and diffing it with the current virtual DOM state. The subsequent commit phase is when React applies those changes to the browser DOM. An important impetus for the lifecycle changes introduced in React 16.3 was that invocation guarantees for certain render-phase lifecycle methods could no longer be maintained with the introduction of incremental rendering. An example is the guarantee that `componentWillReceiveProps` will only be invoked once each time the component's props are changing.

I am only aware of the following guarantees around lifecycle method invocations:

- The method `componentDidMount` will be invoked exactly once after the component mounts, that is, after a successful first render phase and at the end of the resulting commit phase.
- The method `componentDidUpdate` will be invoked exactly once at the end of a successful commit phase when the component is updated (as opposed to mounted).
- The method `getSnapshotBeforeUpdate` will be invoked exactly once at the start of a commit phase.
- The method `componentWillUnmount` will be invoked sometime after the component is excluded from the React virtual DOM, but only if the component successfully mounted in the first place.
- The render phase lifecycle methods&#8212;`static getDerivedStateFromProps`, `shouldComponentUpdate`, and `render`&#8212;could be invoked multiple times for no apparent reason at any point during that phase (e.g., not just because of a props change or a state change).

We can go further with the lack of guarantees for `shouldComponentUpdate` and the related `React.memo` and `React.PureComponent` tools: all are intended as optimizations and not as a means of preventing rendering in a way that makes your app works correctly. Your app should still behave correctly if you were to remove all their usages (although it would presumably be less responsive, since we should not prematurely optimise).

For me, the takeaway is to create boring components whenever possible, potentially rethinking your approach to a given problem to make the solution boring. Any necessary use of lifecycle methods or the render optimizations should be scrutinized for behaviour that is not guaranteed. I would also have previously said that this largely affects class components rather than function components, but the likely introduction of [Hooks](https://reactjs.org/docs/hooks-intro.html) to React means that function components will soon dominate. It has yet to be seen if Hooks will lead to fewer fragile patterns and misunderstandings around the React component lifecycle.
