---
layout: post
title: Value added front-ends
summary: Thoughts on how to add value to a front-end application.
date: 2018-08-23
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
---

You have probably heard, in the context of software development, of solved problems and unsolved problems. Solved problems are problems that already have solutions. An example is authentication. There are multiple SaaS providers of authentication, such as [Auth0](https://auth0.com/) and [Okta](https://www.okta.com/), and so you can just integrate one of these services instead of creating your own solution from scratch.

Taking such short cuts allows you to concentrate your development efforts on the areas where you can add value, on the unsolved problems. These are problems that require solving because there are no ready-made solutions. For example, it might be that some service or process needs to operate at an unusually large scale or with very tight timings. Solving these problems might take significant development effort and, given the constraints of time and money, might even be found to be unsolvable.

I am currently concentrating on working on React Web applications, and I have found that unsolved problems are far more likely on the back-end than on the front-end. For me, the difference between back-end and front-end coding is that the former is about data wrangling while the latter is about browser wrangling (specifically, getting all supported browsers to behave in the desired way). I believe that this concentration of unsolved problems on the back-end is because of that focus on the system's data: where it comes from, how it is processed, and how it can be made available to the front-end. The front-end essentially just consumes the result of all this work.

As a React developer on the front-end, I have found my job to largely consist of two aspects: deciding how to structure and architect the application, and dealing with the myriad of packages available on [NPM](https://www.npmjs.com/). (The latter can involve a lot of time spend choosing between packages, getting them integrated, and dealing with any limitations they have.) I feel my job is more about integrating existing solutions (be they code or concepts) rather dealing with unsolved problems. In some ways, it does not feel like I am adding value at all. These are all straightforward issues to solve, although it can be potentially quite time-consuming to fix some of them. Given that many line-of-business applications essentially consist of dashboards, listings, and CRUD operations on the data, it is not surprising that there is a lack of major challenge. In my experience, what unsolved problems do exist tend to be around visuals that have no ready-made solutions, such as custom data visualizations and innovative graphics content, but these are not common.

This all begs the question: how to add value on the front-end? I think that increased productivity is an excellent way to add value. How great would it be to find tools and languages and patterns and code that make you twice as productive? How useful would it be to be able to write applications in half the time, with functionality plugged together to achieve the desired result or configuration used to autogenerate content?

I have taken steps in this direction. I have been a developer on a React Web application where we used the domain model type information from the back-end, along with additional configuration files, to auto-generate listing, detail, and edit pages. It was revealing how that type information could be used throughout the app to reduce the amount of code we had to write. This is how I am going to continue trying to add value to the front-end.
