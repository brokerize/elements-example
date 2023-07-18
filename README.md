# brokerize elements example
This repository is a minimalistic showcase for integrating `@brokerize/elements` in a website or web application.

## prerequisites: tokens

brokerize support will provide you with:

- a `GITHUB_PACKAGE_INSTALL_TOKEN` for installing the brokerize elements library
- a `CLIENT_ID` for accessing the brokerize API
- optionally, a `COGNITO_CLIENT_ID`, if your client is enabled to work for registered brokerize users

The repo is configured to use our private package registry for the `@brokerize` namespace (see `.npmrc`). In order to install from the repository, run this command with the token provided to you by brokerize.

```
$ npm config set '//npm.pkg.github.com/:_authToken' --location project "<PROVIDED_GITHUB_PACKAGE_INSTALL_TOKEN>"
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

## how to log in to a broker
By default, new client ids may only access the "demo broker". Therefore, the `BrokerList` will only present one broker logo ("brokerize") to allow testing of the UI components. Once your frontend is ready to be tested, the client can be enabled to work with all our supported brokers. The demo broker is supposed to simulate many edge cases that are hard to reproduce in real broker environments. See https://api.brokerize.com/docs/#tag/demobroker for a description of the demo broker's behavior.

In order to log in to a demo account, you first need to create one. Just follow these simple steps:
- Navigate to `https://app.brokerize.com`
- There, either register/login or use a guest login
- In the top navigation bar, select "Demo broker"
- There you can simply create a demo account
- Copy the generated `Account Name`
- Back in the example app (`http://localhost:8080`), log in to the demo broker using the account name and password `42` (or `1337` if you want to test 2-factor login process).
