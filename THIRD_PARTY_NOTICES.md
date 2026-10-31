# Third-party notices

JVM Atlas's own code and content are released under the [MIT License](LICENSE). The published
site is built from the third-party fonts and runtime packages below (the bundler leaves out code
that is not used). Each package ships its full licence text, which you will find in
`node_modules` after `npm ci`.

## Fonts

All fonts are bundled with the site through Fontsource and served from the same origin; no font
is loaded from another host.

| Font           | Package                               | Licence                                                   | Copyright                          |
| -------------- | ------------------------------------- | --------------------------------------------------------- | ---------------------------------- |
| Inter          | `@fontsource-variable/inter`          | [SIL Open Font License 1.1](https://openfontlicense.org/) | The Inter Project Authors          |
| JetBrains Mono | `@fontsource-variable/jetbrains-mono` | [SIL Open Font License 1.1](https://openfontlicense.org/) | The JetBrains Mono Project Authors |
| Source Serif 4 | `@fontsource-variable/source-serif-4` | [SIL Open Font License 1.1](https://openfontlicense.org/) | Adobe                              |

## Runtime libraries

| Package                                                                                              | Licence      | Copyright                            |
| ---------------------------------------------------------------------------------------------------- | ------------ | ------------------------------------ |
| `react`, `react-dom`, `scheduler`                                                                    | MIT          | Meta Platforms, Inc. and affiliates  |
| `react-router`, `@remix-run/route-pattern`                                                           | MIT          | React Training LLC; Shopify Inc.     |
| `motion`, `motion-dom`, `motion-utils`, `framer-motion`                                              | MIT          | Motion B.V. (formerly Framer B.V.)   |
| `lucide-react`                                                                                       | ISC          | Lucide Icons and Contributors        |
| `shiki`, `@shikijs/*`                                                                                | MIT          | Pine Wu; Anthony Fu                  |
| `@shikijs/vscode-textmate`                                                                           | MIT          | Microsoft Corporation                |
| `oniguruma-to-es`, `oniguruma-parser`, `regex`, `regex-recursion`, `regex-utilities`                 | MIT          | Steven Levithan                      |
| `hast-util-to-html`, `mdast-util-to-hast` and related `unist`, `vfile`, `micromark-util-*` utilities | MIT          | Titus Wormer                         |
| `@ungap/structured-clone`                                                                            | ISC          | Andrea Giammarchi                    |
| `cookie-es`                                                                                          | MIT          | Pooya Parsa                          |
| `dequal`                                                                                             | MIT          | Luke Edwards                         |
| `tslib`                                                                                              | 0BSD         | Microsoft Corporation                |
| `three`                                                                                              | MIT          | three.js authors                     |
| `@react-three/fiber`, `its-fine`, `react-use-measure`                                                | MIT          | Poimandres                           |
| `zustand`, `suspend-react`                                                                           | MIT          | Paul Henschel                        |
| `use-sync-external-store`                                                                            | MIT          | Meta Platforms, Inc. and affiliates  |
| `@babel/runtime`                                                                                     | MIT          | Sebastian McKenzie and contributors  |
| `buffer`                                                                                             | MIT          | Feross Aboukhadijeh and contributors |
| `base64-js`                                                                                          | MIT          | Jameson Little                       |
| `ieee754`                                                                                            | BSD-3-Clause | Fair Oaks Labs, Inc.                 |

**Why the 3D libraries are here.** The 3D anatomy is drawn with Three.js through React Three
Fiber, which keeps the 3D scene in React and shares the explorer's state. They are the largest
dependencies of the site, so they live in a separate chunk that is downloaded only when a reader
chooses the 3D viewer; the build fails if they reach the scripts a page loads first (see
`docs/3D_EXPERIENCE.md`). `buffer`, `base64-js`, `ieee754` and `@babel/runtime` are dependencies
of React Three Fiber; the bundler includes only the code the browser build uses.

The Java, shell and C syntax-highlighting grammars come from `@shikijs/langs` (MIT). See that
package for the upstream source of each grammar.

The exact versions are pinned in `package.json` and `package-lock.json`. Development tools
(Vite, TypeScript, ESLint, Prettier, Vitest, Testing Library, Playwright, Tailwind CSS) are used
to build and test the site; Tailwind CSS (MIT, Tailwind Labs, Inc.) generates part of the
published stylesheet.

## Specifications and sources

JVM Atlas quotes and paraphrases short passages of the Java Language Specification, the Java
Virtual Machine Specification, the Java SE API documentation, JDK Enhancement Proposals and the
OpenJDK source code for the purpose of explanation, always with a link to the source. These
documents remain the property of their owners. Java and OpenJDK are trademarks or registered
trademarks of Oracle and/or its affiliates.
