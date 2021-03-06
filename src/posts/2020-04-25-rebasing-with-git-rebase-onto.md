---
layout: post
title: Git rebasing with the --onto option
summary: How to use the --onto option when rebasing to avoid confusing merge conflicts.
date: 2020-04-25
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 49
---

## Introduction

Like many developers, I use [Git](https://git-scm.com/) for source control. Normally I use a short-lived branch for each feature I code. I create it from the _master_ branch and rebase it as required. But sometimes I have to branch off of a branch and in this situation rebasing can be problematic. One solution is to use the `--onto` option when rebasing, and this post details how the process works.

## A feature on a feature

Let us say that I start developing a new feature. I create _branch-a_ off of _master_ and I push a couple of commits to it (B and C):

![](/images/2020-04-25-rebasing-with-git-rebase-onto/initial-state-2x.png "Creation of branch-a and commits made")

My aim with this feature is to submit the work as a few smaller pull requests rather than as one large pull request. This makes each pull request easier to review. I complete the work on _branch-a_ and submit a pull request for it. But while that pull request is being reviewed I want to continue working on the next part of the feature. To do this I create _branch-b_, a branch off of _branch-a_. I now continue to work on this new branch, adding commits D and E:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/sub-branch-2x.png "Creation of branch-b and commits made")

## A problem arises

A short while passes and the review of my pull request is complete. The result is that I need to make a change, so I add commit F to _branch-a_:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/pr-change-2x.png "The pull request feedback commit")

But before I can merge my pull request, another developer merges their own pull request to _master_. This is commit G:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/master-updated-2x.png "An update to master")

I now need to rebase _branch-a_ before I can merge it. Rebasing _branch-a_ creates new commits for B, C and F, here labelled B1, C1 and F1:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/branch-a-rebased-2x.png "branch-a rebased")

This is because rebasing in Git rewrites Git history. Note that commits B and C still exist, but they are now considered part of _branch-b_.

I merge my pull request using the 'squash and merge' option. This collapses the _branch-a_ commits into a single new commit (H). This commit gets appended to the tip of master:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/branch-a-merged-2x.png "branch-a merged")

Now I want to continue working on _branch-b_, but I want to be working on top of the latest changes from _master_. This should include the pull request commit. If _branch-b_ had been branched from _master_, then this would be simple. I could do a regular rebase of _branch-b_ against _master_. But if I do that here, I will re-apply the changes from commits B and C that are already included in commit H:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/naive-rebase-2x.png "A conventional rebase of branch-b")

The rebase affects commits B, C, D and E, but I am only interested in commits D and E. Depending on the exact changes involved, this can result in a very confusing rebase:

- There can be merge conflicts between the changes in the original commits on _branch-a_ (commits B and C) and the final combined commit on _master_.
- There can be no-op commits when the changes in an original commit match those already on _master_, indicated by the message "No changes - did you forget to use 'git add'?".

What I need is more control over the result of the rebase.

## A more precise rebase

One answer is to use the `--onto` option with Git rebase [as documented here](https://git-scm.com/docs/git-rebase). This allows you to specify a range of commits to rebase; no other commits get included in the rebase. You need to specify both the branch to rebase onto and the range of commits to rebase. There are many ways to specify that range. I find the simplest is the `HEAD~x` syntax, where `x` is the number of commits to count back from the head commit. (The head commit is the current commit.`HEAD` is Git's shorthand reference for that commit.) With this syntax you specify the first commit you do **not** want to include in the rebase, working back in time. To only include the most recent commit you would specify `HEAD~1`. To include the two most recent two you would specify `HEAD~2`. In the example in this post I enter the following commands in turn:

```bash
# Check out the branch to be rebased (branch-b):
git checkout branch-b

# Rebase the desired range of commits:
git rebase --onto master HEAD~2

# Check things look right:
git log --oneline --graph --decorate

# Force push the rebased branch-b to the origin repo:
git push --force-with-lease origin HEAD
```

This results in the following state, and I am now able to continue working on _branch-b_:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/rebase-onto-2x.png "A 'git rebase --onto' of branch-b")

Note that there are other ways to achieve the same result. I could perform an interactive rebase of _branch-b_ in which I remove the lines for outdated commits B and C.

## Conclusion

Having learned the `git rebase --onto` technique, I now feel more in control of Git. I have the power to move ranges of commits around, without the merge conflicts I would have had in the past.

---

## Changelog

- 2020-04-25 Initial version
- 2020-06-27 Minor formatting changes
- 2020-06-28 Added section headings and formatting changes
- 2020-08-27 Plain English improvements
