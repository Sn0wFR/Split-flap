# Changelog

## [1.1.1](https://github.com/Sn0wFR/Split-flap/compare/split-flap-v1.1.0...split-flap-v1.1.1) (2026-08-02)


### Bug Fixes

* **element:** forward SetOptions from set() to the display ([9b12acc](https://github.com/Sn0wFR/Split-flap/commit/9b12acc89bb091165bbdf250114d25dfe7da0bd9))
* **element:** forward SetOptions from set() to the display ([ba0a936](https://github.com/Sn0wFR/Split-flap/commit/ba0a936ea48d3527d341d665be9d98890a0f173f)), closes [#15](https://github.com/Sn0wFR/Split-flap/issues/15)

## [1.1.0](https://github.com/Sn0wFR/Split-flap/compare/split-flap-v1.0.0...split-flap-v1.1.0) (2026-08-02)


### Features

* **core:** add SplitFlapBoard, a grid that refreshes in order ([9e168c8](https://github.com/Sn0wFR/Split-flap/commit/9e168c8a9d5cf9e99a20f2a27b5f547087634cf2))
* **core:** boards with a refresh order, and a page-scoped sound engine ([ef17e49](https://github.com/Sn0wFR/Split-flap/commit/ef17e499e8465ac36c69dd47d5a2f4f3fb0fb2bb))
* **core:** turn through whole words with the `words` option ([d136f9c](https://github.com/Sn0wFR/Split-flap/commit/d136f9cf9959559d87019ca4c5512b711977bfcd))
* **core:** turn through whole words with the words option ([9e19b0d](https://github.com/Sn0wFR/Split-flap/commit/9e19b0df3a6eb8f7927f0ad5a006e7a2083744a5))
* **site:** use a word module for the status column too ([a91fc68](https://github.com/Sn0wFR/Split-flap/commit/a91fc682768abc62f5936bcc616bd97274d456ea))


### Bug Fixes

* **site:** fill the departure board only once it is in view ([2118b64](https://github.com/Sn0wFR/Split-flap/commit/2118b642109f78813a9db22842c664809db32ddc))
* **site:** fill the departure board only once it is in view ([6fab3c8](https://github.com/Sn0wFR/Split-flap/commit/6fab3c822af749f708ab48035cd798ba1c8c8ae5))


### Performance

* **core:** read the shading depth once per instance ([b06d6b5](https://github.com/Sn0wFR/Split-flap/commit/b06d6b575ea7e047b5ef0dce8b10e43d2db1a6c2))


### Refactors

* **sound:** make the click engine page-scoped ([476e43d](https://github.com/Sn0wFR/Split-flap/commit/476e43d548e3db144f603ef1fb20b13133effa8e))

## 1.0.0 (2026-08-02)


### Features

* **core:** add the split-flap display engine ([caca8cc](https://github.com/Sn0wFR/Split-flap/commit/caca8cc28d5cb99503d285dbf57f031b881181f5))
* **element:** add the &lt;split-flap&gt; custom element ([3e57679](https://github.com/Sn0wFR/Split-flap/commit/3e57679cb2a206d617c4d13e12d96f37f86eb380))
* **react:** add the React component and hook ([40b4c8a](https://github.com/Sn0wFR/Split-flap/commit/40b4c8a3cae87e963737831e253151875756754d))
* **site:** add a mechanical sound switch to the landing page ([094f925](https://github.com/Sn0wFR/Split-flap/commit/094f9257b231736f24173d3726e7f26c01b6c534))
* **site:** add the bilingual presentation page ([8a0d959](https://github.com/Sn0wFR/Split-flap/commit/8a0d9590495e4726eff23592983312b33f1518e9))
* **site:** mechanical sound on the landing page ([647b54c](https://github.com/Sn0wFR/Split-flap/commit/647b54c5bb2e8e3dd6e33b5bf2fc68cbdd15ceb0))
* split-flap display library and presentation site ([0744e2c](https://github.com/Sn0wFR/Split-flap/commit/0744e2c069b2abc989fec5e3c3c64d210d039590))


### Bug Fixes

* **core:** build the clicker when a flip needs it, not when a value is set ([fb788e9](https://github.com/Sn0wFR/Split-flap/commit/fb788e92780feb779cc0e0cdf8e06d717ca19785))
* **core:** build the clicker when a flip needs it, not when a value is set ([d8c7270](https://github.com/Sn0wFR/Split-flap/commit/d8c7270f46e969a0b563dfa6af61deb8e9588133))
* **site:** stop the language switch from reshuffling the board ([ea58a5c](https://github.com/Sn0wFR/Split-flap/commit/ea58a5c771776657eb3343cd3727be2670ab8d0d))
* **site:** stop the language switch from reshuffling the board ([bd8119e](https://github.com/Sn0wFR/Split-flap/commit/bd8119ee8ab3fa1945d0462a737c21c39e8131b7))
* **sound:** share one AudioContext across every clicker ([6df6c9c](https://github.com/Sn0wFR/Split-flap/commit/6df6c9cd69774919e175146896cc6f2eb8450714))
* **sound:** unlock the audio context on the page's first gesture ([372b72e](https://github.com/Sn0wFR/Split-flap/commit/372b72e865586a1957ba611f5b5632194b4e12e3))
* **sound:** unlock the audio context on the page's first gesture ([62215df](https://github.com/Sn0wFR/Split-flap/commit/62215df47678282ec4e2ca6203027c1816290fb6))


### Documentation

* add bilingual READMEs and a contributing guide ([6b12735](https://github.com/Sn0wFR/Split-flap/commit/6b12735e033fcb9d451922735aece865e037a897))
