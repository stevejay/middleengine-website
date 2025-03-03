---
layout: post
title: "Testing components that use atomWithHash from Jotai"
summary: How to configure JSDOM to ensure test isolation when testing React components that use atomWithHash from the Jotai npm package.
date: 2022-08-30
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 122
draft: false
---

The [`atomWithHash`](https://jotai.org/docs/utils/atom-with-hash) utility from the excellent `jotai` library can be used to create atoms that are connected to the hash part of the current URL. Changing the atom updates the hash and changing the hash updates the atom.

A problem arises when using jsdom with jest or vitest to test a component with such an atom. If the value of the atom is updated, it will change the value of the hash on the jsdom `window.location` object. This hash value does not get reset between tests. This allows a test to affect the behaviour of a subsequent test. In my case, this led to confusing failures in my test suite.

The fix is simple: reset the state of the hash before each test. This can be done in an individual test file or globally within the test setup file:

```ts
beforeEach(() => {
  window.location.assign('#');
});
```

This technique also allows you to set an initial hash state for an individual test:

```ts
it('allows for deep-linking to a search', async () => {
  window.location.assign('#launchName="star"&sortField="name"&sortAscending=true');
  // rest of the test here
});
```

---

## Changelog

- 2022-08-30 Initial version
- 2022-08-31 Title change and spelling fix
