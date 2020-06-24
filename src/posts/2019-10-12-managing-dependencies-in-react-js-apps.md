---
layout: post
title: Managing dependencies in React applications
summary: Ways to manage inter-module dependencies in a React application.
date: 2019-10-12
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: xWiXi6wRLGo
---

Managing dependencies in a simple React application tends to be straightforward. You are probably the only developer working it, it does not contain many source files, and those files are probably organized [by file type](https://reactjs.org/docs/faq-structure.html#grouping-by-file-type). Dependencies between files are usually easy to keep track of and do not cause issues. However, with a more complex React application, it is probably being written and maintained by multiple developers, there are many source files, and those files are probably [grouped into modules](https://engineering.kapost.com/2016/01/organizing-large-react-applications/). Without some way to police the dependencies between modules, those dependencies can quickly become a mess, since in JavaScript we are free to import any file from any other file, regardless of whether that creates circular dependencies or whether a file is intended to be used by other modules or not.

The benefits of organizing the application's code base into modules include reducing the cognitive load when working on the code base, and facilitating multiple developers working on the code base at the same time. Generally it is manageable to keep track of dependency issues within a module, but harder to keep track of dependency issues between modules. The most obvious type of dependency issue is the circular dependency, when file _A_ requires file _B_, and file _B_ requires file _A_. A circular dependency can also be less obvious, when there is a chain of required files that creates the cycle. Luckily, you should be able to add code to your build system to automatically detect circular dependencies at build time. For example, if you are using Webpack then there is [this plug-in available](https://www.npmjs.com/package/circular-dependency-plugin).

However, circular dependencies are not the only kind of dependency issue. Interfaces are an important concept in any code base. For example, for a given module, it is often the case that certain files are expected to form the public interface for the module, i.e., the files that dependent modules are allowed to import, while other files are intended to be implementation details and not used outside of the module. If a developer is working on a particular module, it is important that he or she has the freedom to change the internals of the module. If modules are free to import whatever they like from other modules, this can quickly create a mess of hard-to-track dependencies. For example, bugs could arise in unrelated modules when a developer makes a change to the internals of a module. What is required is a way to enforce the public interface of a module, restricting both what can be imported from the module and which modules are allowed to import it.

Luckily there are tools available for this. The one I have used is called [Good Fences](https://www.npmjs.com/package/good-fences). The developers of that tool have explained the problem it solves:

> JavaScript's module system is a specialized form of anarchy because any file can import any other file, possibly allowing access to code that was really meant to be an internal implementation detail of some larger system. Other languages have concepts like DLL boundaries and the internal keyword to mitigate this. Good-fences provides a way to enforce similar boundaries in the TypeScript world.
> — [Good Fences on NPM.js](https://www.npmjs.com/package/good-fences)

Before adding Good Fences to a React application, I first construct a hierarchy of its modules. This might look something like the following:

![](/images/2019-10-12-managing-dependencies-in-react-js-apps/dependency-hierarchy-2x.png "An example module hierarchy")

In this approach, a given module can only have dependencies on those modules below it in the hierarchy; it cannot have dependencies on any modules above it or at the same level. Note that the Shared module is for lower-level code that is useful across multiple modules in the application.

The top module in the above hierarchy is App, which might actually just be a single component. It is responsible for bringing the whole application to life, so it inevitably has dependencies on all the other modules.

I have added Header and Footer as below App but above Search, Auth, and Orders. This may or may not be true in your application. I find that site headers and footers tend to contain functionality from a number of modules. For example, the header might contain login/logout functionality from the Auth module and a quick search form from the Search module.

Ideally modules should be as self-contained as possible, with only a dependency on the Shared module. In the above hierarchy this is true of the Search, Auth, and Orders modules. In this way you have less modules to consider when working on one of them, and you know which modules your changes might affect.

At this point, the hierarchy is just informational; Good Fences can be introduced into the application to enforce it.

First make sure to have a [barrel file](https://basarat.gitbook.io/typescript/) at the root of each module that exports everything from the module that other modules are allowed to import. Then add a _fence.json_ file to each module alongside the barrel file. The _fence.json_ file declares the name of this module, declares the barrel file as the export for the module, and also declares the modules (if any) that this module is allowed to import. This is all explained on the [Good Fences npm.js page](https://www.npmjs.com/package/good-fences). Once you have done this, you can run the Good Fences tool to check your dependencies match the hierarchy.

Dependency management within a React application can become problematic in a large code base, particularly when multiple developers are working on it, but I have found that organizing the source code into modules, defining a module hierarchy, and using tools to enforce that hierarchy and to detect circular dependencies between files are all useful steps to help tame dependencies in React applications.
