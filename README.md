# karing-web

`karing-web` is a `Svelte + TypeScript` frontend intended to be served under `/web` while `karing` itself remains a separate project.

```bash
./run.sh --help
```

## run.sh

```bash
./run.sh
./run.sh <network_name>
./run.sh --test <port>
./run.sh --test <port> <network_name>
./run.sh --help
```

- no arguments: build `dist/` and start the compose stack, or stop it if already running
- `<network_name>`: join the given external Docker network
- `--test <port>`: publish nginx on `0.0.0.0:<port>` for browser testing
- `--test <port> <network_name>`: combine test publishing with an external Docker network

In `--test` mode:

- `http://0.0.0.0:<port>/` serves `karing`
- `http://0.0.0.0:<port>/web/` serves `karing-web`
