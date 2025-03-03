---
layout: post
title: "Testing Remix applications"
summary: Guidance for testing applications written using the Remix full-stack framework.
date: 2022-08-30
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 123
draft: true
---

## Introduction

Nearly a year ago, the [Remix full-stack framework](https://remix.run/) went from being closed source and requiring a subscription to being open source and free. This caused its profile to rise and I was intrigued by what I saw. Recently I decided to tackle a simple coding exercise in two ways: as a standard React SPA using client-side rendering, and as a Remix application. The coding exercise involved creating an application that uses the unofficial [SpaceX API](https://github.com/r-spacex/SpaceX-API) to search for SpaceX launches by name. This post details how I had to adapt my approach to testing in order to test the Remix version.

## The Single-Page Application

The source code for the React SPA solution is available [here](https://github.com/stevejay/agora-spacex-test). The app is built using [Vite](https://vitejs.dev/) and it renders solely on the client-side. The app uses the [react-query](https://tanstack.com/query/v4/docs/adapters/react-query) library to make the API calls.

The SPA is tested using integration tests. Generally an app will have a mix of unit, integration, and end-to-end tests, but the sweet spot is to mainly write integration tests. This is an approach that is championed by [Kent C. Dodds](https://kentcdodds.com/). (See [here](https://kentcdodds.com/blog/stop-mocking-fetch) and [here](https://kentcdodds.com/blog/testing-implementation-details) for some of his thoughts on the subject.) The tests are written using [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and I use [msw](https://mswjs.io/) to mock the API responses at the network level. 

The end result is tests that resemble how a real user interacts with the app but that still run quickly and robustly. Avoiding unit tests means avoiding testing implementation details and an over-reliance on mocking. Avoiding end-to-end tests means avoiding slower execution times and test flakiness.

Note that unit tests and end-to-end tests are still useful. For example, unit tests are useful for testing low-level shared components. End-to-end tests are important for writing smoke tests that client and server operate as a whole. They are also good for testing client-side only actions such the Auth0 [PKCE](https://auth0.com/docs/get-started/authentication-and-authorization-flow/authorization-code-flow-with-proof-key-for-code-exchange-pkce) login, and for visual testing of application pages.

## The Remix Application

While the classic SPA hands you a lot of freedom, Remix is opinionated. It funnels you toward a simpler, more robust solution than you might otherwise have created. It can be thought of as a mash-up between [react-router](https://github.com/remix-run/react-router) and [react-query](https://tanstack.com/query/v4/docs/adapters/react-query), where the resulting code straddles both the client and the server. The router is filesystem-based and supports nested routing. Nesting means that a given page in the app is likely constructed from multiple route components. Data fetching is performed server-side and is baked into each component, along with form submission handling. The result is impressive: less code on the client-side and simpler interactions with the server. Remix can optimise data fetching and automatically keep the UI up-to-date.

However, the fact that Remix is doing work behind the scenes to manage your app affects the testing strategy. 



The approach of relying on integration tests is not viable:

- A route component generally consists of the component itself and the loader and action functions. All are managed by Remix. For example, Remix invokes the loader function. You need to run Remix to test the route components.
- The nested nature of the routes means that testing a route component in isolation makes no sense. It might rely on data from another route component, and its loader might get invoked because of user actions elsewhere in the UI.
- Remix relies on a significant number of variables on the client to keep track of the current app state. Attempting to mock these would be painful. 

The only viable approach is to rely on end-to-end testing rather than integration testing. In this way the tests still resemble how a real user interacts with the app but we avoid subverting the framework for no gain. 

However, it is possible to add integration-style tests for the loader and action functions. 





Testing a route component in isolation makes no sense:

- 


The nested nature of the route components means that it makes no sense to test each in isolation.

 Exactly 

The behaviour of a route component will likely depend on the other route components that are rendered with it. It might rely on data from another route component, and its loader might get invoked because of user actions elsewhere in the UI. 






Data fetching is baked into each 

those routes. Each component of the route 

Data fetching is baked into its routing, which is itself based on nested routes

filesystem-based and 

The source code for the Remix solution is available [here](https://github.com/stevejay/remix-spacex-test). 






## Conclusion

Testing a Remix application required a significant change to how I normally test React SPAs. 
Nevertheless, the advantages of using Remix are clear and worth pursuing. I found that relying mainly on end-to-end testing with Playwright was sufficient and resulted in a decent developer experience.

---

## Changelog

- 2022-08-30 Initial version
