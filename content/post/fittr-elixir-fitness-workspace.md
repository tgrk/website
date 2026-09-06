---
title: "Fittr: a personal fitness workspace built with Elixir and Codex"
cover: "/img/fittr/dashboard.png"
tags: ["Elixir", "BEAM", "software"]
date: 2026-09-05T15:00:00+02:00
draft: true
featured: true
description: "Inside Fittr: Phoenix LiveView, Ecto without SQL, Mnesia transactions, and AI-assisted training plans—with Codex helping build the product."
---

My training data lives in several places. Strava has the runs. Oura has sleep, readiness, and activity. Strength training needs a different kind of log, and a training plan introduces another question: how does what I actually did compare with what I intended to do?

Fittr brings those pieces into one personal workspace. It is an Elixir and Phoenix LiveView application for logging training, looking at recovery, managing programs, and reviewing the week. I am building it with Codex, which makes it an interesting project on two levels: using AI to develop software, and deciding where AI belongs inside the software itself.

The useful engineering is in the connections between those features. A completed workout should update the plan. Exercise names should remain consistent across imports and manual entries. A slow analysis should not freeze a page. An AI-generated plan should be something I can review and edit before it becomes my schedule.

<!--more-->

## From a training log to a daily workspace

The dashboard combines recent training, Oura summaries, muscle balance, a weekly report, and the next session in the active program. The point is to make the next useful action visible without opening several applications.

Training records can contain multiple exercises, with details such as sets, repetitions, duration, distance, and individual weighted sets. Strava activities can be linked to training records. Programs add planned sessions, a calendar, and completion tracking. A journal and blood pressure log sit alongside them.

That creates a practical loop: plan a session, record what happened, compare it with recent recovery data, then review the next part of the schedule. The overview scores and load estimates are application heuristics; I treat them as summaries to inspect, rather than measurements with more precision than the inputs support.

![Fittr program calendar showing running and strength sessions, with planned, completed, replacement, and skipped states.](/img/fittr/program-calendar.png)

*The program calendar connects planned sessions with the training that actually happened. Screenshots throughout this post come from the local development app in September 2026.*

## One Elixir application, with explicit boundaries

Fittr keeps the web interface and domain logic in the same application. LiveViews handle events and UI state; contexts such as `Fittr.Trainings`, `Fittr.Programs`, `Fittr.Oura`, and `Fittr.WeeklyReports` own the work behind those events.

The main pieces fit together like this:

| Layer | Fittr's implementation |
| --- | --- |
| Interactive interface | Phoenix LiveView, HEEx components, and JavaScript chart hooks |
| Domain data and validation | Elixir structs, Ecto embedded schemas, and changesets |
| Persistence | `Fittr.Storage`, backed by Mnesia |
| External data | Oura and Strava clients, plus weather context for upcoming outdoor sessions |
| Background work | OTP processes, supervised tasks, and LiveView async operations |
| AI features | Snapshot builders, analyzer modules, and reviewable program drafts |

The supervision tree includes Phoenix PubSub, a task supervisor, integration refresh scheduling, and a cache for next-session briefs. Integration token renewal and data synchronization have separate schedules. Storage initialization also has an explicit application start phase.

This is where Elixir feels natural for the project: the interactive UI, periodic work, and domain functions share one runtime, while still having separate responsibilities.

## Ecto without a relational database

An unusual detail is that Fittr uses Ecto without an SQL repository for its primary domain data. Training records use `embedded_schema`, including embedded exercises, and changesets handle casting and validation. Persistence goes through a separate storage boundary.

For example, this excerpt from the training changeset is ordinary Ecto:

```elixir
training
|> cast(attrs, [:date, :note, :strava, :plan_link, :perceived_effort, :pain, :preferred_for_suggestions])
|> cast_embed(:exercises, required: false)
|> validate_required([:date])
|> update_change(:note, &trim/1)
```

Underneath, `Fittr.Storage` creates Mnesia `:set` tables with `[:id, :value]` attributes and `disc_copies` on the local node. Reads and writes use transactions. The application can work with its domain records without turning every nested exercise into a relational table.

There is a cost to that simplicity. The current storage filtering path loads records and applies Elixir predicates. That suits a personal dataset, but it is a concrete limit to revisit as data volume or query complexity grows. Disk-backed storage also still needs an operational backup strategy.

### Completing a workout is a transaction

The interesting storage example is completing a planned session. That operation must save the training record and link it back to the session. Saving only one would leave the calendar and training history disagreeing.

The persistence function writes both records through the same call:

```elixir
Storage.put_multi([
  {Trainings, training.id, training},
  {PlannedSession, session.id,
   %{
     session
     | status: :completed,
       completed_training_id: training.id,
       completed_date: training.date
   }}
])
```

`put_multi/1` performs the row writes inside one Mnesia transaction. These two writes commit together or abort together. The surrounding context validates the session and program before reaching this persistence step.

That is a small implementation detail with a visible product consequence: completing a workout updates both sides of the relationship.

## LiveView still needs deliberate background work

Reports and recovery analysis can take longer than a normal UI event. LiveView keeps the interface close to the domain code, but that does not make slow work disappear.

Weekly report generation uses a named async task. The event handler cancels the previous task, sets the loading state, and starts generation. `handle_async/3` then handles the generated report, an application error, or an exited task. Each path clears the loading state, and the successful path reloads the report selection.

Oura trend intelligence follows a similar pattern. It maintains a baseline dataset, recomputes the selected view asynchronously, and resets the displayed stream when the result arrives. The UI can show that analysis is in progress while keeping the rest of the page available.

![Fittr Oura page showing sleep, readiness, and activity averages, sleep consistency, and trend intelligence with a 180-day baseline.](/img/fittr/oura-summary.png)

*The Oura view puts recent readings beside trend context. Confidence and data availability are part of the interface.*

I like that these mechanics remain visible in the code: start work, show progress, handle the result, handle failure. They are also useful review targets when Codex changes a LiveView. A happy-path screenshot alone cannot tell me whether an error leaves a loading indicator spinning forever.

## Give AI a bounded job

Inside Fittr, AI helps draft programs, summarize weeks, and explain the next session. The program planner has a particularly useful boundary: it produces a draft rather than saving a program itself.

`SnapshotBuilder` assembles recent training, preferred workouts, the active program, recovery summaries, and the latest weekly report. An analyzer receives that context. Its response is normalized into program and session fields that the editor can display. Draft generation explicitly forces the program status back to `draft`.

The brief-review flow also caps follow-up questions at three. The user can review the result, edit it, or use manual setup before saving. That makes the AI path part of an ordinary product workflow, with a clear point where a proposal becomes stored data.

Next-session guidance has another useful boundary. If the last workout has pain recorded, the code takes a deterministic recovery fallback and bypasses AI analysis for that brief. If analysis fails or returns an unexpected result shape, it also falls back to locally defined guidance. The accepted result has a small shape: a status, a headline, an explanation, and at most two adjustments.

These boundaries matter more to me than a clever prompt. They make the behavior inspectable and give the application something predictable to do when the model is unavailable or returns an unusable answer.

## Some problems only need a map

Exercise naming is a good counterexample to the AI features. `Push ups` and `Push-ups` should not split reporting into two exercises. But broad typo replacement can corrupt names that are already correct.

Fittr uses a curated mapping with a conservative fallback:

```elixir
def canonical_name(name) when is_binary(name) do
  trimmed = String.trim(name)
  Map.get(@exercise_name_mappings, trimmed, trimmed)
end
```

Known variants map to a chosen name. Unknown names keep their trimmed spelling. The existing tests cover mappings, stable canonical names, and protection against repeated typo rewrites. The exercise-level helper applies this normalization to strength exercises.

This is the sort of small, deterministic function I want underneath reports and suggestions. Better inputs help both, without introducing another model call.

## Building with Codex

Codex is part of how I build Fittr. The repository gives that collaboration something concrete to work with: `AGENTS.md` records domain boundaries and caution areas, design documents describe expected behavior, and tests capture the contracts that changes need to preserve.

The useful unit of work is a specific behavior. For exercise-name cleanup, that means preserving already-canonical names and checking the write paths. For program completion, it means keeping training history and planned sessions consistent. For a LiveView change, it includes loading and failure states as well as the rendered page.

The project also includes Tidewave in development, and its repository guidance prefers Tidewave for exploratory evaluation. Alongside that, `mix quality` runs formatting, ExDNA, Credo, and Dialyzer. ExUnit and LiveView tests provide behavioral checks. These tools give a coding agent feedback beyond whether a patch looks plausible.

There is a useful lesson in preparing this overview: the repository instructions still described Cachex storage, while the implementation already used Mnesia. A future design document, meanwhile, describes a move to PostgreSQL and multiple users. All three are present in the repository; only one describes the current implementation.

That is why I want Codex to read the actual code paths and compare them with the instructions. Documentation is valuable context, but it can drift. Keeping it current is part of maintaining the development workflow.

The practical value is the short loop between an idea, a concrete change, automated checks, and trying the result in the app. The product decisions and the responsibility for accepting the result stay with me.

## Where Fittr goes next

The current application is a personal workspace. The repository contains a design for multiple users, Google authentication, and PostgreSQL, but those are future architecture, not capabilities I am claiming for this version.

For now, the most interesting work is making the existing loop more useful: a plan that reflects real training, recovery context that explains its inputs, and suggestions that remain easy to inspect and change. Elixir gives me a compact place to build that. Codex helps me work through the implementation, one reviewable behavior at a time.
