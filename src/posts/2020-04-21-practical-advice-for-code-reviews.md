---
layout: post
title: Practical advice for code reviews
summary: Improve your team's code review process with some practical advice on the subject.
date: 2020-04-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 51
---

## Introduction

The code review is a necessary step in the software development process. Code written by a developer or developer pair gets submitted as a pull request for review by a peer. The aims are to catch errors and omissions, get change suggestions, and to disseminate knowledge. In this way the team enhance themselves and the code base that they work on. In this post I discuss best practises for the code review process.

## The keys to success

In my opinion a successful code review:

- Is assisted by the submitter.
- Is timely.
- Is performed by one developer working for a maximum of one hour on the task.
- Consists of feedback that is constructive and considerate.

This advice is driven by how code reviews were organized in a recent role I worked. I found this approach sensible and effective. The remainder of this post expands on each of the above points.

## Submitter assistance

It is not only the reviewer who can leave comments on a pull request. The author of the pull request should leave comments too. They could explain their approach and flag any changes that need particular attention. When I am developing a feature, I am very aware of which changes are controversial. I then highlight them when I create my pull request.

## Timeliness of the review

Often development proceeds incrementally. The work on a feature is in the form of a series of small pull requests rather than one large pull request. (If I am working on a branch and the changes balloon in size and number, I treat the branch as a spike. I convert those changes into a series of sequential small pull requests.) This is better for the reviewer. Small pull requests are less demanding to read and understand. The reviewer is more likely to properly consider the changes rather than skim them. But without timely code reviews, the submitter might have to delay proceeding with the next increment.

The following is an effective process for ensuring timeliness:

1. When a pull request is ready for review, the developer posts an `@here` message in a designated Slack channel. This alert their peers that a review is required.
2. The first developer to react adds the 'looking' emoji reaction to the post and then starts the review.
3. That developer submits their review and follows up on any issues with the author of the pull request.

![](/images/2020-04-21-practical-advice-for-code-reviews/pr-notification-2x.png "A pull request notification in Slack with the 'looking' reaction")

Ideally there would be a developer available to begin the review within 15 to 30 minutes of submission. But it may be that the developers are all focused on their own work. Breaking off to review the pull request could involve a disruptive context switch. A developer in this situation can add a comment to the Slack message. This would state when they expect to be able to start the review.

As discussed above, frequent pull requests that have fewer changes are preferred. Code reviews need to be performed promptly to support this style of development. Pull requests with fewer changes also lead to quicker code reviews, and so to shorter context switches for reviewers. Small pull requests and the timeliness of code reviews are both [promoted in the Google Engineering Practises documentation](https://google.github.io/eng-practices/review/reviewer/speed.html) as best practises.

## Review effort

In one role I worked, each pull request would be reviewed by four or even five developers. This made the review process time consuming. Since there was no review limit, it was common for a pull request to be ready to ship but then yet another developer would leave comments. This would reset the process back to square one.

Generally each pull request should be reviewed by a single developer. The pull request should be small enough that the reviewer can review the code in less than an hour. One exception is if the changes are complex or risky. In that case multiple developers might need to submit reviews. Another exception is if the changes could not be broken down and so the pull request is very large.

## Constructiveness and consideration

Submitting a code review can be stressful, particularly if the submitter is inexperienced. It is incumbent on the reviewer to adopt a positive attitude and assume the best about the code and the submitter.

As a reviewer, your aim is not to get the pull request written as you would have written it. Often there are multiple ways to solve a problem that are arguably equally valid. When requesting or suggesting an alternative, it should be because there are benefits. These should be spelled out in the comment. Furthermore, it should not be necessary to comment on aspects like code formatting. The team should already have an established set of coding standards that are enforced automatically.

It is convenient to use a convention for comments that are only suggestions. A simple approach is to prefix such comments with the surfer emoji:

![](/images/2020-04-21-practical-advice-for-code-reviews/surfer-2x.png "Use of the surfer emoji for suggestions")

Some developers prefix the comment with the word 'nit', or even 'μnit' for the very smallest issues.

## Conclusion

The team as a whole benefits from these code review best practises. Timely reviews keep the development process moving forward. Limiting the number of changes in a pull request reduces the effort required to review it. A policy of constructive feedback and mutual respect reduces stress for the submitter. This all helps make code reviews a positive part of the team's work, rather than a bottleneck or a cause of resentment or confrontation.

---

## Changelog

- 2020-04-21 Initial version
- 2020-06-23 Minor wording change
- 2020-06-28 Minor wording change
- 2020-07-05 Added Google link
- 2020-08-27 Plain English improvements
