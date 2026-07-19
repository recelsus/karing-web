# Third-Party Notices

Karing Web does not vendor third-party source code in this repository.

The frontend is built with npm packages declared in `package.json` and locked
in `package-lock.json`, including:

- Svelte and `@sveltejs/vite-plugin-svelte`.
- Vite.
- TypeScript.
- Vitest.
- `svelte-check`.

The package lock currently contains dependencies licensed under MIT,
Apache-2.0, ISC, and BSD-3-Clause licenses. The exact dependency versions and
license metadata are recorded in `package-lock.json`.

Container images and CI workflows use third-party base images and actions:

- `nginx:1.29-alpine` for serving the built frontend.
- GitHub Actions maintained by GitHub and Docker.

Those components remain under their respective licenses. Package managers,
container registries, and operating system distributions provide their own
license metadata for the exact versions used.
