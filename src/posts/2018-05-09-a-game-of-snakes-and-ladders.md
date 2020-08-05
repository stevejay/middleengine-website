---
layout: post
title: A game of Snakes and Ladders
summary: Likening software development to a game of Snakes and Ladders.
date: 2018-05-09
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
issueNumber: 64
---

An analogy I have for when a software developer starts working on a ticket is that the developer starts playing a game of [Snakes and Ladders](https://en.wikipedia.org/wiki/Snakes_and_Ladders). The developer might get lucky and hit ladders all the way; no blockers or complications are found and the ticket is easily completed within the anticipated time frame. The worst result is that it is snakes all the way; major issues are found and the work balloons in scope and complexity.

In my experience it is impossible for a developer to know beforehand what kind of game they will get to play. Software development is inherently a step into the unknown. Analysis work, including time-boxed [spikes](<https://en.wikipedia.org/wiki/Spike_(software_development)>), can be performed prior to a ticket being worked on, but it is only when development is under way that the developer truly gets to see the game before them.

In the last few years there has been a body of thought forming around the _#NoEstimates_ heading. Part of the process it describes is limiting the size of the work items:

> [I]t is possible to do small chunks of work incrementally, leading as rapidly as possible to a desired shippable product.
> — [#NoEstimates](https://ronjeffries.com/xprog/articles/the-noestimates-movement/)

One project I worked on had the team use [planning poker](https://en.wikipedia.org/wiki/Planning_poker) to estimate the size of work items. The problem was that often the work items had not been broken down sufficiently, resulting in estimates that were often the larger story point values like 13 and 21. I believe that large values like these are unusable as they encompass far too many unknowns. These were really still backlog items, rather than work items.

It is important that every work item is as limited in scope as possible and so represents a stripped-down step in the direction of the final feature or epic. This means that the anticipated duration for the work is limited to around three days, with that time including any other work the developer needs to do. (The exact limit value is for your team to determine; it will likely be in the range of two to five days.) Given this, I see the assigning of story points to work items as not useful; the work items amortise over time to the same standard duration, and future project planning can proceed on that basis. The single key question when sizing tickets becomes 'is this work item sufficiently limited in scope?' If the scope is too great, break the work items down into multiple tickets and repeat. If the work item does not represent a sufficiently basic step towards the final goal, simplify it. In this way, risk in a software project is managed by limiting the scope of the work items that flow to the developers, and the games they play contain less snakes.
