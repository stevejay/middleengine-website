---
layout: post
title: Rebasing with Git rebase onto
summary: How using the onto option when rebasing can simplify branch management.
date: 2020-04-25
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
heroImage:
  source: Unsplash
  id: 842ofHC6MaI
draft: true
---

Like many developers, I use [Git](https://git-scm.com/) for source control. Normally I use a short-lived branch for each feature I code, branching it off of the _master_ branch and rebasing it as required, but sometimes I have to branch off of a branch, and in this situation rebasing can be problematic. One solution is to use the `--onto` option when rebasing, and this post details how the process works.

Let us say that I start developing a new feature. I create _branch-a_ off of _master_ and I push a couple of commits to it (B and C):

![](/images/2020-04-25-rebasing-with-git-rebase-onto/initial-state-2x.png "Creation of branch-a and commits made")

My aim with this feature is to submit the work as a series of smaller pull requests, rather than as one big pull request. This makes each pull request easier to review. I complete the work in _branch-a_ and submit a pull request for it. But while that pull request is being reviewed I want to continue work on the next part of the feature. To do this I create _branch-b_, a branch off of _branch-a_. I now continue work on this sub-branch, adding commits D and E:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/sub-branch-2x.png "Creation of branch-b and commits made")

The pull request for _branch-a_ has now been reviewed and a change is required. I add commit F to _branch-a_:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/pr-change-2x.png "Pull request feedback commit")

But before I can merge the updated pull request, another developer merges their own pull request to _master_, as commit G:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/master-updated-2x.png "An update to master")

Because of this, I need to now rebase _branch-a_ before I can merge it. As a rebase in this situation will rewrite Git history, rebasing _branch-a_ creates new commits for B, C and F, here labelled B1, C1 and F1:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/branch-a-rebased-2x.png "branch-a rebased")

Note that commits B, C and F still exist, but now as part of _branch-b_.

Now I am able to merge my pull request. I do this using the 'squash and merge' option to collapse the _branch-a_ commits into a single new commit that is appended to the tip of _master_:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/branch-a-merged-2x.png "branch-a merged")

Now I want to continue working on _branch-b_, but I want to be working from the latest changes on _master_, including the changes from the pull request. If _branch-b_ had been originally branched from _master_, then this would be simple: I would just rebase it against _master_. But, in this situation, if I just rebase _branch-b_ against _master_, I end up re-applying the older changes of C and D:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/naive-rebase-2x.png "A conventional rebase of branch-b")

This can result in a very confusing rebase, with merge conflicts from older commits on _branch-a_, and no-op commits when the changes in the commit being applied are already on _master_ via the pull request. (In the latter case, you get the message "No changes - did you forget to use 'git add'?" when the commit is applied.) The rebase process uses the commit that is the common ancestor of the source branch and the destination branch to determine the range of commits to rebase. Here that ancestor commit is commit A. So all of commits B, C, D and E get rebased, rather than just commits D and E. The result is that commits B and C getting reapplied, even though they are already part of commit H.

The answer is to use the `--onto` option with `git rebase`, as [documented here](https://git-scm.com/docs/git-rebase). This allows you to specify a particular range of commits to rebase; no other commits get included. You need to specify the branch to rebase onto and the range of commits. There are multiple ways to specify the range, but I find the simplest to be the `HEAD~x` syntax, where `x` is the number of commits to count back from the head commit (the head commit being the most recent commit on whatever the current branch is, and `HEAD` being the Git label for that commit). You specify the first commit you do not want included in the rebase, so to only include the most recent commit you would specify `HEAD~1` and to include the most recent two commits you would specify `HEAD~2`. In the example in this post, I would perform the following series of commands:

```
# Check out the branch to be rebased:
git checkout branch-b

# Rebase the particular range of commits:
git rebase --onto master HEAD~2

# Push the rebase result to the origin repo:
git push --force-with-lease origin HEAD
```

This results in the following state:

![](/images/2020-04-25-rebasing-with-git-rebase-onto/rebase-onto-2x.png "A 'git rebase --onto' of branch-b")

Having learnt this technique, I now feel very much more in control of Git. I now have the power to move ranges of commits around at will, without having the very confusing merge conflicts that I would have had in the past. This has helped increase my confidence level with what is a basic tool of our trade. It is also worth pointing out that there are other ways of achieving this result, such as using an interactive rebase whereby you skip the original outdated commits and only apply those from the branch of interest.
