# Changesets

Every pull request that changes what ships (`src/`) adds one changeset:

```sh
npm run changeset
```

Pick the bump (patch, minor, major; before 1.0 a breaking change is a minor) and
write one line a user can act on. The release workflow collects changesets into a
"Version packages" pull request; merging it publishes to npm.
