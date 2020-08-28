---
layout: post
title: Managing dependencies in React applications
summary: Ways to manage inter-module dependencies in a React application.
date: 2019-10-12
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 55
---

## Introduction

Managing dependencies in a simple React application is straightforward. You are probably the only developer working it, it does not contain many source files, and those files are normally organized [by file type](https://reactjs.org/docs/faq-structure.html#grouping-by-file-type). Dependencies between files are likely easy to keep track of and do not cause issues. With a more complex React application, it is probably being written and maintained by multiple developers. There will be many source files, and those files are probably [grouped into modules](https://medium.com/@alexmngn/why-react-developers-should-modularize-their-applications-d26d381854c1).

Without some way to police the dependencies between modules, those dependencies can quickly become a mess. This is a particular problem in JavaScript, because we are free to import any file from any other file. This is regardless of whether that creates a circular dependency or whether a file is intended to be used by other modules or not. In this post I look at how you can tame those dependencies.

## Modules and dependencies

The benefits of organizing the application's code base into modules include:

- Reducing the cognitive load when working on the code base.
- Facilitating many developers working on the code base at the same time.

Generally it is manageable to keep track of dependency issues within a module. It is harder to keep track of dependency issues between modules. The most obvious type of dependency issue is the circular dependency. This occurs when file _A_ requires file _B_, and file _B_ requires file _A_. A circular dependency can also be less obvious, when there is a chain of required files that creates the cycle. You should be able to add code to your build system to automatically detect circular dependencies at build time. For example, if you are using Webpack then there is [this plug-in](https://www.npmjs.com/package/circular-dependency-plugin).

But circular dependencies are not the only kind of dependency issue. Interfaces are an important concept in any code base. For a given module, it is often the case that certain files are expected to form the public interface for the module. The are the files that dependent modules are allowed to import. Other files in the module are implementation details and not intended to be used outside of the module. If a developer is working on a particular module, it is important that he or she has the freedom to change its internals. If modules can import whatever they like from other modules, this can create a mess of hard-to-track dependencies. Bugs could arise in unrelated modules when a developer makes a change to a module's internals. What we need is a way to enforce the public interface of a module. This would restrict both what can be imported from the module and which modules are allowed to import it.

## Good Fences

Luckily there are tools available for this. The one I have used is [Good Fences](https://www.npmjs.com/package/good-fences). This is an explanation of the problem it solves:

> JavaScript's module system is a specialized form of anarchy because any file can import any other file, possibly allowing access to code that was really meant to be an internal implementation detail of some larger system. Other languages have concepts like DLL boundaries and the internal keyword to mitigate this. Good-fences provides a way to enforce similar boundaries in the TypeScript world.
> — [Good Fences on NPM.js](https://www.npmjs.com/package/good-fences)

Before adding Good Fences to a React application, I first construct a hierarchy of its modules. This might look something like the following:

![](/images/2019-10-12-managing-dependencies-in-react-js-apps/dependency-hierarchy-2x.png "An example module hierarchy")

A given module can only have dependencies on those modules below it in the hierarchy. It cannot have dependencies on any modules above it or at the same level. Note that the Shared module is for lower-level code that is useful across many modules in the application.

The top module in the above hierarchy is App, which might actually be a single component. It brings the whole application to life, so inevitably has dependencies on all the other modules.

I have added Header and Footer as below App but above Search, Auth, and Orders. This may or may not be true in your application. I find that site headers and footers tend to contain functionality from many modules. A header might contain login/logout functionality from the Auth module and a quick search form from the Search module.

Modules should be as self-contained as possible, with only a dependency on the Shared module. In the above hierarchy this is true of the Search, Auth, and Orders modules. In this way you have fewer modules to consider when working on one of them, and you know which modules your changes might affect.

At this point the hierarchy is informational, but you can use Good Fences to enforce it.

First create a [barrel file](https://basarat.gitbook.io/typescript/) at the root of each module. This should exports everything from the module that other modules can import. Then add a fence.json file to each module alongside the barrel file. The fence.json file:

- Declares the name of this module.
- Declares the barrel file as the export for the module.
- Declares the modules (if any) that this module can import.

This is all explained on the [Good Fences npm.js page](https://www.npmjs.com/package/good-fences). Once you have done this, you can run the Good Fences tool to check your dependencies match the hierarchy.

## Conclusion

Dependency management within a React application can be problematic in a large code base. Organizing the source code into modules and defining a module hierarchy are important steps in tackling this. Tools like Good Fences can then enforce that hierarchy and detect circular dependencies.

---

## Changelog

- 2020-08-28 Plain English and structure improvements
