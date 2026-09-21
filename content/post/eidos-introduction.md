---
title: "Introducing Eidos: facts, rules, and reasoning in Elixir"
cover: "/img/eidos/logo.png"
tags: ["reasoning", "Elixir", "BEAM", "software"]
date: 2026-09-14T00:00:00+02:00
draft: true
description: "An introduction to Eidos, an Elixir library for representing facts, deriving values from rules, and explaining the result. Part one of a series on the basics."
---

An account has a subscription plan and a number of months of activity. Whether it qualifies for a feature is a separate question. We can store the first two values and calculate the third. As the policy grows, that calculation may depend on other decisions, each with its own conditions.

[Eidos](https://github.com/tgrk/eidos) is an Elixir library for expressing those relationships as rules. It combines structured facts with a small domain-specific language and a backward-chaining reasoner. You ask for a value, and Eidos tries to derive it from the facts and rules available.

This is the first post in a series about the library. I will start with the distinction between facts and derived values, build a small example, and show how to inspect the reasoning. Later posts will cover the language and data model in more detail.

<!--more-->

## Why represent logic as rules?

For a single condition, an ordinary Elixir function is an excellent starting point. A rule library becomes interesting when several decisions share inputs, derived values depend on other derived values, or the application needs to explain which conditions produced an answer.

Consider a subscription policy: a premium account becomes eligible for a feature after more than six months. The plan and account age are inputs. Eligibility is a conclusion. Keeping those roles explicit gives us a useful boundary: applications provide facts, while rules describe what follows from them.

Eidos makes that boundary part of its API. `Eidos.set/3` writes facts; `Eidos.get/3` can resolve both stored and derived values. A direct write to an address covered by a rule is rejected, so the application cannot silently replace a computed conclusion with a stored answer.

## The pieces of a namespace

A namespace is the container passed between Eidos operations. It brings together:

| Piece | Purpose |
| --- | --- |
| Model | Holds asserted facts: values supplied directly by the application. |
| Rule base | Holds the rules and their lookup index. |
| Rule-base cache key | Identifies the cached rule base used during reasoning. |
| Schema | Describes structural constraints for data and addresses. |

For the first example, we can omit an explicit schema and use `Eidos.new/1`. That keeps the focus on facts and rules; defining objects, collections, and scalar types deserves its own post.

A namespace is an Elixir data structure. A successful write returns an updated namespace, which the caller must retain. Creating one does not give the application a durable database: storing and managing its application state remains a separate concern.

## A first rule

The following snippets run in sequence inside an Eidos project session, such as `iex -S mix` from the library checkout with its dependencies installed. They follow the repository's eligibility example. Use the toolchain pinned in the checkout's `.tool-versions` when trying them locally.

```elixir
import Eidos.Sigil

rule =
  Eidos.Rule.new(
    id: "premium-eligible",
    with: ~e/$plan = @users[0].plan
$months = @users[0].months_active/,
    when: ~e/$plan is equal "premium"
$months > 6/,
    then: ~e/@entitlements[0].premium_feature = true/
  )

namespace = Eidos.new([rule])
```

The rule has a name and three parts. `with` binds values to variables, `when` states the conditions, and `then` describes the conclusion available when those conditions hold. Here, both conditions must hold: the plan must be `"premium"`, and the account must have more than six months of activity.

The `~e/.../` sigil parses Eidos text into syntax-tree structures. Three prefixes are enough to read this example and the next one:

| Syntax | Meaning |
| --- | --- |
| `@users[0].plan` | An address in the namespace's data model. |
| `$plan` | A variable used within the rule. |
| `#user.plan` | A value supplied through the runtime context map. |

The index `[0]` selects the first entry in the collection. We will keep it fixed here rather than introduce iteration immediately. Also notice that each sigil starts directly with its first statement; a leading newline is not accepted by the current parser.

## Supply facts, then ask a question

We can now load the account data through a context map:

```elixir
{:ok, namespace} =
  Eidos.set(
    namespace,
    ~e/@users[0].plan = #user.plan
@users[0].months_active = #user.months_active/,
    %{"user" => %{"plan" => "premium", "months_active" => 12}}
  )

[address] = ~e/@entitlements[0].premium_feature/

Eidos.get(namespace, address, %{})
#=> {:ok, [true]}
```

`Eidos.set/3` receives a list of setter statements, resolves the context values, and returns the updated namespace. Rebinding `namespace` matters: subsequent reads must use the state containing those facts.

The sigil returns a list of parsed statements even for one address. `[address] = ...` extracts the single address expected by `Eidos.get/3`. Its final argument is an empty context map because this read needs no additional runtime inputs.

We never stored `premium_feature`. Eidos derived it when we asked for it.

## What backward chaining means here

Reasoning starts from the requested conclusion: the value at `@entitlements[0].premium_feature`. Eidos looks for a rule that can derive that address, then works backward through the values and conditions the rule requires.

In this example, it finds `premium-eligible`, resolves the stored plan and account age, checks both conditions, and produces `true`. If a required input were itself derived by another rule, resolving that input could lead to another reasoning step.

This is a useful way to read an Eidos rule: “To establish this conclusion, what must be available and what must hold?” The `then` clause participates in answering that question; loading the input facts does not eagerly write every possible conclusion into the model.

## No answer is different from false

Change the plan and ask the same question again:

```elixir
{:ok, basic_namespace} =
  Eidos.set(namespace, ~e/@users[0].plan = "basic"/, %{})

Eidos.get(basic_namespace, address, %{})
#=> {:ok, []}
```

Our rule only describes how to derive `true`. It contains no rule deriving `false`, so a basic account produces no result. The same distinction matters when a required fact is missing.

The application must decide what an absent conclusion means in its domain. It should not mistake an empty successful result for an evaluation failure, which is returned as `{:error, %Eidos.Error{}}`. Nor should it assume that every question has exactly one answer just because this example does.

## Inspect the reasoning

Eidos also exposes an explanation API. Using the original premium account namespace:

```elixir
query = Eidos.Query.new(select: ~e/$eligible = @entitlements[0].premium_feature/)

{:ok, explanation} = Eidos.explain(namespace, query, %{})

IO.puts(Eidos.Explanation.format(explanation))
```

The public `Eidos.Explanation` struct contains the query, its result, and reasoning steps. Steps identify rules and include outcomes, variable bindings, and conditions. The formatter turns that structure into readable text, so it is possible to inspect the decision without depending on the reasoner's internal data structures.

As examples grow beyond one rule, that becomes particularly useful: the result tells us what was derived, while the steps help us inspect how the engine arrived there. Applications still need tests for the intended policy; an explanation records the implemented reasoning, not whether the policy itself is correct.

## Where to go next

This series will build on the same small domain rather than introduce a different application for every feature:

1. **Introduction:** facts, rules, namespaces, and the first derived answer—the post you are reading.
2. **The language basics:** addresses, variables, context, conditions, arithmetic, and the `with` / `when` / `then` structure.
3. **Shaping the data:** schemas, objects, collections, vectors, and the difference between concrete indexes and wildcard reads.
4. **Connecting rules and asking richer questions:** derived inputs, `Eidos.match/4`, and explanations for successful and unsuccessful derivations.
5. **Using Eidos in an application:** state ownership, error handling, policy tests, custom functions, and practical limitations.

For now, the important starting point is small: supply facts, describe one relationship, and ask for its conclusion. The [repository](https://github.com/tgrk/eidos) includes guides and tested examples to explore further. This introduction reflects the local checkout reviewed in September 2026; the examples intentionally stay within the basic API rather than cover collection edge cases or every language feature.
