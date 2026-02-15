---
title: 'My Code BEAM STO 2018 Notes'
author: 'Martin Wiso'
cover: '/media/posts/codebeam_sto1.jpg'
tags: ['Erlang', 'BEAM', 'conference']
date: 2018-07-02T16:34:12+02:00
draft: false
description: "Highlights and practical notes from Code BEAM Stockholm 2018 sessions."
featured: true
---

This year I finally attended one of the best Erlang and BEAM related conference in Europe. There is no better place te learn more about BEAM than in Stockholm. This post is a short highlight of what I found interesting during talks I attended. I also finally managed to get signed my Programming Erlang book by no other than Joe Armstrong.

<!--more-->

## Overall

In depth discussions and questions, super friendly people, great venue (except for one room with limited view of presentations) and great food. A lot of Ericcson people there that work on BEAM and have super in depth answers on how particular thing is actually implemented (eg missing crypt from libssl etc). Decent party to celebrate 20 years since Erlang was open sources. Three tracks of talks (basic, advanced and expert level) during 2 days.

## Talks

This is just list of notes that I took/remember from talks I saw (mostly no basic ones). All talks were recorded and be online soon.

- Keynote - Simon Phipps - ex-Sun, OSI, great talk about importance of history of OS and licensing
- Keynote - Osa Gaius - importance of sharing fun exp, funny gorilla talks in Meetups (start talk about React -> boom -> Erlang wisdom)

- Andrea Leopardi - new Elixir features - defguard, property testing, dynamic supervisor - https://elixir-lang.org/blog/2018/01/17/elixir-v1-6-0-released/
- Mikhail Vorontsov - ForgETS aka "drop in replacement for Mnesia"-ring style hashing based on {phone_number/timestamp} - keys and up to date NTP servers for every cluster, islands of clusters with replication, automatic reconsilation due to nature of keys, data replication across islands, relatively easy due to WA usecase specifics keys), flexible way of changing schema, no clear OS plans but it is on their todo list
- Michal Muskala - local debugging, measuring, profiling, perf tips for coding, decompile file to do low level optimisations (eg JASON library) - https://github.com/michalmuskala/decompile
- Keneth Lundin - new Logging API, some OTP 21 higlighs (20% faster execution, faster IO), compiler optimizations eg {:error, \_reason} = error done automatically, custom dist protocol - http://blog.erlang.org/My-OTP-21-Highlights/
- Kofi Gumbs - Elm on BEAM - typed BEAM instructions in Haskell, nothing else yet from Elm - https://github.com/hkgumbs/codec-beam
- Simon Thompson - macros + delayed evaluation -> lazy evaluation - not that nice code but lazy - https://github.com/simonjohnthompson/streams
- Josef Svenningsson - Gradual typing as way to use types in BEAM after many failed, complementary to dialyzer - https://github.com/josefs/Gradualizer
- Johan Bevemyr - Cisco uses BEAM for ASICs devices configurations, great productivity and stability, ~2M devices are deployed, no Erlang distribution
- Aish Dahal - evolution of their SLA systems, ETS + Kafka, simple is beautiful, who monitors PagerDuty SLA systems?
- Joseph Yiasemides - expressiveness power of BEAM, broad and philosophical view of how to express intention of code
- Peter Gömöri - pollsets improvements in Erlang/OTP 21 IO scalability, benchmarks older vs new runtime (IO contention on heavy load)
- Timmo Verlaan - custom dist protocol - (make one for our Consul case?),
- Martin Summer - Riak 3.0 anti-entropy, UK NHS system Spine, replaced dedicated custom Oracle based solution), great savings (both money and operational costs) and better stability/performance, optimised Merkle Tree method in comparison of data
- Jörgen Brandt - using high level petri nets instead of FSMs as an proposal how to implicitly visualize states and their transitions (POC but used in his workflow language Cuneiform - https://github.com/joergen7/cuneiform
- Robert Virding - BEAM ecosystem with multiple languages on board, general super nice talk as always
- Peer Strintiziger & Adam Lindberg - factory automation hw and sw, distribution across heterogeneous networks, aim for 1000+ nodes, WIP right now

- Discussion panel - quite funny discussion with Torben Hoffman as moderator - Kostis Sagonas, Kevin Hammond, Natalia Chehcnia and Simon Thompson (broader topics, research and industry, etc)

## Resources

Notes that are mostly DistSys related (as it is close to my heart and interests) that were mentioned during talks:

    * Out of the tar pits paper -http://curtclifton.net/papers/MoseleyMarks06a.pdf
    * Hack your own Erlang VM - http://studzien.github.io/hack-vm/part1.html
    * Yang - https://blogs.cisco.com/sp/yanglanguage
    * LSM trees - http://www.benstopford.com/2015/02/14/log-structured-merge-trees/
    * DottedDB paper - http://haslab.uminho.pt/tome/files/dotteddb_srds.pdf

## Conclusion

I will definitely try to make it next year! Besides lovely city I really enjoyed fact that there was a lot of people from Ericsson that are actually working on BEAM and Erlang.

List of all available talks can be found [here](https://www.youtube.com/watch?v=87lW4Llsj7E&list=PLvL2NEhYV4ZsuMetmDORnzhpkYrYsuK28).
