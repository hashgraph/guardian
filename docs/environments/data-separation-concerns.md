
### Data level separation of concerns
###### \#1694 
In order to discriminate data stored to the database it has been introduced a different database name per each environment. 
instead of working on the collection names or introducing new fields in the collection it has been preferred to implement the solution changing the whole database name. In this way different data for the different environments will have his own database.

The new db names are going to have the following format  \<environment\>_db_name.

To the purpose of define the Environment name in a global and univocal manner it as been introduced a global .env file at the level of the root guardian folder next to the docker_compose file in a way that docker compose has the visibility  to load the new GUARDIAN_ENV.
```
.env example:
	 GUARDIAN_ENV=prod
```
Therefore beside the environment variables loaded in the docker compose file using the env_file, as in 1604, it has been introduced the usage of “environment” specification to load the new GUARDIAN_ENV variable at docker-compose level. The usage of this environment variable has allowed to parametrize the database name in the common library: db-helper.ts 

Hence the user will be able to use the same infrastructure and maintain their production Guardian environment data  completely separated from user other environments data  as test, preview or demo environment. 

The switch  through the different environments is allowed by the configuration of just one parameter in the .env file. 

If the GUARDIAN_ENV parameter is left blank the system will keep behaving in the same way as now and the original database names will be used for the data. 

Therefore the modification will not impact immediately but new logical environments usage are allowed to share the same infrastructure from now on without data environment separation concerns

Make sure you use Docker Compose V2 (comes with Docker Desktop > 3.6.0) as at https://docs.docker.com/compose/install/
