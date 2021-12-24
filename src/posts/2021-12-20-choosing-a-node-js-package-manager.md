---
layout: post
title: "Choosing a Node.js package manager for your next project"
summary: A look at the current state of Node.js package managers and how you might choose between them.
date: 2021-12-20
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 109
draft: false
---

## Introduction

In this post, I take a look at the current state of Node.js package managers and how you can choose between them.

## Package management explained

Your Node.js project will likely use code from various npm packages. Rather than adding a package manually, we use a package manager to manage the process. The manager adds the dependency to your project's `package.json` file, along with a version value. It will normally install each package inside your project's `node_modules` directory. Each package might in turn have its own package dependencies that the manager will need to install as well.

At runtime, Node.js searches for each imported file, including looking in the `node_modules` directory. But Node.js does not restrict what packages you can import. For example, it does not check that the package is included as a dependency in the `package.json` file. Thus it is possible to import a file that is a indirect dependency (a dependency of a dependency). This is risky, because you do not control the version used and the package could be removed in an update.

Since a given package could be included in your project both directly and indirectly, the package manager needs to decide exactly which version or versions of the package to install. It might be able to avoid duplicating the dependency by installing a single version of the package. This would be hoisted to the top level of the `node_modules` directory. Or it might need to install two or more versions of the package. Each package manager has a different algorithm for creating a package dependency tree and deciding which versions to install. This algorithm might also differ between different versions of a package manager.

## The available package managers

There are four popular package managers available for the Node.js ecosystem:

- [npm](https://docs.npmjs.com/cli/v8/commands/npm)
- [Yarn 1, a.k.a. Yarn Classic](https://classic.yarnpkg.com/lang/en/)
- [Yarn 2+, a.k.a. Yarn Berry or Yarn Modern](https://yarnpkg.com/)
- [pnpm](https://pnpm.io/)

### npm

This is the original package manager. Because of this it is likely to be supported by any tools and services that rely on a package manager. This could be a code analyser service or [a tool](https://github.com/sindresorhus/np) for publishing a new version of a package to [npmjs.com](https://www.npmjs.com/). The developers have continued to add features in response to competition from other package managers. The package lock file was added in version 5, and workspaces support was added in version 7.

So why should you not just chose npm? There are several reasons for choosing an alternative:

- Performance, in particular faster install times.
- A better dependency resolution algorithm.
- An alternative way of storing package files, to reduce the size of the `node_modules` directory and the number of files that it contains.
- Enforcing that each package, including your own project, explicitly declares all of its dependencies.
- Ensuring everyone on your team is using the same version of your chosen package manager.
- Unique features, such as plugins or 'zero installs' support.

### Yarn Classic

Yarn Classic was release in 2016 to fix some of the shortcomings with npm at the time. It introduced workspaces and included security and performance improvements. It had a better algorithm for building the package dependency tree and introduced a file (`yarn.lock`) for saving that tree and the exact package versions used in your project.

Today it is well supported by build tools and services. However, development of Yarn Classic has been [frozen](https://github.com/yarnpkg/yarn). The developers decided to make fundamental changes and the result was Yarn Berry.

### Yarn Berry

Yarn Berry is a complete reworking of Yarn Classic. It can be used either in [PnP (Plug 'n' Play) mode](https://yarnpkg.com/features/pnp) or in non-PnP mode.

As described earlier, the `node_modules` directory can be problematic. It is often [enormous](https://devrant.com/rants/760537/heaviest-objects-in-the-universe) and highly nested. Every project has its own `node_modules` directory containing its own copy of each package that it depends upon. There is also nothing to stop your project or any of its dependencies accessing other packages that they have not explicitly declared as dependencies.

With Yarn Berry PnP, there is no `node_modules` directory. Instead it saves each dependency as a single zipped file within a `.yarn/cache` directory. It then hooks into the Node.js filesystem APIs so that requests for files within the `node_modules` directory get resolved from the contents of the zipped files. Since the size of those zipped files is much less than the `node_modules` equivalents, they can be [committed to git for 'zero installs'](https://yarnpkg.com/features/zero-installs) support. You also get the very nice benefit of not needing to run `yarn install` each time you change branch with git.

However, the PnP mode can make some tools and services unusable. For example, [here is a list of tools](https://yarnpkg.com/features/pnp#incompatible) that do not support PnP mode. There are also package maintainers that [do not want](https://github.com/sindresorhus/np/issues/612) to support Yarn Berry at all. I recently tried out various tools in both strict and [loose](https://yarnpkg.com/features/pnp#pnp-loose-mode) versions of PnP mode. Some of these broke, including docz and storybook-builder-vite. For my current requirements, PnP mode is not an option.

For such scenarios, Yarn Berry can be run in non-PnP mode. The `node_modules` directory is restored &mdash; with all its weight &mdash; and there is no strict checking of dependencies. This means that you lose out on these important features. Nevertheless, there are benefits regardless of whether you are in PnP mode or not. Yarn has always had a reputation of being performant. And the particular version of Yarn Berry used is included to your project, guaranteeing consistency throughout your team.

### pnpm

pnpm also tackles the problems of the `node_modules` directory but it takes a different approach to Yarn Berry. It always saves packages to a [single location on your computer](https://pnpm.io/motivation). Each project still has a `node_modules` directory, but it now only consists of hardlinks to the shared package files. This saves disk space on developer machines. It also allows pnpm to enforce that your project and its dependencies only access packages that have been declared as dependencies. It also includes workspaces support.

The downsides of pnpm are that it is probably the least supported of the package managers included here, and it is largely the work of a single developer ([Zoltan Kochan](https://twitter.com/zoltankochan)).

## Choosing a package manager

So, which package manager should you use?

Firstly, I believe that Yarn Classic should be excluded because development of it is now frozen.

The most compelling options are the two package managers that provide a better solution for the problems of the `node_modules` directory: Yarn Berry in PnP mode, and pnpm. However, it might not be possible for you to use one of these. The tools and services you are using might not support them.

If using Yarn Berry PnP or pnpm is not possible then the choice is between npm or Yarn Berry non-PnP. npm is going to be the most widely supported package manager, and that could be your most important consideration. Alternatively, you might be guided by performance. The pnpm website includes [performance benchmarks](https://pnpm.io/benchmarks) for pnpm, Yarn Berry (PnP and non-PnP), and npm. One reason for choosing Yarn Berry non-PnP over npm would be its faster install command execution time on a CI server. (The benchmark to look at for this scenario is the one titled "with lockfile".) Yarn Berry also has the advantage of ensuring the whole team is using the same version of the tool.

A final consideration is that it is perfectly possible to use a particular package manager but then change your mind later. It is also straightforward to start with Yarn Berry in PnP mode but then switch to non-PnP mode if you encounter problems.

## Conclusion

Nowadays the package managers for the Node.js ecosystem have a reasonable degree of feature parity, particularly regarding workspace support. However, there are other considerations to take into account, including a better solution for the `node_modules` directory, checking of dependency declarations, and performance. Exactly which package manager you chose to use will depend on your own particular circumstances and concerns.

---

## Changelog

- 2021-12-20 Initial version
- 2021-12-24 Beefed up the entire post
