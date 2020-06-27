---
layout: post
title: Adding visual regression testing to a React app
summary: Approaches and considerations when adding visual regression testing to a React application.
date: 2018-08-19
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
---

A while ago I began adopting a [lean testing](https://blog.usejournal.com/lean-testing-or-why-unit-tests-are-worse-than-you-think-b6500139a009) approach to quality control of React single page applications. I now implement the following practises:

- Static type checking of my code (using either [Flow](https://flow.org/)
  or [TypeScript](https://www.typescriptlang.org/),
  although I would recommend the latter if you are starting a new project
  and particulary if you use Visual Studio Code as your IDE).
- Unit testing of algorithmic code, such as formatting and mapping functions.
- Visual regression testing of the app's presentation components.
- End-to-end testing of the app's behaviour.

I also look to further enhance quality through using the following practises:

- Software design discussions.
- Pull requests.
- Automated monitoring and logging of the deployed app.

This post is focused on the approach I use for visual regression testing of a React single page application. To adopt it, the first steps are to add [Storybook](https://storybook.js.org/) to the app and to start writing stories for the presentation components. (To avoid components that are balls of mud, a component should either define the visual appearance of some part of the screen, or define how some part of the screen behaves and/or how it connects to a data source. Dan Abramov talks about this [in a blog post](https://medium.com/@dan_abramov/smart-and-dumb-components-7ca2f9a7c7d0).)

These stories are great as a design document and to allow components to be developed in isolation. Some of them might be for individual components, like buttons, but others might be for components that include other components, like a form or a page header. The idea now is to leverage these stories for visual regression testing. First, though, there are some caveats to mention. For the least chance of false positives, visual regression testing requires the following:

- No animations to be running.
- A transparent caret.
- Fonts that have loaded.
- The actual images and the reference images being generated on the same platform
  (or something compatible) because of potential differences in anti-aliasing.

These issues have solutions, which I will mention below. It would also be good to vary the viewport width for some tests, to check that the styling is correct on mobile as well as on desktop.

So for running your Storybook stories for visual regression testing, there are paid services and free tools available, with some of them listed [on the Storybook site](https://storybook.js.org/docs/testing/automated-visual-testing/). I actually use a free combination they do not mention&#8212;[storybook-chrome-screenshot (now Storycap)](https://github.com/reg-viz/storycap) and [reg-suit](https://github.com/reg-viz/reg-suit)&#8212;but I first gave the paid service [Chromatic](https://www.chromatic.com/) a go. Chromatic was interesting because I had a whole bunch of blank screenshots when I used it. It runs your stories on its servers, which deals with generating the actual and references images on the same platform, and it injects some CSS to disable animations. The problem was that I was using a bunch of 'fade in' animations, all of which work by setting opacity initially to zero. With animations disabled, that initial value never changes and so the components are not visible in the screenshots. I dealt with this by not applying animations if `NODE_ENV === 'test'` [as shown here](https://github.com/stevejay/artfullylondon-web-admin/blob/master/src/shared/animation-box.jsx), but it is basically a hack. I also was not sure how to vary screen width in the tests; in theory this should be easy when Storybook version 4 is released as it adds a `withViewport` decorator.

As I say, I settled on storybook-chrome-screenshot and reg-suit, largely because it is free and I could get a decent development flow:

1. I write stories.
1. I add the storybook-chrome-screenshot decorator, indicating the widths I want it to take screenshots at.
1. I create a bucket in S3 and add the reg-suit integration to the Github repository.
1. I set up [CircleCI](https://circleci.com/) so that when I create a pull request, a job runs the storybook-chrome-screenshot CLI tool.
1. It builds and runs Storybook in a headless browser, saving all the screenshots to a directory on the CI server.
1. The job then runs the reg-suit tool, which checks for the commit that is the parent for the branch, downloads its associated screenshots from the s3 bucket, and then diffs them with the local ones.
1. It generates a [nice report](https://artfullylondon-admin-reg-suit.s3.amazonaws.com/d247fd3ce7444ec2ce597497cf6e2db38d2a9b08/index.html) and adds [a comment](https://github.com/stevejay/artfullylondon-web-admin/pull/13) to the pull request with the result.
1. If I am happy with the differences, I squash and rebase the PR into master.
1. CircleCI runs on master to deploy the changes, and in the process runs a job similar to the above to generate and upload the new expected images.

Note that the expected images are not committed to source control. You can run the tools locally to see what your actual images are looking like as you make changes, but the problem of anti-aliasing means that I cannot compare local images with those created on the CI servers without there being loads of false positives. In theory there are image comparison algorithms that try to ignore anti-aliasing differences but reg-suit does not seem to support this and I do not know how successful it would actually be.

I have been surprised that I have not had issues with false positives because fonts have not yet loaded. I do add some code to the Storybook tests to wait for fonts to preload, but I am not sure if it is actually necessary. I do [inject some CSS](https://github.com/stevejay/artfullylondon-web-admin/blob/master/src/testing/disable-caret.js) to make the caret transparent when the screenshot are being taken, and use the aforementioned hack to disable animations. If you do not have the 'fade in' issue, you can just inject some additional CSS to disable animations.

You could of course also do visual regression testing of the entire app, not just of components and sets of components in Storybook. I have not got round to doing that yet, so I am not sure what the workflow and caveats are.

All this is available to view in [this repo](https://github.com/stevejay/artfullylondon-web-admin). If you have got cash to splash, definitely check out the paid services. The idea ultimately is to find a smooth workflow for the team that they feel helps them to avoid visual regressions and does not feel like a chore and is not noisy.
