MusicVAE integration
===================

The two new demos use `@magenta/music` 1.23.1 and its `mel_2bar_small` checkpoint.
The worker imports only MusicVAE and runs TensorFlow on its CPU backend, keeping
inference off the audio and rendering thread. No API key or user-data upload is involved.

Run `node scripts/fetch-musicvae.mjs` from `noise-orb` to fetch or verify the
seven official checkpoint assets. The script checks existing bytes rather than
overwriting differing files. `public/models/musicvae/source.json` records source,
byte counts and SHA-256 digests. Vite copies the checkpoint into the standalone build.

The parent npm manifest scopes overrides to Magenta: protobufjs 8.8.1 addresses
the legacy parser/code-generation advisories; static-module 3.0.4, static-eval
2.1.1 and minimist 1.2.8 remove the vulnerable resampling toolchain versions.
sprintf-js remains at its latest 1.1.3; npm still reports four moderate findings
through TensorFlow's argparse/sprintf chain. No arbitrary format strings, model
URLs or protobuf schemas are accepted from users. This is an acknowledged vendor
limitation, not an audit suppression. Model inference and production browser
tests exercise the installed, overridden packages.

TypeScript already supplies WebGL2 in lib.dom. TensorFlow's pinned 0.0.5
definitions merge obsolete numeric constants into the whole application; 0.0.12
fixes those but still augments canvas overload inference. The two package-specific
type shims in `vendor/types` resolve its WebGL references to lib.dom. No project
strictness settings, renderer types or application errors are suppressed.

Vite aliases Magenta's `core/compat/global` adapter to `src/magenta/compat.ts`:
its original browser adapter assumes `window`, which dedicated workers do not
provide. The replacement exports the same fetch/performance/navigator bindings
from globalThis, with no audio or DOM emulation inside the worker.
The dependency optimizer uses the same scoped adapter and explicitly includes
both TensorFlow and the MusicVAE model entry. This prevents first-click dependency
discovery from reloading the development page and converts Magenta's CommonJS
protobuf module before the worker imports it.

The adapter maps the full 32-step model phrase onto the editor's 24-step loop,
snaps pitches into our scale and records optional per-note gates. It never crops
the last quarter of a generated phrase. Existing setups omit gates and retain
their previous playback. Drawing preserves its first and last anchors and protects
other user-authored layers. Generation errors leave the authored score intact;
there is no substitute generator presented as a Magenta result.
