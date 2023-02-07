# brokerize elements example
This repository is a minimalistic showcase for integrating `@brokerize/elements` in a website or web application.

## prerequisites: tokens

brokerize support will provide you with:

- a `GITHUB_PACKAGE_INSTALL_TOKEN` for installing the brokerize elements library
- a `CLIENT_ID` for accessing the brokerize API
- optionally, a `COGNITO_CLIENT_ID`, if your client is enabled to work for registered brokerize users

The repo is configured to use our private package registry for the `@brokerize` namespace (see `.npmrc`). In order to install from the repository, run this command with the token provided to you by brokerize.

```
$ npm config set 'https://npm.pkg.github.com/:_authToken' --location project "<PROVIDED_GITHUB_PACKAGE_INSTALL_TOKEN>"
```

Now you're ready to install the dependencies:

```
$ npm install
```

## configuration

Add your `CLIENT_ID` (and, if applicable, `COGNITO_CLIENT_ID`) to the `config.js` file.

## run the example
Due to CORS restrictions, the example must be run on `http://localhost:8080`. The brokerize support will allow custom origins for your client once you're ready to deploy your own testing, staging or production environments.

Just serve the content, for example by running `$ npx http-server -p 8080 .`. Now navigate to `http://localhost:8080` to see the example app.
