# brokerize elements example
This repository is a minimalistic showcase for integrating `@brokerize/elements` in a website or web application.

## prerequisites: tokens

You need a `CLIENT_ID` for accessing the brokerize API (usually you start off with the test system under `https://api-preview.brokerize.com`). This can be created on `https://app-preview.brokerize.com/admin`. Note that you have to register as a user first.

If it is applicable for your client, brokerize support will provide you with a  `COGNITO_CLIENT_ID` (if your client is enabled to work for registered brokerize users). This is usually not the case and the config option can be ignored.


To install the dependencies, just run:

```
$ npm install
```

## configuration

Add your `CLIENT_ID` (and, if applicable, `COGNITO_CLIENT_ID`) to the `config.js` file.

## run the example
Due to CORS restrictions, the example should usually be run on some URL like `http://localhost:8080`. If you have created the `CLIENT_ID` on your own, you can configure the allowed origins and redirect URIs under https://app-preview.brokerize.com/admin.

Just serve the content, for example by running `$ npx http-server -p 8080 .`. Now navigate to `http://localhost:8080` to see the example app.

## how to log in to a broker
By default, new client ids may only access the "demo broker". Therefore, the `BrokerList` will only present one broker logo ("brokerize") to allow testing of the UI components. Once your frontend is ready to be tested, the client can be enabled to work with all our supported brokers. The demo broker is supposed to simulate many edge cases that are hard to reproduce in real broker environments. See https://api-preview.brokerize.com/docs/#tag/demobroker for a description of the demo broker's behavior.

In order to log in to a demo account, you first need to create one. Just follow these simple steps:
- Navigate to `https://app-preview.brokerize.com`
- There, either register/login or use a guest login
- In the top navigation bar, select "Demo broker"
- There you can simply create a demo account
- Copy the generated `Account Name`
- Back in the example app (`http://localhost:8080`), log in to the demo broker using the account name and password `42` (or `1337` if you want to test 2-factor login process).
