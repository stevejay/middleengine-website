---
layout: post
title: "A performance issue with the prop getters pattern in React"
summary: A look at the prop getters pattern that is used in some React.js libraries and how it has a potential performance issue.
date: 2021-12-20
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 110
draft: false
---

## Introduction

I recently tried implementing the prop getter React pattern in a simple npm library that I maintain. The process revealed a performance limitation with the pattern that I discuss in this blog post.

## Background

Chris Krycho [wrote](https://v5.chriskrycho.com/journal/small-non-trivial-projects-for-learning/) that, "for learning effectively, nothing is better than a real project which gives you a place to experiment and play." For me, that project is an npm package called [react-roving-tabindex](https://www.npmjs.com/package/react-roving-tabindex). It is a React implementation of the [roving tabindex accessibility pattern](https://w3c.github.io/aria-practices/#kbd_roving_tabindex).

With this pattern, multiple tab stops are presented to the keyboard user as a single logical tab stop. The toolbar is a widget that benefits from the pattern. Ordinarily, a keyboard user navigating a page with a toolbar would have to tab through all of the controls in the toolbar to get beyond it. But with this pattern only one of the controls in the toolbar is ever focusable. This is achieved by setting the `tabindex` of the focusable control to `0` and the tabindex of the other controls to `-1`. The user now has to tab over only one control in the toolbar to navigate beyond it. To navigate within the toolbar, the user tabs into it and then uses the arrow, Home or End keys to shift focus to a different control. As a bonus, the toolbar now has a memory: when the user tabs back into the toolbar, the control they last interacted with will be the focused control.

## Implementation

There are two main parts to the pattern: the tab stops themselves, and the higher logic for moving focus between them. The current implementation in react-roving-tabindex uses React context to support communication between the tab stops and the higher logic. The rover state and various callbacks are passed down through context to the tab stops. A tab stop can then invoke a callback to trigger an action in the higher logic.

This implementation represents one possible solution to the problem. The key design decision is how the rover logic will know which DOM elements are the tab stops to be controlled. I opted for a self-registration approach. Each tab stop registers itself on mount with the higher logic, and unregisters itself on unmount. React context works well for this, but there are disadvantages. The main problem is the need to connect a tab stop component, such as a Button component, to the rover logic using a hook function. Normally you would be using a component library for your buttons, so now you have to create a wrapper component for it:

```typescript
export const ButtonWithRovingTabIndex: FC<Props> = ({
  label,
  rowIndex,
  icon,
  primary,
  disabled,
  onClick,
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [tabIndex, focused, handleKeyDown, handleClick] = useRovingTabIndex(
    ref,
    disabled,
    rowIndex
  );
  return (
    <Button // From a component library
      ref={ref}
      label={label}
      icon={icon}
      disabled={disabled}
      primary={primary}
      compact
      tabIndex={tabIndex}
      onClick={(event) => {
        handleClick();
        onClick(event);
      }}
      onKeyDown={handleKeyDown}
    />
  );
};
```

I was aware of a React design pattern called the [prop getter pattern](https://kentcdodds.com/blog/how-to-give-rendering-control-to-users-with-prop-getters) (with further discussion [here](https://kentcdodds.com/blog/react-hooks-whats-going-to-happen-to-render-props) and [here](https://javascript.plainenglish.io/5-advanced-react-patterns-a6b7624267a6)) that could be used instead of context. This pattern is used in the [downshift](https://github.com/downshift-js/downshift) and [react-table](https://github.com/tannerlinsley/react-table) packages.

The downshift library includes a `useSelect` hook that encapsulates the logic for creating a custom select dropdown. The [usage example in its documentation](https://github.com/downshift-js/downshift/tree/master/src/hooks/useSelect) is the following:

```javascript
function DropdownSelect() {
  const {
    isOpen,
    selectedItem,
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    highlightedIndex,
    getItemProps,
  } = useSelect({ items });
  return (
    <div>
      <label {...getLabelProps()}>Choose an element:</label>
      <button type="button" {...getToggleButtonProps()}>
        {selectedItem || "Elements"}
      </button>
      <ul {...getMenuProps()} style={menuStyles}>
        {isOpen &&
          items.map((item, index) => (
            <li
              style={
                highlightedIndex === index ? { backgroundColor: "#bde4ff" } : {}
              }
              key={`${item}${index}`}
              {...getItemProps({ item, index })}
            >
              {item}
            </li>
          ))}
      </ul>
    </div>
  );
}
```

There are four prop getters in use: `getToggleButtonProps`, `getLabelProps`, `getMenuProps`, and `getItemProps`. Each is invoked to get the prop values for a particular component part, and those are spread to apply them. For example:

```javascript
<button type="button" {...getToggleButtonProps()}>
```

The getters can take arguments:

```javascript
{...getItemProps({item, index})}
```

The usage example shows that prop getters can be used to implement the entire select dropdown as a single component. There is no need for separate components for each part of the dropdown. This would not be possible if you used React context. You would have to separate the usages of hooks that access the context from the component that renders the context provider. (You can see this demonstrated [here](https://codesandbox.io/s/pedantic-field-75uuc?file=/src/App.js).)

However your custom select dropdown is implemented, refs and event handlers will need to be added to the DOM elements that it is made of. These allow the dropdown code to hook into the browser's event handling and to update the DOM, such as by setting focus. The problem here is that the developer using the component might need to add their own refs and event handlers. For example, there could be some additional functionality that they need to add to the component. Merging refs and event handlers is potentially a pain:

```typescript
return (
  <Button
    ref={mergeRefs(myRef, theirRef)}
    onClick={(event) => {
      myOnClick(event);
      theirOnClick(event);
    }}
    onKeyDown={(event) => {
      myOnKeyDown(event);
      theirOnKeyDown(event);
    }}
  />
);
```

You might also want to support a user event handler being able to cancel the action of the library event handler. This would complicate usage of the library.

Usefully, prop getters can be implemented to support a solution to the problem. Rather than the developer performing the merging manually, the prop getter can do it internally. The developer just needs to pass their overrides as arguments to the getter:

```javascript
<ul
  {...getMenuProps({ onKeyDown: myOnKeyDown, ref: myRef })}
  style={menuStyles}
>
  ... content elided
</ul>
```

The returned ref and event handler props will result in both the developer code and the library code being executed.

To me there are notable advantages to the prop getter pattern and this motivated me to try using it in my library. I did succeed in creating an implementation, but I did find two performance-related issues:

1. Rendering the entire widget within a single component, as in the `useSelect` example above, can result in slow rendering.
2. While an answer to this is to create memoized child components, it requires prop getter functions that support memoization. The issue here is that it can be problematic to create suitably stable prop getters.

Performance issues have been found in both [downshift](https://github.com/downshift-js/downshift/issues/1050) and [react-table](https://github.com/tannerlinsley/react-table/issues/2824). To explain the issue, I am going to continue to focus on the `useSelect` hook in downshift and how the issue was resolved there.

Imagine that we have followed the example in the `useSelect` documentation to implement our custom select dropdown. However, we have found that rendering performance is an issue. To solve this, we want to extract the menu item element to a separate component:

```javascript
<li
  style={highlightedIndex === index ? { backgroundColor: "#bde4ff" } : {}}
  key={`${item}${index}`}
  {...getItemProps({ item, index })}
>
  {item}
</li>
```

So we create a new `MenuItem` component and wrap it in `React.memo`:

```javascript
const MenuItem = useMemo(({ isHighlighted, item, index, getItemProps }) {
  return (
    <li
      style={isHighlighted ? {backgroundColor: '#bde4ff'} : {}}
      key={`${item}${index}`}
      {...getItemProps({item, index})}
    >
      {item}
    </li>
  )
})
```

Our new component requires four props: `index`, `highlightedIndex`, `item`, and `getItemProps`. The first three props will work well with memoization, but `getItemProps` will only work well if it is itself memoized. If this is not done, a new function will be created every time the dropdown is rendered.

The downshift library was indeed [updated](https://github.com/downshift-js/downshift/pull/1051/files) to use `useCallback` to memoize the prop getters:

```javascript
const getItemProps = useCallback(
   /* function details elided */,
   [dispatch, latest]
)
```

A problem they had with this change is that their prop getters depended on the current values of state and props. This means that these values would need to be added to the `useCallback` dependency array. However, one or more of the state or prop values will likely be different on every render. This is because state changes (either through `useState` or `useReducer`) are the primary reason why components are re-rendered. But if those values have changed then the `useCallback` memoization will fail and a new prop getter function will be returned by that hook on every render. And so our new MenuItem component will get passed a new `getItemProps` function every time the parent renders.

The way that downshift gets around this is... interesting. If you look at the previous code example, you will see that `getItemProps` depends on two values. The first is `dispatch`, which is returned by `useReducer` and is [always stable and will not change identity on re-renders](https://reactjs.org/docs/hooks-reference.html#usereducer). The second is `latest`. This value is obtained via a custom hook at the start of the `useSelect` hook:

```javascript
const latest = useLatestRef({
  state,
  props,
});
```

This is the implementation of `useLatestRef`:

```javascript
function useLatestRef(val) {
  const ref = useRef(val);
  // technically this is not "concurrent mode safe" because we're manipulating
  // the value during render (so it's not idempotent). However, the places this
  // hook is used is to support memoizing callbacks which will be called
  // *during* render, so we need the latest values *during* render.
  // If not for this, then we'd probably want to use useLayoutEffect instead.
  ref.current = val;
  return ref;
}
```

This sets the value of the ref from the body of the `useHook` function, rather than in a lifecycle hook or an event handler. This is only allowed if it is done once as part of the lazy initialization of a ref:

> "Unless you’re doing lazy initialization, avoid setting refs during rendering — this can lead to surprising behavior. Instead, typically you want to modify refs in event handlers and effects."
> — [Hooks FAQ, React Web site](https://reactjs.org/docs/hooks-faq.html#is-there-something-like-instance-variables)

The specific problem is that it is not concurrent mode safe. But now the memoized prop getters can access state and props without actually depending on both. This could well cause issues in React version 18 (which is not yet released at the time of writing).

A detail that confuses me is the comment about potentially using `useLayoutEffect` instead. I do not believe that the sequencing of the renders and the `useLayoutEffect` invocations allows for this as an alternative solution to the problem. The basic sequence of events for a render of our custom select dropdown will be the following:

1. The containing DropdownSelect function component is invoked.
2. As part of this, a MenuItem function component is invoked for each item in the dropdown.
3. Once all render functions have been invoked, the refs are set.
4. Any `useLayoutEffect` functions are executed, working upwards through the component tree.

Thus rendering has already completed by the time the `useLayoutEffect` functions execute.

The way I found around the problem was particular to my situation. I could remove the value that changed frequently from my prop getter so that the getter no longer needed to depend on it. However, this meant the library API was ugly, as the developer has to not only invoke the prop getter and spread its values, but also directly set an additional prop on the same component:

```typescript
const { getTabContainerProps, getTabStopProps, getTabStopTabIndex } = useItemRover(...);

  return (
    <StackedLayout>
      <Button label="Focus before" />
      <Grid columnsCount={columnsCount} aria-label="Cells" {...getTabContainerProps()}>
        {items.map((item) => (
          <Button
            key={item.id}
            disabled={item.id === '5'}
            label={item.label}
            {...getTabStopProps(item)} // Prop getter result spread here
            tabIndex={getTabStopTabIndex(item)} // Prop directly set here
          />
        ))}
      </Grid>
      <Button label="Focus after" />
    </StackedLayout>
  );
```

## Conclusion

The prop getter pattern is useful to know. It can be used to create a clean API for developers, one that allows them to easily integrate their own refs and callbacks. However, there can issues with supporting memoization of the prop getters when trying to improve rendering performance. There are solutions but they might not be concurrent mode safe or they may make the API trickier to use.

---

## Changelog

- 2021-12-20 Initial version
