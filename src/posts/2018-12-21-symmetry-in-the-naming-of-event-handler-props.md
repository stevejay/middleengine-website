---
layout: post
title: Symmetry in the naming of event handler props
summary: A common approach to event handler naming.
date: 2018-12-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: ewKDwf05Eds
---

In React, there is a common pattern used when naming event handler props and methods that uses the prefixes `on` and `handle`. Today I thought I would detail how it works.

Let us say we have a component that wraps an HTML `button` element, maybe to apply some styling. The component looks this:

```jsx
const Button = ({ children, onClick }) => (
  <button className="some-button" onClick={onClick}>
    {children}
  </button>
);
```

The convention is to prefix the names of props that pass event handlers with the word `on`, so I have done that here with the `onClick` prop.

Now let us say that this button is used within a component for displaying summary information for a given entity, and when its button is clicked then detailed information for that entity is shown somewhere on the page. The summary information component might look like this:

```jsx
class UserSummary extends React.Component {
  handleClick = () => {
    this.props.onClick(this.props.user.id);
  };

  render() {
    const { user } = this.props;
    return (
      <article>
        <h2>{user.name}</h2>
        <p>{user.email}</p>
        <Button onClick={this.handleClick}>Details</Button>
      </article>
    );
  }
}
```

We need here to pass the ID of the clicked entity to the parent of _UserSummary_. One approach, as implemented here, is to create a handler method in _UserSummary_ for the `onClick` event, and have that handler simply invoke the `onClick` prop passed to _UserSummary_, with the ID of the clicked entity as an argument. The convention is to prefix the names of implementations of event handers with the word `handle`, so I have done that here with the `handleClick` method.

But notice that the prop for the click event handler that is passed to _UserSummary_ is still named with the `on` prefix. This is because it is a prop not an implementation. This leads to a neat naming symmetry for event handler props, so that regardless of whether you are rendering HTML elements or React components, you are still always passing event hander functions to props named in the same way, with the `on` prefix:

```jsx
<button onClick={...} />
<UserSummary onClick={...} />
```

And to differentiate the names of implementations of event handlers, we use the `handle` prefix instead. This all leads to consistency in the naming around events, which helps any group of developers produce easily understood code.
