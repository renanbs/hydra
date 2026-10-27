// Stand-in for the pet bundle's `.webp?url` imports.
//
// `src/components/pet/pet-models.ts` imports `resources/{claude,opencode,gremlin}.webp?url`
// at a path that does not exist in this repo (the Orca port kept a tree depth that resolves
// outside the checkout, and no image was ever vendored). Both `vite.config.ts` (build) and
// `vitest.config.ts` (tests) alias those three imports here, because the store's UI slice
// needs `pet-models` for its pet ids — plain constants — and would otherwise drag an
// unresolvable asset import into every store consumer.
//
// Delete this module and the aliases once the three images are vendored.
export default ''
