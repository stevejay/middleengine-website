---
layout: post
title: A React development flow
summary: How to go about developing a new feature in a React Web app.
date: 2018-12-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 58
---

When you are tasked with adding a new feature to a React Web app, how do you go about creating the correct visuals and behaviours? I thought today that I would describe one approach that I have found to be very effective.

Let us imagine that I am working on a typical [line of business](https://en.wikipedia.org/wiki/Line_of_business) React Web app, and there is a requirement for a new page that allows an admin user to see the recent activity history of a given user. The UX design shows a page with a list of activities and a form that contains a text field and a submit button. This allows the admin user to enter the name of a user, click the submit button, and then see that user's recent activity. Luckily the back-end for this feature already exists so nothing prevents me from starting the front-end work, but how to start?

The approach that I have found to be very effective is to first concentrate on implementing the visual appearance of the feature, so initially just creating **presentation components**. Only when this process is complete do I then bring the result to life by a combination of inserting **handler components** between presentation components and converting presentation components to handler components. I term these components **handlers** because they handle app events and/or they handle interfacing with whatever data store the app uses. (This idea of presentation components and handler a.k.a. container components was introduced by Dan Abramov in [this post](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0).) The presentation components ensure that the feature has the correct visual appearance, and the handler components ensure that the feature is interactive and displays the correct data. Note that distinction is not a hard and fast rule, as [Dan laments](https://twitter.com/dan_abramov/status/802569801906475008).

I will now demonstrate how this two phase approach works in practise. I need to start with the presentation components, so I study the UX designs and create the following list of components that I might expect to create:

- A component that renders a list of activities.
- A component that renders a single activity.
- A component that renders the form.
- Possibly a component that renders the text field.
- Possibly a component that renders the submit button.
- A component that renders the layout of the form and the list displayed together on a page.

(In reality I can think of other presentation components that could also be required for display edge cases, like a component to display a message while a search is in progress, but I am going to stick with the simpler list above.)

I start with the component for rendering a list of activities. I implement it like so:

```jsx
const UserActivityList = ({ activities }) => {
  if (!activities) {
    return null;
  }

  return (
    <ul className="user-activity-list">
      {activities.map((activity) => (
        <li key={activity.id}>TODO</li>
      ))}
    </ul>
  );
};

UserActivityList.propTypes = {
  activities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
    }).isRequired
  ),
};
```

Notice that it takes an array of activities as a prop, and it is implemented as a function component. Because of their simple nature, presentation components will nearly always be implemented as function components (as opposed to class components). Also, for the sake of brevity, I am just indicating adding styling by setting the `className` attribute. In reality you would implement whatever approach your app takes to styling, be that styled components, CSS modules, plain CSS, an atomic CSS framework, or whatever.

When I am creating presentation components, my concerns are:

- That I am writing appropriate and semantic HTML markup (e.g., using the `ul` and `li` HTML element types to display a list).
- That I am following the [single responsibility principle](https://en.wikipedia.org/wiki/Single_responsibility_principle).
- That I am making the components reusable when it makes sense.
- That I am styling the components to match the UX designs.

I do not yet have any code for getting the list of a user's activities from the server (since I am not yet concerned with the feature's behaviour) so I do not have a list of activities to pass to my list component. Instead I can just pass a mock list of activities. I like to use [Storybook](https://storybook.js.org/) for this. I can create individual stories for the various possible lists of activities (e.g., none, one, many) and then check that each renders correctly.

I will now create the component that renders a single activity:

```jsx
const UserActivity = ({ entity }) => (
  <article className="user-activity">
    <h2>{entity.activityType}</h2>
    <p>{new Date(entity.timestamp).toISOString()}</p>
    <p>{entity.detail}</p>
  </article>
);

UserActivity.propTypes = {
  entity: PropTypes.shape({
    id: PropTypes.number.isRequired,
    activityType: PropTypes.string.isRequired,
    timestamp: PropTypes.number.isRequired,
    detail: PropTypes.string.isRequired,
  }).isRequired,
};
```

I will also update the UserActivityList component to use this new component:

```jsx
const UserActivityList = ({ activities }) => {
  if (!activities) {
    return null;
  }

  return (
    <ul className="user-activity-list">
      {activities.map((activity) => (
        <li key={activity.id}>
          <UserActivity entity={activity} />
        </li>
      ))}
    </ul>
  );
};
```

There is something interesting to notice here: the UserActivity component does not include any list-related elements in its markup; it is the UserActivityList component that wraps each activity in a `li` element. In this way it is solely the UserActivityList component that describes the 'list-ness' of the activity list. This maximises the reusability of the UserActivity component&#8212;it can be used to display the details of a user activity anywhere in the app, not just within a list.

In fact, the UserActivityList does not even need to be tied to displaying activities. It could instead be passed as a prop the component to display within each list item:

```jsx
const EntityList = ({ entities, entityComponent: EntityComponent }) => {
  if (!entities) {
    return null;
  }

  return (
    <ul className="entity-list">
      {entities.map((entity) => (
        <li key={entity.id}>
          <EntityComponent entity={entity} />
        </li>
      ))}
    </ul>
  );
};

EntityList.propTypes = {
  entities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
    }).isRequired
  ),
  entityComponent: PropTypes.func.isRequired,
};
```

Or it could use a [render prop](https://reactjs.org/docs/render-props.html), probably with its `children` prop being a render prop:

```jsx
const EntityList = ({ entities, children }) => {
  if (!entities) {
    return null;
  }

  return (
    <ul className="entity-list">
      {entities.map((entity) => (
        <li key={entity.id}>{children(entity)}</li>
      ))}
    </ul>
  );
};

EntityList.propTypes = {
  entities: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
    }).isRequired
  ),
  children: PropTypes.func.isRequired,
};
```

Regardless of how this is done, the list component can now display a list of any entity type, just so long as the entity type has an `id` property and so long as the list styling it applies is actually appropriate.

It is your choice whether you use a more generic approach or whether you prefer the more specific UserActivityList component. You might only use a more generic approach when you actually see repetition, using the [rule of three](<https://en.wikipedia.org/wiki/Rule_of_three_(computer_programming)>) as a guide for when to make the change.

An alternative to creating both the UserActivityList and UserActivity components is to create a single component that combines the two:

```jsx
const UserActivityList = ({ activities }) => {
  if (!activities) {
    return null;
  }

  return (
    <ul className="user-activity-list">
      {activities.map((activity) => (
        <li key={activity.id}>
          <article className="user-activity">
            <h2>{entity.activityType}</h2>
            <p>{new Date(entity.timestamp).toISOString()}</p>
            <p>{entity.detail}</p>
          </article>
        </li>
      ))}
    </ul>
  );
};
```

This of course works, and can sometimes be the right choice, but it has disadvantages:

- There is no component for displaying the details of an activity that could be reused elsewhere in the app.
- There is no component for displaying a list of activities/entities that could be reused elsewhere in the app.
- It loses the advantage that separate components have of each being able to evolve independently.
- It mixes responsibilities, those of how to display a single activity and how to display a list.

I will now create the component that renders the form:

```jsx
const UserSearchForm = ({ handleSubmit }) => (
  <form onSubmit={handleSubmit} className="user-search-form">
    <h2>Search for a user</h2>
    <fieldset>
      <label>Username TODO:Input</label>
    </fieldset>
    <button type="submit">Search</button>
  </form>
);

UserSearchForm.propTypes = {
  handleSubmit: PropTypes.func.isRequired,
};
```

I am going to use [React Final Form](https://github.com/final-form/react-final-form) to manage the form; it will pass my UserSearchForm component a prop called `handleSubmit`. As for the content of the form, it is up to you if you include the entire markup for the form in the UserSearchForm component or if you create a series of components (e.g., Button, TextInput, etc). The app you are working on will probably already have a set of shared components for buttons and inputs, either home-grown or as part of a component library, so you would just use those. I am going to keep things simple and include the button and text input in the UserSearchForm:

```jsx
const UserSearchForm = ({ handleSubmit }) => (
  <form onSubmit={handleSubmit} className="user-search-form">
    <h2>Search for a user</h2>
    <fieldset>
      <label>
        Username
        <Field
          name="username"
          render={({ input }) => <input type="text" {...input} />}
        />
      </label>
    </fieldset>
    <button type="submit">Search</button>
  </form>
);
```

I can now assemble the page from these various presentation components:

```jsx
const USER_ACTIVITIES = [ ... ];

...

render() {
  return (
    <main>
      <UserSearchForm handleSubmit={() => {}} />
      <EntityList entities={USER_ACTIVITIES}>
        {entity => <UserActivity entity={entity} />}
      </EntityList>
    </main>
  );
}
```

Notice that I have to pass some mock objects into the UserSearchForm and EntityList components (namely, the no-op `handleSubmit` prop and the mock user activities list). I will something about that now, because I am ready to start work on the handler components.

I need a handler component that runs the UserSearchForm component. My hypothetical app uses [Redux](https://redux.js.org/) for state management and implements a `searchForUserActivity` [thunk](https://github.com/reduxjs/redux-thunk) to query the server for a given user's recent activity:

```jsx
class UserSearchFormHandler extends React.Component {
  handleSubmit = (values) => this.props.searchForUserActivity(values.username);

  render() {
    return <Form component={UserSearchForm} onSubmit={this.handleSubmit} />;
  }
}

export default connect(null, { searchForUserActivity })(UserSearchFormHandler);
```

This handler component has two jobs:

1. Handle connecting the component to Redux so that I can access the `searchForUserActivity` thunk.
2. Invoke that thunk by handling the form's `onSubmit` event.

I have to update the page component to make use of this handler component:

```jsx
render() {
  return (
    <main>
      <UserSearchFormHandler />
      <EntityList entities={USER_ACTIVITIES}>
        {entity => <UserActivity entity={entity} />}
      </EntityList>
    </main>
  );
}
```

An alternative to creating a UserSearchFormHandler would be to mutate the UserSearchForm component to incorporate the handler component's code. This is a valid approach but I prefer to separate these concerns in my apps.

Now I can implement the handler component for the entity list:

```jsx
const EntityListHandler = ({ entities }) => (
  <EntityList entities={entities}>
    {(entity) => <UserActivity entity={entity} />}
  </EntityList>
);

export default connect((state) => ({ entities: state.userActivity.results }))(
  EntityListHandler
);
```

This handler component has a single job: to handle connecting to Redux so that I can access the user activity data returned by the server. Notice that both the handler components (this one and UserSearchFormHandler) do not include any HTML markup in their render methods. They only return presentation components, and it is only the presentation components that include HTML markup.

Again, I have to update the page component to use the EntityListHandler:

```jsx
render() {
  return (
    <main>
      <UserSearchFormHandler />
      <EntityListHandler />
    </main>
  );
}
```

And there you go! While this has been a simple feature to implement, hopefully you have gained some insights that will help you work through your next ticket. For me, concentrating on one aspect of the app first&#8212;the presentation aspect&#8212;before then bringing the result to life with the handler aspects simplifies the mental requirements for implementing a feature, encourages better markup and styling by focussing initially on just those aspects, and encourages the creation of reusable presentation components.
