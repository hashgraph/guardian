# Guardian CLI
Guardian-Cli is a useful command-line application developed for simplifying management of guardian project from cloning the repository to checkout to a specific release version, start/stop the project by docker and PM2 as well as cleaning the project and more features. It is supposed guardian-cli to be pushed into npm registry in order that users can install it as global package and use cli commands entire their machine or servers.

# Local setup
Having cloned guardian project, guardian-cli can be set up for testing by following instructions:

1. Change directory to guardian-cli folder
2. Build the project by `npm run build`
3. Create a symlink to global node modules of machine by `npm link`

# Cli Commands
Here is the commands can be used by guardian-cli:

- Get Version: outputs the current version
    
    -v, --version

- Get Help: displays help for command

  -h, --help


### Commands:

  - create    
  
  Clones guardian project from repository
```
  guardian-cli create
```
  - use <version>      
  
  Checks out to a specific version of guardian project

```
    guardian-cli use v2.9.0
```

  - ls
  
  Lists all release versions of guardian project under the current directory
```
    guardian-cli ls
```

  - ls-remote
  
  Lists all release versions of guardian project on official repository

```
    guardian-cli ls-remote
```

  - build -d --docker, -n --npm, -y --yarn
  
  Build guardian project under current directory using docker, npm or yarn according to options passed by the command:
    

```
    guardian-cli build -d
    guardian-cli build --docker
    guardian-cli build -n
    guardian-cli build --npm
    guardian-cli build -y
    guardian-cli build --yarn
```


  - start -d --docker, -p --pm2
  
  Starts all guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli start -d
    guardian-cli start --docker
    guardian-cli start -p
    guardian-cli start --pm2
```

  - restart -d --docker, -p --pm2
  
  Restarts all guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli restart -d
    guardian-cli restart --docker
    guardian-cli restart -p
    guardian-cli restart --pm2
```

  - stop -d --docker, -p --pm2
  
Stops all guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli stop -d
    guardian-cli stop --docker
    guardian-cli stop -p
    guardian-cli stop --pm2
```

  - destroy -d --docker, -p --pm2
  
  Destroy all guardian services using docker or PM2 runner according to options passed by start command.

```
    guardian-cli destroy -d
    guardian-cli destroy --docker
    guardian-cli destroy -p
    guardian-cli destroy --pm2
```

  - clean -d --docker, -n --node
  
  Cleans all docker images built if -d or --docker passed as option otherwise if -n or --node selected removes all node_modules and dist folders generated.
```
    guardian-cli clean -d
    guardian-cli clean --docker
    guardian-cli clean -n
    guardian-cli clean --node
```