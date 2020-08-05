---
layout: post
title: Extending the single responsibility principle
summary: How identifying the key responsibilities in the code you write can lead to higher quality code.
date: 2018-08-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 62
---

If you are a software developer then you will have heard of the [SOLID principles](https://en.wikipedia.org/wiki/SOLID). SOLID is a mnemonic for five principles that are applicable to [object-oriented programming](https://en.wikipedia.org/wiki/Object-oriented_programming) (OOP) and that help you avoid some common anti-patterns. These principles are:

- [Single responsibility principle](https://en.wikipedia.org/wiki/Single_responsibility_principle)
- [Open/closed principle](https://en.wikipedia.org/wiki/Open/closed_principle)
- [Liskov substitution principle](https://en.wikipedia.org/wiki/Liskov_substitution_principle)
- [Interface segregation principle](https://en.wikipedia.org/wiki/Interface_segregation_principle)
- [Dependency inversion principle](https://en.wikipedia.org/wiki/Dependency_inversion_principle)

Some of the principles, like the Liskov substitution principle, apply specifically to OOP, although others apply more broadly. For example, when I code React single page applications I normally include relatively few uses of OOP structures and techniques (classes, inheritance, etc.), but I do make broad use of the single responsibility principle. In particular, it is a refinement of the single responsibility principle that I find incredibly useful, and it is what I am posting about today.

## Algorithm or coordinator

A while ago I read [a post by John Sonmez](https://simpleprogrammer.com/there-are-only-two-roles-of-code/) about how units of code can be classified into one of two roles&#8212;algorithm or coordinator&#8212;and how the quality and testability of your code can be improved by keeping those two roles apart. I think of this as a refinement of the single responsibility principle, that a particular single responsibility has a basic role classification of algorithm or coordinator.

I have applied this principle liberally in [a back-end services repo](https://github.com/stevejay/artfullylondon-api) on GitHub. An example of a coordinator is the [GraphQL resolvers module](https://github.com/stevejay/artfullylondon-api/blob/master/tag-service/src/resolvers.js) in the tag service. It includes a resolver for creating a tag:

```js
async createTag(__, request, context) {
  authorizer.checkUserIsAuthorizedForMutation(context);
  const tag = normaliser.normaliseCreateTagRequest(request.input);
  validator.validateCreateTagRequest(tag);
  const dbTag = mapper.mapCreateTagRequest(tag);
  await tagRepository.createTag(dbTag);
  return { node: dbTag };
},
```

This function is a coordinator because it coordinates the flow of information from function to function to achieve the desired outcome. The functions it invokes, like the validation and mapper functions, are the algorithms. They have the following characteristics:

- They are pure, in that their output is solely dependent on their inputs.
- They have no side effects.
- They often include numerous branches in their logic.

These characteristics make algorithms straightforward to unit test:

- No mocking of dependencies is required.
- Since there is no mocking and you are only checking that the correct output is produced for a given input, you are testing behaviour rather than implementation and that allows you to refactor the algorithm without potentially having to update the tests.
- It is easy to test the various branches via multiple unit tests, usually implemented as [row/parameterized tests](https://www.rhyous.com/2015/05/07/row-tests-or-paramerterized-tests-nunit/).

Note that mocking is very occasionally required for algorithms. One example is a mapper function that sets a created or updated date on the returned object to the current time. If this was JavaScript code, the function in the module that returns that timestamp could be mocked.

In contrast, coordinators tend to have the following characteristics:

- They have dependencies that need to be injected or mocked in unit tests.
- They have side effects.
- They usually have very few or no branches.

The first two of those characteristics make coordinators harder and more fragile to unit test:

- You need to mock the required dependencies.
- You are testing implementation rather than behaviour, so a refactor of the coordinator might require changes to the unit tests.

In my back-end code, I adopt a lean testing approach and rely on unit tests to test the algorithms, and integration or end-to-end tests to test the coordinators. The unit tests ensure that I get good coverage of the algorithms using tests that check all the branches and that are robust to implementation changes. The integration tests mean that I test the coordinators without mocking and so test behaviour rather than implementation.

As an example of testing an algorithm, each of the algorithm functions called by the `createTag` coordinator function mentioned above have unit tests. Here is one of those:

```js
describe("normaliseCreateTagRequest", () => {
  test.each([
    [
      { tagType: tagType.AUDIENCE, label: " The     Family   " },
      { tagType: tagType.AUDIENCE, label: "the family" },
    ],
  ])("%s should be normalised to %s", (request, expected) => {
    const result = normaliser.normaliseCreateTagRequest(deepFreeze(request));
    expect(result).toEqual(expected);
  });
});
```

In contrast, the coordinator function is tested using a few integration tests. The coordinator runs as a lambda which is deployed using the Serverless framework. I use the Serverless offline plug-in to be able to run the lambda locally against a local DynamoDB database running in a [Localstack](https://github.com/localstack/localstack) docker container, so no mocking is required. The tests are in [this file](https://github.com/stevejay/artfullylondon-api/blob/master/tag-service/tests/integration/tag-graphql-mutation.test.js) and are structured like so:

```js
describe("tag graphql querying", () => {
  ...

  it("should support adding a tag", async () => {
    ...
  })

  it("should fail to add a tag using the readonly user", async () => {
    ...
  })

  ...
})
```

## The front-end connection

After reading the post about this algorithm/coordinator role classification and having used it to improve my back-end coding and testing, I wondered how this would apply to the React front-end code I was writing. I realised that there was a similarity between the aforementioned post by John Sonmez and [a post by Dan Abramov](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0), which details a different but similar division of responsibility in React apps. Dan's basic premise is that a React component often either defines the visual appearance of some part of the screen (termed presentation components by Dan), or defines how some part of the screen behaves and/or how it connects to a data source (termed container components by Dan). Note that Dan's post was about an observation rather than a rule, as [he laments](https://twitter.com/dan_abramov/status/802569801906475008).

Applying this separation of concerns helps encourage the following:

- Components that are each simpler to understand.
- Components that are reusable.

But it is a spectrum. On the one hand we have the 'ball of mud' component that is 1000 lines long. And on the other hand we have components that could be quite straightforward with a simple mix of presentation and behaviour logic but have been turned into a several components to achieve separation purity. Sometimes mixing concerns is fine; I often implement low-level input components as a mix of presentation and behaviour as I think these two aspects are so entwined in such components.

As a concrete example of this separation of concerns when creating components, I usually create each form in my apps as two components. I create a presentation component that is the form's visual appearance, including its inputs and buttons, such as in [this component](https://github.com/stevejay/artfullylondon-web-admin/blob/master/src/modules/auth/components/login-form.jsx). I then create a handler component (I prefer the suffix 'handler' for container components) which connects the form and implements the submit handler; the corresponding handler component for the previous presentation component is [here](https://github.com/stevejay/artfullylondon-web-admin/blob/master/src/modules/auth/components/login-form-handler.jsx). I could combine the two components into one but I feel the separation makes each easier to understand and test.

Regarding testing, I test the two types of components in different ways:

- I use [Storybook and visual regression testing](/blog/posts/2018/08/19/adding-visual-regression-testing-to-a-react-app) to test presentation components.
- I use end-to-end tests written using [Cypress](https://www.cypress.io/) to check the handler logic.

Thinking further on this front-end connection, the React roles of handler (a.k.a. container) and presentation pair up with the roles of coordinator and algorithm in the back-end code I have described. Firstly, both the coordinator and the handler roles deal with coordinating how something happens. Secondly, the React presentation components will likely be written as function components. This means that the visual appearance of a component, as described by the object returned from the function, is solely dependent on the props passed to it. It is therefore an algorithm.

## Conclusion

I think writing back-end code using the role classification of coordinator or algorithm is similar to writing React components using the role classification of presentation or handler. It informs the structure of your code, how it should be implemented, and also how it should be tested. I believe that extending the single responsibility principle to identify a minimal set of role types for the code you write is an excellent technique for achieving high quality code and effective lean testing.
