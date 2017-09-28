# Arrowhead Core for Node.js

[Arrowhead][arrow] core utilities for [node.js][nodej]. This package contains
code for interfacing against the _Arrowhead Mandatory Core Services_, which are
the _ServiceRegistry_, _AuthorisationSystem_ and the _OrchestrationSystem_.
More information about the mentioned services may be read in the
[Arrowhead Wiki][arwik].

_This repository contains a Work-In-Progress (WIP) implementation. Everything_
_is subject to change, and no guarantees about what particular features are_
_available are given._

## About Arrowhead

Arrowhead is a service-oriented automation framework, envisioned to enable the
creation of highly dynamic, scalable and resilient industrial automation
systems. It is centered around the idea of so-called
[Local Automation Clouds][clwik], which could be thought of as secured
intranets with real-time operation support. For more information, please refer
to the [Arrowhead Wiki][arwik].

## Using this Package

This package is available via the [Node Package Manager][npmjs] and is published
as [ahf-core][npmac]. Instructions on how to get started with the package may
be read [here][npmst].

## Contributing

Contributions are considered from all sources, in all forms, and are required
to adhere to the below guidelines in order to be accepted.

- All code that can reasonably be written in TypeScript, must be written in
  TypeScript.
- New code must adhere to the style of the existing code.
- No other functionality other than such that contributes to the implementations
  of the _ServiceRegistry_, _AuthorisationSystem_ or _OrchestrationSystem_
  service interfaces will be accepted.
- The only dependency of this package is the latest Long Term Support (LTS)
  release of the node platform itself. No other packages may be used.
- Unit tests must be provided along new contributions if the contribution in
  question is either (1) a non-trivial bugfix, (2) understood to be difficult to
  get right, or (3) contains security-critical functionality.
- Integration tests are not to be part of this repository.
- The package is not to contain any implementations of cryptographic primitives,
  such as a secure hash functions, other kind of encryption function, etc.

### Rationale

#### No Dependencies

Having dependencies invariably leads to a loss of control, to some extent.
Version conflicts, security issues, other bugs, and the disk space required to
use this package can end up being out of reach of its developers. Avoiding
dependencies is therefore a primary objective.

#### Limited Unit Testing

Apart from ensuring behaviour correctness, unit tests lead to making code changes
more difficult, as either new units must be written, or existing units be changed
whenever code is added or modified. By focusing on bugfixes, other difficult
regions of code, and security-critical functionality, unit tests are employed
where needed the most, and the cost of maintaining them is kept at a reasonable
low.

#### No Integration Tests

Integration tests are often not distinguished from regular unit tests. The
former kind ensures that an implementation is true to its public interface
specification, while the latter verifies that the internals of an implementation
behave as expected. Integration tests may with advantage be put into separate
projects, each making up a Technology Compatibility Kit (TCK), which may be used
to test not just a single project, but any other such that aim to be compatible
with it.

#### No Cryptographic Primitives

Cryptography is hard to get right. The cryptographic primitives provided via
node.js through OpenSSL ought to be enough for any secure functionality
implemented in this package.

[arrow]: http://www.arrowhead.eu/
[arwik]: https://forge.soa4d.org/plugins/mediawiki/wiki/arrowhead-f/index.php/Main_Page
[clwik]: https://forge.soa4d.org/plugins/mediawiki/wiki/arrowhead-f/index.php/Local_automation_clouds
[nodej]: https://nodejs.org
[npmac]: https://www.npmjs.com/package/ahf-core
[npmjs]: https://www.npmjs.com/
[npmst]: https://www.npmjs.com/package/ahf-core/tutorial
