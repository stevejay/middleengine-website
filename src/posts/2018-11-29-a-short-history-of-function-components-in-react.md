---
layout: post
title: A short history of function components in React
summary: Looking back at the history of the function component.
date: 2018-11-29
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: 1-29wyvvLJA
---

As my blogging history demonstrates, I am a big fan of [React](https://reactjs.org/), the awesome JavaScript library for building user interfaces. In this post I take a quick dive into one feature of that library, the function component.

Originally there was only one type of component in React: the class component. It must extend either `React.Component` or `React.PureComponent`:

```jsx
class MyClassComponent extends React.Component {
  render() {
    return <p>Cats are great</p>;
  }
}
```

Later, in the version 0.14 release, function components were introduced:

```jsx
const MyFunctionComponent = () => <p>Cats are great</p>;
```

The terminology for this latter type of component varies and has included stateless functional component (SFC), stateless pure-function component, stateless component, and functional component; the [React documentation](https://reactjs.org/docs/components-and-props.html#function-and-class-components) refers to them as function components. These varied names reflect the restrictions that function components have compared to class components. They do not have access to [state](https://reactjs.org/docs/state-and-lifecycle.html#adding-local-state-to-a-class) (in particular as implemented in class components), do not have [lifecycle methods](https://reactjs.org/docs/react-component.html#the-component-lifecycle), cannot be [error boundaries](https://reactjs.org/docs/error-boundaries.html), and the [ref attribute](https://reactjs.org/docs/refs-and-the-dom.html) cannot be used on them. Conversely, a class component can implement lifecycle methods, can use state, can be an error boundary, and the ref attribute can be used on them.

The primary motivation for adding function components was optimization:

> The goal was to make components easier to optimize.
> — [Dan Abramov, 29 Sept 2018](https://github.com/facebook/react/pull/13748#issuecomment-425667422)

Interestingly, it was only with the release of React version 16 that function components began to be treated differently to class components. They initially behaved as per class components: a backing instance was created for each use of the function component and lifecycle methods checks were made. (The backing instance is required for a class component because it needs to be instantiated to be used; it cannot be used as-is.)

> There are currently no special optimizations done for functions, although we might add such optimizations in the future. But for now, they perform exactly as classes.
> — [Dan Abramov, 20 Aug 2016](https://github.com/facebook/react/issues/5677#issuecomment-241190513)

In React version 16, there are no longer backing instances and no unnecessary lifecycle methods checks are made. This means less memory usage and less code executing in the render phase, although,in the scope of your entire React app, these are not game-changing optimizations. Nevertheless, it represent the start of a longer journey:

> There are many ways to optimize, memoization based on shallow equality is just one possible optimization you can make. Functions already have less overhead since 16 (less property checks and memory usage), and they are also much more optimizable by compilers. Unfortunately our compilation experiments are still very early.
> — [Dan Abramov, 29 Sept 2018](https://github.com/facebook/react/pull/13748#issuecomment-425667422)

One way that this compiler could operate is to inline function components so that, for a given higher level component, it could create one large function component that includes the inlined code of the child function components. This is an optimization that is simply not possible with class components, because of the required backing instance and the potential use of lifecycle methods.

A footnote in the history of the function component is that there was [initially an expectation](https://github.com/facebook/react/issues/5677) that the function component would behave similarly to [PureComponent](https://reactjs.org/docs/react-api.html#reactpurecomponent), in that it would only be invoked if the props passed to it compared as not equal to the props previously passed to it. All things come to those who wait: React version 16.6 introduced [React.memo](https://reactjs.org/docs/react-api.html#reactmemo), a way to achieve this for function components.

Finally, the future of the function component is looking very interesting; the future is [Hooks](https://reactjs.org/docs/hooks-intro.html):

> Hooks represent our vision for the future of React. They solve both problems that React users experience directly (“wrapper hell” of render props and higher-order components, duplication of logic in lifecycle methods), and the issues we’ve encountered optimizing React at scale (such as difficulties in inlining components with a compiler).
> — [Dan Abramov, Nov 27 2018](https://reactjs.org/blog/2018/11/27/react-16-roadmap.html)

Hooks is an API available to function components that enables the React team to continue the optimization work that relies on components being functions, adding as it does features and component lifecycle participations that have previously only been available to class components. In this way function components should come to dominate in a React app, potentially with class components being removed from the core React distribution to be available only by installing a separate package. This really would represent a major evolution for React, one that started quite simply with the introduction of the function component in React version 0.14.
