# Guardian-automation

## Description
This is a place for guardian automation tests
- [Installation](#installation)
- [Usage](#usage)

## Usage of cypress.env
In this file a user need to add own `authorization` key which is `access_key` which assign to a RootAuthority after registartation

## Installation
- Instalation guardian-automation `git clone git@github.com:niklatkin/guardian-automation.git`
- Instalation Cypress `npm install cypress --save-dev`
- Instalation docker `docker-compose up -d --build`

## Usage
`npx cypress open` - to open the Cypress Dashboard
`npx cypress run` - to run the Cypress tests
