# 💻 Guardian CLI

The Guardian-CLI is a useful command-line application developed for simplifying management of Guardian project from cloning the repository to checkout to a specific release version, start/stop the project by docker and PM2 as well as cleaning the project and more features. The Guardian-CLI is supposed to be pushed into the npm registry in order that users can install it as a global package and use CLI commands entire their machine or servers.

## Local setup

1. Change directory to Guardian-CLI folder
2. Build the project by `npm run build`
3. Create a symlink to global node modules of machine by `npm link`

Having cloned Guardian project, Guardian-CLI can be set up for testing by following instructions:

## CLI Commands

Here is the commands can be used by Guardian-CLI:

*   Get Version: outputs the current version

    \-v, --version
*   Get Help: displays help for command

    \-h, --help

#### Commands:

* create

Clones Guardian project from repository

```
  guardian-cli create
```

* use

Checks out to a specific version of Guardian project

```
    guardian-cli use v2.9.0
```

* ls

Lists all release versions of Guardian project under the current directory

```
    guardian-cli ls
```

* ls-remote

Lists all release versions of Guardian project on official repository

```
    guardian-cli ls-remote
```

* build -d --docker, -n --npm, -y --yarn

Build Guardian project under current directory using docker, npm or yarn according to options passed by the command:

```
    guardian-cli build -d
    guardian-cli build --docker
    guardian-cli build -n
    guardian-cli build --npm
    guardian-cli build -y
    guardian-cli build --yarn
```

* start -d --docker, -p --pm2

Starts all Guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli start -d
    guardian-cli start --docker
    guardian-cli start -p
    guardian-cli start --pm2
```

* restart -d --docker, -p --pm2

Restarts all Guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli restart -d
    guardian-cli restart --docker
    guardian-cli restart -p
    guardian-cli restart --pm2
```

* stop -d --docker, -p --pm2

Stops all Guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli stop -d
    guardian-cli stop --docker
    guardian-cli stop -p
    guardian-cli stop --pm2
```

* destroy -d --docker, -p --pm2

Destroy all Guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli destroy -d
    guardian-cli destroy --docker
    guardian-cli destroy -p
    guardian-cli destroy --pm2
```

* clean -d --docker, -n --node

Cleans all docker images built if -d or --docker passed as option otherwise if -n or --node selected removes all node\_modules and dist folders generated.

```
    guardian-cli clean -d
    guardian-cli clean --docker
    guardian-cli clean -n
    guardian-cli clean --node
```

\
