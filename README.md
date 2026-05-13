# @ansivision/viewer

A viewer for replaying terminal sessions recorded with [ansivision](https://github.com/43081j/ansivision).

## Usage

Replay a recorded session:

```sh
npx @ansivision/viewer <file>
```

Record a new session (requires the `script` command in `PATH`):

```sh
npx @ansivision/viewer --record
```

Options:

- `-r`, `--record` - record a new session instead of replaying a file
- `--skip-intro` - skip the intro animation

## License

MIT
