### Ecosystem Environments
###### \#1923, \#1639

All Guardian Microservices share a common set of Environment variables defined in a single file. In this way Guardian can be seen as an ecosystem  with several services and common set of parameters leading his behaviour. This environment parameters  are shared between all the services of the Guardian ecosystem.
The file that hold the environment variables for the running session is defined at root level. All variables are defined in a .env.<ENV>.guardian.system file. The file name is parametric so it is possible to define a different files for different possible running configuration, for example production, develop, test1. The ecosystem environment file follow the .env.template.guardian.system file that let write new configuration with the minimum set of necessary variables.

A unique filet at root project level define the environment and keeps the responsibility  to create the shared operative ecosystem.

Every of the environment will have his own Environment Ecosystem Name which will be used discriminate which environment is going to spread the session. 

![hierarchy.png](https://images.zenhubusercontent.com/63dbe2bd4d4d6290bed6780c/12790cd6-19b5-4f3c-aad2-9d28081e8498)

To the purpose of define the Environment name in a global and univocal manner it as been introduced a global .env file at the level of the root guardian folder next to the docker_compose file in a way that the docker-compose has the visibility  to load the new GUARDIAN_ENV.

Also Guardian services are allowed to define specific service variables. This different set of variables will allow to have a hierarchical definition of the same variable at service level in a way that a developer could redefine some them in a service specific way or add new variables extending the usage of the common environment.
The environment variables that are specific to services can be specified in two different way:
1. By the means  of .env.<guardian_Env> files in each service. 
2. Using docker-compose precedence specification.

In the first way the environment is loaded in the service by the file config.ts. the Environment is read in two steps: at first steps .env common file is loaded while at second step .env.<GUARDIAN_ENV> file is loaded. 
The implementation allows to use override=true/false (A new environmet variable it has been added for this purpose) to let variables defined in the .env.<GUARDIAN_ENV> to override the common defined variables or add new ones. For example If OVERRIDE=true a variable with the same name as the one already defined in the .env.<ENV>.guardian.system file will assume the value specify at service level in the .env.<GUARDIAN_ENV> file. The OVERRIDE parameter is not mandatory. The default value is “false“. In this way specific variables can only be added to the global ones.

In the second way docker compose “env-file” and “environment” attributes precedence is leveraged as define at https://docs.docker.com/compose/environment-variables/envvars-precedence/#simple-example
In this way override=”true” always and variables re-assigned in the environment attributes override what as been defined in the .env.<ENV>.guardian.system env-file.