---
layout: post
title: Imperative updates in React
summary: Solutions for performing imperative updates in React.
date: 2019-10-12
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 54
---

## Introduction

React is a popular and powerful library for creating user interface (UI) components. It implements a declarative approach to updating the UI. But sometimes we need to update React imperatively. In this post I look at various ways to implement imperative-style updates in a React application.

## The problem

React uses a declarative approach to rendering user interfaces (UIs). As a React developer, you create components to describe how the browser UI should look given the possible application states. You also create event handling logic for how the application state should change in response to user interactions. The changed state is passed down to child components and React updates the UI according to that new description. Exactly what browser DOM updates it needs to make is all determined by React. As the developer, you only need to consider what the UI should look like for a given application state. This is the power of the declarative approach to user interface development.

But sometimes you need to update the UI in a way that feels less like a change in application state and more like a one-off DOM update. An example is setting focus. In response to some user event you may want to set focus to a particular DOM element. But setting focus to that element should not prevent the user from then moving focus elsewhere. If you think of this in a declarative way, you would implement this as a change to application state. This could be by setting that particular element as the focused element. Focus could then only be shifted to a different element by another application state change. Of course, this is not how React currently works—it is the browser that knows which element currently has focus. Users can shift focus to another element independent of React.

Another example is scroll position. You may want to scroll an element into view based on some user interaction. Again, it is the browser that knows what the current scroll position of the page is and the user can scroll the page independent of React. As with setting focus, scrolling an element into view feels like a one-off update to the DOM rather than a change of React application state.

## Solution requirements

In this post I will use the example of setting scroll position. The requirements are as follows:

1. Four sections should be rendered on the page.
2. There should be four buttons at the top of the page, one for each section.
3. Clicking one of those buttons should result in its section scrolling into view.
4. Having clicked a button, if I then scroll back to the top of the page and click it again, its section should again scroll into view.
5. The user can click a button to render a random new list of four sections. In that case, the UI should update and scrolling a new section into view should continue to work as before.

That last requirement ensures that the solutions still works if the list of sections to display changes.

## The example application

I created [a simple React application](https://stevejay.github.io/section-scroll-experiment/) that shows all the solutions in this post. The source code for it is [here](https://github.com/stevejay/section-scroll-experiment).

Each solution consists of a parent component that renders the following child components:

- A Navigation component that contains the four section buttons.
- A Section component for each of the four sections.

Thus each section button and the section it controls are rendered in separate components. Some means of communication between them is required. In thinking about possible solutions to this problem, I made use of [this issue](https://github.com/facebook/react/issues/6646) in the React GitHub repository. It covers parent-to-child communication in React.

Note that scrolling an element into view can be performed in at least two ways. I have gone with the approach of using the [Element.scrollIntoView](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView) browser DOM method. An alternative is to use the older [window.scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollTo) browser DOM method with a CSS rule of `html { scroll-behavior: smooth; }`. I have hidden the exact implementation behind a utility method called `scrollToElement`. You will see used in the code examples below.

## The solutions

### Using IDs

As a React developer, you will hear discussion about how some UI feature is or is not implemented in a React way. The simplest solution is to use element IDs, bypassing using React to trigger scrolling in favour of direct DOM access.

I give each section an `id` prop, with the Card component rendering that `id` prop on the section's DOM element:

```jsx
const Section = ({ section }) => (
  <Card id={section.id} label={createSectionLabel(section)} />
);
```

When the user click on a button, I use the `Document.getElementById` method to get a reference to the section's containing element. I then scroll it into view.

```jsx
const Navigation = ({ sections }) => (
  <SectionNavigationBox>
    {sections.map((section) => (
      <Button
        key={section.id}
        label={`To ${createSectionLabel(section)}`}
        onClick={() => scrollToElement(document.getElementById(section.id))}
      />
    ))}
  </SectionNavigationBox>
);
```

#### Pros

- This is a simple solution that has the least amount of code compared to the other solutions.

#### Cons

- It is not a React-based solution.
- It requires developers maintaining this solution to understand that the `id` prop on each section cannot be removed. This is a danger because it is not obvious from the Section component why this prop is required.
- The Section component is not in control of how it is scrolled to.

### Using state

If you want a React-based solution to this problem, you would likely think about using state. It might work something like this:

1. The parent component declares state for the ID of the section to scroll to. I call this `scrollSectionId` and initialize it to the value `null`.
2. The current value of `scrollSectionId` is passed to each section component as a prop.
3. The parent component also declares an event handler to be called when the user clicks a section button.
4. When the user clicks a section button, that event handler is invoked with the ID of the section to scroll to.
5. The event handler changes the value of `scrollSectionId` to that ID value. Thus the value of the `scrollSectionId` prop passed to each section component changes.
6. Each section detects that their `scrollSectionId` prop has changed value. But only the section components whose ID it matches scrolls itself into view.

This works, but it has a problem. If the user scrolls back to the top of the page and clicks on the same section button again, the section will not scroll back into view. This is because the value of the `scrollSectionId` state variable has not changed.

The section could invoke an event handler that resets the value of the `scrollSectionId` state variable to `null` as soon as it has scrolled itself into view. This is not ideal, but let us first see what the solution would look like in code.

The parent component declares the `scrollSectionId` state variable and two event handlers. The `setScrollSectionId` handler is for when a section button is clicked. The `handleSectionScrolled` handler is for resetting `scrollSectionId` to `null`. This is the implementation:

```jsx
const UsingStateExample = ({ sections }) => {
  const [scrollSectionId, setScrollSectionId] = React.useState(null);

  const handleSectionScrolled = React.useCallback(
    () => setScrollSectionId(null),
    []
  );

  return (
    <Box gap="medium">
      <Navigation sections={sections} onNavClick={setScrollSectionId} />
      <Box gap="large">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            scrollSectionId={scrollSectionId}
            onSectionScrolled={handleSectionScrolled}
          />
        ))}
      </Box>
    </Box>
  );
};
```

The Section component uses an effect for detecting when the value of the `scrollSectionId` prop changes. If `scrollSectionId` is now equal to `section.id` then the section scrolls itself into view. It also invokes the `onSectionScrolled` event handler so that the parent component can reset `scrollSectionId` to `null`:

```jsx
const Section = ({ section, scrollSectionId, onSectionScrolled }) => {
  const ref = React.useRef();

  React.useEffect(() => {
    if (scrollSectionId && scrollSectionId === section.id) {
      scrollToElement(ref.current);
      onSectionScrolled();
    }
  }, [section.id, scrollSectionId, onSectionScrolled]);

  return <Card ref={ref} label={createSectionLabel(section)} />;
};
```

#### Pros

- It is a React-based solution.
- The Section component is in control of how it is scrolled to.

#### Cons

- Having to immediately reset the `scrollSectionId` state variable to `null` after it has been set to a non-`null` value is inefficient. It results in an immediate second render of the parent and its children.

### Using counters

This is a solution mentioned by one of the contributors to [the GitHub issue](https://github.com/facebook/react/issues/6646) linked to earlier in this post. It follows on from the above 'Using State' approach. I create a counter state variable for each section. When the user clicks on a section button I increment the counter value for the clicked section. This deals with the issue of supporting successive clicks on the same section button.

The parent component is quite complex. It creates a map of section ID to counter value (`countersMap`), with each counter value initialized to zero. When a section button is clicked, the `handleNavClick` event handler gets invoked. This increments the particular counter value for the clicked section. Each section gets passed its particular counter value as the `scrollCounter` prop. An effect resets `countersMap` if the `sections` prop changes value:

```jsx
const createCountersMap = (sections) =>
  sections.reduce((acc, section) => {
    acc[section.id] = 0;
    return acc;
  }, {});

const UsingCountersExample = ({ sections }) => {
  const [countersMap, setCountersMap] = React.useState(() =>
    createCountersMap(sections)
  );

  React.useEffect(() => {
    setCountersMap(createCountersMap(sections));
  }, [sections]);

  const handleNavClick = (id) =>
    setCountersMap((countersMap) => ({
      ...countersMap,
      [id]: countersMap[id] + 1,
    }));

  return (
    <Box gap="medium">
      <Navigation sections={sections} onNavClick={handleNavClick} />
      <Box gap="large">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            scrollCounter={countersMap[section.id]}
          />
        ))}
      </Box>
    </Box>
  );
};
```

In contrast the Section component is straightforward. It uses an effect to monitor for changes to its `scrollCounter` prop. The effect has to prevent scrolling on first render when the section mounts. It does this by ignoring the zero value that `scrollCounter` is set to on mount:

```jsx
const Section = ({ section, scrollCounter }) => {
  const ref = React.useRef();

  React.useEffect(() => {
    if (scrollCounter > 0) {
      scrollToElement(ref.current);
    }
  }, [scrollCounter]);

  return <Card ref={ref} label={createSectionLabel(section)} />;
};
```

#### Pros

- It is a React-based solution.
- The Section component is in control of how it is scrolled to.

#### Cons

- It is quite a lot of code.
- It is harder to understand than previous solutions. It involves the unintuitive behaviour of using a counter to trigger a side-effect in the application.

### Using a state object

The 'Using State' solution had the problem of requiring a state change right after scrolling to clear the `scrollSectionId` state. This fixes scrolling when the user clicks multiple times in succession on a particular section button. But we can avoid this problem if `scrollSectionId` is not a number or string but is instead an object. This object has a property of the section ID to scroll to:

```jsx
{
  id: "some-section-id";
}
```

This works because even if the ID to scroll to is the same as the previous ID, I always create a new object; React state cannot be mutated.

The parent component contains the state object as `scrollState`, initialized to `null`. This is passed to each section as a prop. An effect is required to reset `scrollState` to `null` if the value of `sections` changes. There is a handler (`handleNavClick`) for setting the scroll state object to the clicked section ID:

```jsx
const UsingStateObjectExample = ({ sections }) => {
  const [scrollState, setScrollState] = React.useState(null);

  React.useEffect(() => setScrollState(null), [sections]);

  const handleNavClick = (id) => setScrollState({ id });

  return (
    <Box gap="medium">
      <Navigation sections={sections} onNavClick={handleNavClick} />
      <Box gap="large">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            scrollState={scrollState}
          />
        ))}
      </Box>
    </Box>
  );
};
```

The Section component uses an effect to monitor for changes to the `scrollState` prop. If `scrollState` changes identity, i.e., it is a new object, the section checks if it is the section to be scrolled to. If it is then it invokes the `scrollToElement` function:

```jsx
const Section = ({ section, scrollState }) => {
  const ref = React.useRef();

  React.useEffect(() => {
    if (scrollState && scrollState.id === section.id) {
      scrollToElement(ref.current);
    }
  }, [section.id, scrollState]);

  return <Card ref={ref} label={createSectionLabel(section)} />;
};
```

#### Pros

- It is a React-based solution.
- The Section component is in control of how it is scrolled to.
- It is quite a concise solution.
- It avoids the state change hack of the 'Using State' solution.

#### Cons

- It requires developers maintaining this solution to understand that `scrollState` has to be an object containing the section ID. It cannot be changed to just the ID itself.

### Using refs

This solution is likely the most commonly implemented of the React-based solutions. I keep a map of section IDs to section `ref`s. When the user clicks on a section button, I get the section `ref` corresponding to the ID of the clicked section. Then I invoke an imperative function that the ref exposes to scroll to that `ref`'s section. The `ref`s are used to allow one component to synchronously invoke a function on another component.

The parent component declares a map of section ID to `ref`, called `refsMap`. When a section button is clicked, the `handleNavClick` event handler is invoked. It gets the `ref` for the related section and invokes the `scroll` imperative handle function declared on that `ref`.

```jsx
const UsingRefsExample = ({ sections }) => {
  const refsMap = React.useMemo(
    () =>
      sections.reduce((acc, section) => {
        acc[section.id] = React.createRef();
        return acc;
      }, {}),
    [sections]
  );

  const handleNavClick = (id) => refsMap[id].current.scroll();

  return (
    <Box gap="medium">
      <Navigation sections={sections} onNavClick={handleNavClick} />
      <Box gap="large">
        {sections.map((section) => (
          <Section
            key={section.id}
            section={section}
            ref={refsMap[section.id]}
          />
        ))}
      </Box>
    </Box>
  );
};
```

The Section component is straightforward. It exposes a function called `scroll` that the parent component can invoke. This means that section scrolling is encapsulated within this component. The alternative is for the parent component to call `scrollToElement(refsMap[id].current)` itself. But this would mean that the section component is not in control of how it is scrolled into view:

```jsx
const Section = React.forwardRef(({ section }, ref) => {
  const cardRef = React.useRef();

  React.useImperativeHandle(ref, () => ({
    scroll: () => {
      scrollToElement(cardRef.current);
    },
  }));

  return <Card ref={cardRef} label={createSectionLabel(section)} />;
});
```

This solution is similar to the 'Using Counters' solution. It also requires a map of section ID to some datum, but it is more understandable. Unless there was some unusual UI behaviour required that only counters could resolve, I would always favour `ref`s.

A restriction of this solution is that the section to scroll to needs to be linked by `ref`s and event handlers to the button that the user clicks. In this particular scrolling problem, these two elements are close together in the DOM and so linking them is straightforward. If these elements are further apart in the DOM then this might not be a suitable solution. The 'Using a State Object' solution could be a better choice. The state could be stored in Redux or some other state management library.

#### Pros

- It is a React-based solution.
- The Section component is in control of how it is scrolled to.
- It uses `ref`s, whose role in React includes being an 'escape hatch' for imperative-style coding.

#### Cons

- It requires managing a map of refs.
- The usages of `ref` might be confusing.
- It is more suited to problems where the DOM elements involved are close together in the DOM.

## Conclusion

I have demonstrated a variety of ways of performing imperative actions in a React app. Each has pros and cons. It is very much up to the developers on a project to decide which solution they are happiest with. The solutions that appeal to me are the 'Using Refs' and 'Using a State Object' solutions. They are the most React-like solutions. Of the two, the 'Using a State Object' solution is the simpler so I would favour using it in my own applications.

---

## Changelog

- 2020-08-28 Plain English and structure improvements
