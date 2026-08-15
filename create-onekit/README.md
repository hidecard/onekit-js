# create-onekit

The official OneKit JS project creator. It powers:

```bash
npm create onekit@latest my-app
```

The package delegates project generation to the published `onekit-js` CLI implementation and requires Node.js 18 or newer.

## Usage

Create the default TypeScript starter:

```bash
npm create onekit@latest my-app
cd my-app
npm install
npm run dev
```

Create a JavaScript starter:

```bash
npm create onekit@latest my-app -- --javascript
```

The explicit executable form is also supported:

```bash
npx create-onekit my-app --template ts
npx create-onekit my-app --template js
```

The generated project contains a Vite-compatible entrypoint, a starter component, TypeScript or JavaScript configuration, and scripts for development and production builds.

## Requirements

Node.js 18 or newer is required. The generated project installs `onekit-js` and its application dependencies from npm.

## Development from the OneKit repository

From the parent `onekit-js` repository, pack and install the creator together with the published runtime package in a temporary smoke-test project:

```bash
cd create-onekit
npm install
npm pack

mkdir -p /tmp/create-onekit-smoke
cd /tmp/create-onekit-smoke
npm init -y
npm install /path/to/onekit-js/onekit-js-3.1.13.tgz /path/to/onekit-js/create-onekit/create-onekit-1.0.1.tgz
npx create-onekit demo-app
```

The package is published independently from `onekit-js`. Publishing `onekit-js` alone does not create the `npm create onekit` command.

## Publishing

From this directory, run the package checks and publish the package as a public npm package:

```bash
npm install
npm pack --dry-run
npm publish --access public
```

A new package version is required for every subsequent publish. Never place npm tokens in source files, commits, or documentation.

## Automatic publishing with GitHub Actions

The repository includes `.github/workflows/publish-create-onekit.yml`. It validates the package on every `create-onekit-v*` tag and publishes it to npm with provenance. The workflow uses npm Trusted Publishing through GitHub's OIDC token, so no long-lived npm token is stored in GitHub Secrets.

Before the first automated release, configure a **Trusted Publisher** for the `create-onekit` package on npm. Select GitHub Actions, repository `hidecard/onekit-js`, branch `V3`, and workflow filename `publish-create-onekit.yml`. The npm package must already exist or the first release must be published once using the manual command above, depending on the npm account's Trusted Publishing setup.

To publish version `1.0.1`, ensure the package version is `1.0.1`, commit the change on `V3`, and push a matching tag:

```bash
npm version 1.0.1 --no-git-tag-version
npm install --package-lock-only
git add create-onekit/package.json create-onekit/package-lock.json
git commit -m "chore(create-onekit): prepare v1.0.1"
git push origin V3
git tag create-onekit-v1.0.1
git push origin create-onekit-v1.0.1
```

The workflow rejects a tag when its version does not exactly match `create-onekit/package.json`. A manual workflow run performs validation only; it does not publish. Publishing is intentionally restricted to versioned `create-onekit-v<version>` tags.

## License

MIT © OneKit contributors
