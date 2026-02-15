---
title: "APIDiff CLI Tool"
cover: 'https://asciinema.org/a/219377.svg?t=30'
tags: ['API', 'HTTP', 'JSON', 'diff', 'changes', 'CI']
date: 2019-01-02T13:28:00+01:00
draft: false
description: "A CLI tool for comparing HTTP JSON APIs to ensure compatibility during migrations and refactoring"
featured: true
---

While rewriting some of [IDAGIO](https://asciinema.org) micro-services back to monolith I came across a need to be able to compare HTTP JSON based APIs for both payload and HTTP header changes. Sadly all tools I came across were either too simple, lacking flexibility or lacking CLI interface. Well, then I decided it should be easy to write new one CLI tool...

<!--more-->

# TL;TR

[APIDiff](https://github.com/tgrk/apidiff) records HTTP API (JSON based) calls and compares them on both HTTP and JSON level. This is helpful when migrating or refactoring APIs to make sure your API contract did not change. It also stores basic performance metrics.

# Overview

You can find core functionality as part of this [asciinema](https://asciinema.org) recording bellow:
[![](https://asciinema.org/a/219377.svg)](https://asciinema.org/a/219377)

# Features

My intention was to have a quite lean small tool that covers only features listed below:

* CLI tool that can be integrated into CI/CD
* Support JSON based HTTP APIs
* Customizable matching rules
* Storing basic performance metrics
* Ability to manage existing recorded sessions

# Installation

As of now, there is no OS package available and you have to have [golang](https://golang.org/doc/install) installed. After that you can use the following command:
```bash
$ go get gopkg.in/tgrk/apidiff.v1
```

# Credits

This whole project is built around the concept of VCR/Cassette recording that is a great helper when your application integrates 3rd party services and IMO better way than using mocks written in your favourite programming language.
