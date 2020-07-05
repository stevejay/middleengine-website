---
layout: post
title: Practical advice for code reviews
summary: Improve your team's code review process with some practical advice on the subject.
date: 2020-04-21
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
---

## Introduction

The code review is a necessary step in the software development process. Code written by a developer or developer pair is submitted as a pull request for review by a peer in order to catch errors and omissions, for change suggestions, and to disseminate system and programming knowledge. In this way the team collectively enhance themselves and the code base that they work on. In this post I discuss best practise regarding the code review process.

## The keys to success

In my opinion a successful code review:

- Has been assisted by the submitter.
- Is timely.
- Is performed by one developer working preferably for a maximum of one hour on the task.
- Consists of feedback that is constructive and considerate.

This advice is driven by how code reviews were organized in the most recent role I worked, an approach that I found sensible and highly effective. The remainder of this post expands on each of these points.

## Submitter assistance

It is not only the reviewer who can leave comments on a pull request. The author of the pull request can leave comments too, for example explaining their approach and flagging changes that require particular attention by the reviewer. When I am developing a feature, I am very aware of which changes are controversial and I highlight them when creating my pull requests.

## Timeliness of the review

When a pull request is ready to be reviewed, it is important that the review is started promptly. Often development proceeds incrementally whereby the work on a feature is in the form of a series of small pull requests rather than one large pull request. (If I am working on a branch and the changes balloon in size and number, then I will treat the branch as a spike and convert those changes into a series of sequential small pull requests.) Small pull requests are less demanding for the reviewer to read and understand, and are more likely to be properly considered rather than skimmed. Without a prompt code review, the submitter is likely to be hindered from proceeding with the next increment.

The following is an effective process for ensuring timeliness:

1. When a pull request is ready for review, the developer sends a `@here` message in a designated Slack channel to alert their peers that a review is required.
2. The first developer to react adds the 'looking' emoji reaction to the post and then starts the review.
3. That developer submits their review and follows up on any issues with the author of the pull request.

![](/images/2020-04-21-practical-advice-for-code-reviews/pr-notification-2x.png "A pull request notification in Slack with the 'looking' reaction")

Ideally there would be a developer available to begin the review shortly after it is submitted, say within 15 to 30 minutes. However, it may be that the developers are all focussed on their own work and so breaking off to review the pull request would involve a disruptive context switch. A developer in this situation can start a thread on the Slack notification to leave a comment about when they expect to be able to start the review.

As discussed above, frequent pull requests that have fewer changes are preferable to fewer pull requests that have many changes. Code reviews need to be performed promptly to assist this style of development. Pull requests with fewer changes also lead to quicker code reviews, and so to shorter context switches for reviewers. Small pull requests and the timeliness of code reviews are [promoted in the Google Engineering Practises documentation](https://google.github.io/eng-practices/review/reviewer/speed.html) as best practises.

## Review effort

In one role I worked, each pull request was being reviewed by four or five developers. This made the review process far too time consuming. Also, since there was no limit on how many reviews were necessary, it was common for a pull request to be given the green light only for yet another developer to submit a review and so reset the process back to square one. Generally each pull request should be reviewed by a single developer and the pull request should be small enough that the reviewer needs to spend less than an hour on their task. Exceptions are if the change is complex or risky and so requires multiple pairs of eyes on it, or if the changes could not be broken down and so require additional review time.

## Constructiveness and consideration

Submitting a code review can be stressful, particularly if the submitter is inexperienced in regards to the proposed changes. It is incumbent on the reviewer to adopt a positive attitude and assume the best about the code and the submitter.

As a reviewer, your aim is not to get the pull request written as you would have written it. Often there are multiple ways to solve a problem that are largely equally valid. When requesting or suggesting an alternative, it should be because there are benefits and these should be spelled out in the comment. Furthermore, it should not be necessary to comment on aspects like code formatting since the team should already have an established set of coding standards that are automatically enforced.

It is convenient to use a convention for comments that are only suggestions. A simple approach is to prefix such comments with the surfer emoji:

![](/images/2020-04-21-practical-advice-for-code-reviews/surfer-2x.png "Use of the surfer emoji for suggestions")

## Conclusion

Ultimately the team as a whole benefits from these code review best practises. Timely reviews keep the development process moving forward, while limiting the number of changes in a pull request reduces the effort required to review it. A policy of constructive feedback and mutual respect reduces stress for the submitter. This all assists in making code reviews a positive part of the team's work, rather than a bottleneck in the process or a cause of resentment or confrontation.

---

## Changelog

- 2020-04-21 Initial version
- 2020-06-23 Minor wording change
- 2020-06-28 Minor wording change
- 2020-07-05 Added Google link
