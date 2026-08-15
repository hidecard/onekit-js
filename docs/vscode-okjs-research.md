# VS Code `.okjs` Extension Research Notes

## Official sources

1. [Syntax Highlight Guide](https://code.visualstudio.com/api/language-extensions/syntax-highlight-guide)
2. [Language Configuration Guide](https://code.visualstudio.com/api/language-extensions/language-configuration-guide)
3. [Snippet Guide](https://code.visualstudio.com/api/language-extensions/snippet-guide)
4. [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)

## Key findings

VS Code uses TextMate grammars as the primary syntax-highlighting mechanism. A custom language extension contributes a language identifier, file association, and a grammar under `contributes.grammars`. Embedded-language mappings can make JavaScript/TypeScript and CSS blocks behave like their native languages for comments, bracket matching, and snippets.

The language configuration contribution controls line/block comments, brackets, autoclosing pairs, autosurrounding, folding, word patterns, and indentation rules. Naming the file `language-configuration.json` enables VS Code schema completion and validation.

The `.okjs` extension should therefore contain a `package.json`, `syntaxes/okjs.tmLanguage.json`, `language-configuration.json`, and `snippets/okjs.json`. The grammar should scope `<script>` content as JavaScript/TypeScript and `<style>` content as CSS while giving `<template>` tags and OneKit directives their own scopes. The extension can be packaged as a `.vsix` with `@vscode/vsce` and installed locally without publishing to the Marketplace.
