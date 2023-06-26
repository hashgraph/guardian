
### Indipendent services images
###### \#1604 
The dockerized services images needs to be indipendent from the environment that describes the context in wich the images itself are running.

In each service loading .env files at build time by means of dockerfiles, forces rebuilding the docker image for changes to be applied to the environment. 

To prevent this behavior the usage of “env_file” has been Introduced in the docker_compose file. In this way the environment variables are loaded in each container during the bootstrap of the application and passed to the image without the need to rebuild the image itself.
The dockerfiles have been changed accordingly: the command “copy” of the .env file was commented out. Actually the .env file is not needed at build time while it’s going to be charged during the bootstrap of the containers at the compose-level.
To prevent this behavior the usage of “env_file” has been Introduced in the docker_compose file. In this way the environment variables are loaded in each container during the bootstrap of the application and passed to the image without the need to rebuild the image itself.
The dockerfiles have been changed accordingly: the command “copy” of the .env file was commented out. Actually the .env file is not needed at build time while it’s going to be charged during the bootstrap of the containers at the compose-level.