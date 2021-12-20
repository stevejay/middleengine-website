---
layout: post
title: "Choosing a Node.js package manager for your next project"
summary: A look at the state of Node.js package management and how to choose between the available package managers.
date: 2021-12-20
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 109
draft: false
---

## Introduction

In this post, I take a look at the current state of Node.js package management and how to choose between the available package managers.

## An overview

There are four popular package managers available now for the Node.js ecosystem:

- [npm](https://docs.npmjs.com/cli/v8/commands/npm)
- [Yarn 1, a.k.a, Yarn Classic)](https://classic.yarnpkg.com/lang/en/)
- [Yarn 2+, a.k.a, Yarn Berry](https://yarnpkg.com/)
- [pnpm](https://pnpm.io/)

Furthermore, Yarn Berry can be used in either [PnP (Plug 'n' Play) mode](https://yarnpkg.com/features/pnp) or in non-PnP mode.

## npm

The npm package manager is the original package manager. Because of this it is likely to be supported by all tools and services that rely on a package manager as part of their operation. This could be a code analyser service or [a tool](https://github.com/sindresorhus/np) for publishing a new version of a package to [npmjs.com](https://www.npmjs.com/). Since version 7, npm has also included workspaces support.

## Yarn

Yarn Classic was created to fix some of the shortcomings with npm at the time. It introduced workspaces and included security and performance improvements. Today it is well supported by build tools and services. However, development of Yarn Classic has been [frozen](https://github.com/yarnpkg/yarn). The developers decided to make fundamental changes to Yarn and the result was Yarn Berry.

If you are experienced with Node.js development, you will know that the `node_modules` directory can be problematic. It is often [enormous](https://devrant.com/rants/760537/heaviest-objects-in-the-universe) and highly nested. Every project has its own `node_modules` directory containing its own copy of each package that it depends upon. There is also nothing to stop your project or any of its dependencies accessing other packages that they have not explicitly declared as a dependency. Yarn Berry PnP and pnpm represent two approaches to solving the problems of the `node_modules` directory.

With Yarn Berry PnP there is no `node_modules` directory. Instead it saves each dependency as a single zipped file within a `.yarn/cache` directory. It then hooks into the Node.js filesystem APIs so that requests for files within `node_modules` get resolved from the contents of the zipped files. Since the size of those zipped files is much less than the `node_modules` equivalents, and consist of far fewer files, they can be [committed to git for so-called zero-installs](https://yarnpkg.com/features/zero-installs) support. If you do this, you also get the very nice benefit of not potentially needing to run `yarn install` each time you change branch with git.

The PnP mode can cause problems for some tools and services. For example, [here is a list of tools](https://yarnpkg.com/features/pnp#incompatible) that do not support PnP mode. In these cases, Yarn Berry can be run in non-PnP mode. In this mode there is still a regular `node_modules` directory, and you miss out on the strict checking of dependencies.

## pnpm

pnpm takes a different approach to solving the problems of the `node_modules` directory. Packages are saved to a [single location on your computer](https://pnpm.io/motivation). Your project will still have a `node_modules` directory, but it will consist only of hardlinks to those shared package files. This saves massively on the disk space used by Node.js packages on developer machines. pnpm also has workspaces support, and it enforces that your project and its dependencies can only access packages that are actually declared as dependencies.

## Choosing a package manager

So, which package manager should you use?

Firstly, I believe that Yarn Classic should be excluded because development of it is now frozen.

The most compelling options are the two package managers that provide a better solution for the problems of the `node_modules` directory: Yarn Berry PnP and pnpm. However, it might not be desirable or possible for you to use one of these two. The tools and services you are using might not support them. Indeed, [some package maintainers do not want to support Yarn Berry at all](https://github.com/sindresorhus/np/issues/612). Additionally, pnpm is less popular than the alternatives (going by the weekly download figures on npmjs.com) and is largely the work of a single developer ([Zoltan Kochan](https://twitter.com/zoltankochan)). This may or may not concern you.

If using Yarn Berry PnP or pnpm is not possible then the choice is between npm or Yarn Berry non-PnP. npm is going to be the most widely supported package manager, and that could be your most important consideration. Alternatively, you might be guided by performance figures. The pnpm website includes [performance benchmarks](https://pnpm.io/benchmarks) for pnpm, Yarn Berry (PnP and non-PnP), and npm. One reason for choosing Yarn Berry non-PnP over npm would be its faster install command execution time on a CI server. (The benchmark to look at for this scenario is the one titled "with lockfile".)

## Conclusion

Nowadays the package managers for the Node.js ecosystem have a reasonable degree of feature parity, particularly regarding workspace support. However, there are other considerations to take into account, such as a better solution for the `node_modules` directory, better checking of dependency declarations, and faster performance. Exactly which package manager you chose to use will depend on your own particular circumstances and concerns.
