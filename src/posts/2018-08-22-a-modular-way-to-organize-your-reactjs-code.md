---
layout: post
title: A modular way to organize your React code
summary: An approach to organizing your React application source code.
date: 2018-08-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: 92dgYPsir9k
---

I have decided that it is time for that special rite of passage every blogging React developer undertakes: describing how I organize my application source code.

Firstly, I have to point out that there is no one solution. A good solution for a given team depends on many factors, such as the expected size of the code base, what dependencies exist between sections, what libraries or frameworks are being used to manage the application state, how fine-grained to be about placing related files in a single directory, personal preference, and a myriad of other considerations. There is also nothing to stop you reorganizing the source code over time if problems become apparent with your initial approach.

A trawl of the internet turns up some recurring themes:

- The [React documentation](https://reactjs.org/docs/faq-structure.html) mentions the two common approaches of grouping by feature type or by file type.
- An elaboration on grouping by feature type by François Zaninotto that suggests [grouping files by domain rather than by file type](https://marmelab.com/blog/2015/12/17/react-directory-structure.html).
- A similar [modular approach](https://medium.com/@alexmngn/why-react-developers-should-modularize-their-applications-d26d381854c1) by Alexis Mangin.

I should also mention the very succinct advice by Dan Abramov: [move files around until it feels right](https://react-file-structure.surge.sh/).

My concern in this post is how to organize a larger React code base. Some kind of modular approach makes most sense to me:

- All the code to do with a particular feature or section of the app is encapsulated in its own overall directory.
- Since all the files relating to that feature are located together, navigating between them is easy.
- When I move on to a different feature, I can close that parent directory and forget about the code that exists within it, reducing distractions as I work on the app.
- A modular approach assists if you need to do [code splitting](https://reactjs.org/docs/code-splitting.html) to improve the app's performance.

I have an example code base [there](https://github.com/stevejay/artfullylondon-web-admin) where you can see my particular modular approach. It has been bootstrapped using [create-react-app](https://github.com/facebook/create-react-app). The _src_ directory contains the application's source code and has the following basic structure:

```
modules/
	...
shared/
	...
app.js
registerServiceWorker.js
...other top-level JavaScript files
```

Any React application is likely to have components and helper functions that are required by many of its pages. I put these in the _shared_ directory. Any module can import these shared files. It is structured like so:

```
utils/
	...
entity-image/
	...
scroll/
	...
...other directories/
page-header.jsx
with-theme.jsx
... other files
```

Some components, like _PageHeader_ are single independent components and are located at the root level of the _shared_ directory. Others like _EntityImage_ consist of a main component and a number of additional child components, so I encapsulate these in their own directory. The basic approach is to use nesting only when it assists in understanding the file structure.

The _modules_ directory contains a subdirectory for each independent module in the application. Think of these as standalone, independent parts of the app. They could be parts of the basic app structure, like the header or the footer, they could be distinct sections of the app, like a dashboard page, or they could encapsulate all of a particular type of functionality, like authentication.

A module has a top-level _index.js_ file that exports the few components and/or helper functions that are required by the high-level app code to bootstrap the app. For example, the dashboard module exports the _DashboardPage_ component and that component is used by the top-level _app.js_ file to display that component when the user views the root page ('/') of the app.

One very important feature of this structure is that **there are no dependencies between modules**. The only dependencies a module can have are to the code in the shared directory. Previously I used an approach where a module could depend on another module, but this became very confusing very quickly. Allowing cross-dependencies creates a dependency graph between modules, and it is hard to remember the hierarchy of the dependencies and it is easy to introduce circular references.

However, not having dependencies between modules leads to a major problem, because sometimes there are dependencies. For example, I have an authentication module and a menu module. The former encapsulates everything about authentication and the latter everything about the main navigation header and sidebar menu available at the top of every page in the app. But the sidebar menu has to include a logout button, and the logic for how to handle a logout request is correctly located out of reach in the authentication module. Similarly, the navigation header includes a quick search option, with a button that opens a modal dialog where the user can enter a search, but the search logic is located out of reach in the search module.

My fix for this was to create the concept of menu option handler components. The top-level menu module component requires that two such handler components are passed to it via props, one for the logout menu option and one for the search menu option. These handlers define the behaviour of each option when it is triggered. The actual visual appearance is still determined by the menu module, as a menu option handler component has to be passed a component that it renders as its visual appearance. For example, the top-level _Menu_ component requires a `searchMenuOptionHandler` prop to be passed to it. It renders this passed component in the navigation menu, passing it the component that actually renders the search button:

```
<SearchMenuOptionHandler component={SearchButton} />
```

The _SearchMenuOptionHandler_ component renders the component it is passed, in this case the _SearchButton_ component. When doing so, it passes it an `onClick` reference to be invoked when the search button is clicked, and a boolean that indicates if the search dialog is open or not:

```
<Component searchOpen={searchOpen} onClick={searchOpened} />
```

The _SearchMenuOptionHandler_ component is part of the search module and completely control displaying the search dialog and what happens when the user enters a search term there. The menu module is in control of the visual appearance of that option in the navigation menu, but it is the search module that brings the option to life. This is also how the logout button works in the sidebar menu. In this way, a dependency between the menu module on the one hand and the auth and search modules on the other is avoided by the latter modules exporting handler components and the menu module requiring them via props. It is only the top-level _app.js_ file that knows about all of these components and is responsible for connecting them together:

```
...
<Menu
  logoutMenuOptionHandler={LogoutMenuOptionHandler}
  searchMenuOptionHandler={SearchMenuOptionHandler}
>
...
```

The downside of this approach is that dependencies have to be passed at the _app.js_ level and potentially need to be passed down through a few components in a module to find their way to where they are actually required. This is not something I have yet found to be a problem, but there is an alternative approach: you could use [context](https://reactjs.org/docs/context.html) to avoid having to pass dependencies manually between components.

Another issue is that enforcing a no intra-module dependencies policy is something that can only be done by convention&#8212;I am not aware of any language features or tooling that would limit the developer working in a given module to importing only shared code.

## Conclusion

React is deliberately not opinionated about how you should organize your source code. I have experienced problems with very large React applications that have not used a modular approach or that have used this approach with unrestricted dependencies between modules. My preferred approach of modules but with no dependencies between them is an attempt to reduce complexity in a large React application and to potentially make individual modules reusable in other applications.
