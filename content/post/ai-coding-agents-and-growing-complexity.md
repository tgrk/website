---
title: "AI coding assistants and the value of removing code"
cover: "/img/ai-code-complexity/cover-v3.png"
tags: ["AI", "LLM", "agents", "software"]
date: 2026-10-25T00:00:00+02:00
draft: false
featured: true
description: "AI assistants make adding code easier. Deciding what to simplify, remove, or avoid building still takes engineering judgment."
---

Over time, one of my personal measures of progress has been improving a system while removing code. A change that fixed a problem, deleted an unnecessary layer, and left the next developer with less to understand felt like good engineering.

Readability was part of that measure. Compressing a clear function into a clever expression did not count as an improvement. I wanted fewer things to maintain, fewer patterns and exceptions to remember, and code whose behavior was easier to follow.

AI coding assistants have made adding code much easier, especially agents that can inspect a repository, edit files, and run checks. In my experience, they are less dependable at working in the other direction: finding code that no longer needs to exist, removing paths that are no longer relevant, and refactoring a solution until it becomes simpler and cleaner. That gap matters more as the codebase grows.

<!--more-->

[Éric Sellin](https://www.linkedin.com/feed/update/urn:li:activity:7448445846678822912/) expressed something I have valued for a long time:

> The best software engineers I've worked with share a common trait: they write less code, not more. They delete aggressively, and resist unnecessary abstractions. AI tools are celebrated mainly for how fast they can churn out code, but are we optimising for output, rather than outcome? The hard part was never typing fast enough. It was knowing what not to type, what not to build, what to simplify, and when to say "this doesn't even need to exist yet".

## Adding code has an obvious finish line

Give an agent a missing feature or a failing example, and there is a concrete target. Add the behavior, make the example work, run the checks. The resulting diff makes the work visible.

Simplification asks for a different kind of judgment. The agent has to recognize that an existing piece of code has become unnecessary, understand why it was introduced, and establish what would happen if it disappeared. An unused path might be obsolete, or it might serve a caller outside the current scope or one with no test coverage. Several complicated branches might encode essential business rules, or they might be an elaborate substitute for a standard operation.

I find agents much more willing to extend the existing approach than to question whether it should survive. A fallback gets another condition. A helper gets another option. A refactoring introduces a new abstraction, while leaving most of the old machinery underneath it.

Each change can be understandable on its own. Over time, the system has more code, more places to look, and more decisions that the next change must respect. The task is finished, but the maintenance burden has grown.

## A pet project that needed fewer matching rules

I ran into this in a pet project where I needed to find fights by matching fighter names across different data sources and APIs.

The names were inconsistent. One source provided only part of a name. Another reversed first and last names. There were typos and differences in diacritics. Exact comparisons missed valid matches, while partial comparisons could accept too much.

Working through this with a coding agent produced more matching code: variations, conditions, and additional ways to compare the names. A failed example became a reason to add another rule. The implementation grew, and finding the right fight was still unreliable.

I eventually stepped back and chose Jaro similarity. Elixir already provides it through [`String.jaro_distance/2`](https://elixir.hexdocs.pm/String.html#jaro_distance/2), which gives a similarity score between two strings and is intended for short strings such as names. It was not perfect, but good enough.

That change let me remove roughly 90% of the matching code and get a better result. The comparison became a small, readable function that I could follow without reconstructing a history of special cases.

There was still work around name normalization and deciding which matches to accept. Jaro similarity does not automatically resolve name order, diacritics, or identity. Similar-looking names can belong to different people. But most of the custom comparison logic no longer needed to exist.

The agent had helped me add to that logic. It had not, on its own, led me to the replacement that made most of it unnecessary. Recognizing that I should change the approach was the useful intervention.

## The GeoIP service we did not need

The same judgment matters beyond the code in a single repository. At one company, we used a GeoIP lookup provider with a free local database as a fallback. When the provider became unreliable, a new service was built in a different technology, with its own deployment. We were asked to integrate it; it exposed the same API contract, so the work looked straightforward.

After some digging, we found that the new service was a wrapper around the same free database we already used locally. It also included a Kubernetes job to keep that database updated.

The update job was useful. For the lookup itself, we already had the necessary capability. The simpler change would have been to remove the original provider integration, use the existing local lookup, and keep the database update job. Introducing another service meant another deployment and another dependency to operate for a lookup we could already perform.

We had to push back, and it was difficult. The service had been written. The infrastructure code was ready. People had invested time and tokens in the replacement, and we were questioning whether most of that work needed to exist. By then, finishing the integration was easier to present as progress than asking everyone to reconsider it.

A coding agent given that integration task could satisfy the API contract, update the client, and add tests. All of those changes could be correct while leaving the organization with an unnecessary service.

Recognizing the redundancy required knowledge of the existing fallback, the new service's implementation, and the reason for replacing the provider. In a complex organization, that knowledge can be spread across teams, repositories, and conversations. There is no single repository or knowledge base that explains the whole decision.

An agent can help investigate when it has access to those sources. I would still want an experienced engineer to question the premise, find the missing context, and push back on a completed implementation. Access to more code alone does not settle that discussion.

We could build and integrate the replacement quickly. The better decision was to keep the database update work and remove the need for most of the replacement. That decision required looking beyond the assigned task.

## Code growth makes the next decision harder

Unused code has a cost even when it never runs. Someone reading it has to establish whether it matters. An old fallback can look like an important requirement. Two implementations of the same operation can leave a reviewer unsure which one is authoritative.

The same problem affects an agent investigating the codebase. It needs to distinguish current behavior from abandoned approaches, compatibility requirements from obsolete workarounds, and useful abstractions from layers that only forward calls. Leaving all of that in place gives the next task more material to interpret.

More comments can explain the history. More tests can protect behavior. Neither automatically identifies the code we could remove.

This is where I want more help from AI assistants. After implementing a replacement, I want them to follow through: check callers, remove the superseded path, clean up the options that only existed for it, and leave one understandable way to do the job. When several fixes keep extending the same function, I want them to reconsider its design.

An agent can do this work when directed. My concern is how reliably it recognizes that the work is needed without being explicitly prompted each time.

## My measure still includes what disappears

I do not want deleted lines to become another output target. Deleting validation, hiding complexity in a dense expression, or moving the same code into a new module would miss the point. Some changes need more code. Some explicit repetition is easier to maintain than an abstraction.

The measure I care about combines the result with the code left behind. The system should behave better, preserve the constraints that matter, and become easier to understand. Removing code is valuable when it helps achieve that.

For AI-assisted work, that means reviewing more than the new behavior. I also want to know which old path is now redundant, which abstraction has lost its purpose, and whether the change leaves two ways to do something that only needs one.

In the matching example, the roughly 90% reduction was satisfying because the result improved and the remaining solution was easier to read.

The GeoIP example extends that measure to the system around the code. A small database update job addressed a useful need. A new service and its deployment added work that we could avoid by using what was already there. Seeing that required understanding more than the integration ticket.

That has been a useful personal measure throughout my career. Faster code generation makes me want to hold on to it more deliberately. I want an AI assistant to help me leave the system smaller and clearer after a change. I also want to keep questioning whether the proposed change needs to exist, even when the implementation is already ready. Most benchmarks celebrated today measure how quickly an agent can build something new from scratch — that is only the beginning of maintaining real software.
