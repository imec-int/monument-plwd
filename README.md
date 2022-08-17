# Monument

This repository contains 2 services: 1 web application and 1 API service receiving the location data for the Monument project.
This web application is used to notify PLWD caretakers when the plwd is wandering or missing. 

## Table of Contents

- [Requirements](#requirements)
- [Getting Started](#getting-started)
  - [Basic Setup](#basic-setup)
  - [Auth0 Configuration](#auth0-configuration)
  - [Twilio and SendGrid](#twilio-and-sendgrid)
  - [Mapbox and Google Maps API](#mapbox-and-google-maps-api)
  - [Postgis](#postgis)
  - [Postgis (Apple silicon)](#postgis-apple-silicon)
  - [Start API](#api-application)
  - [Start Web application](#web-application)
- [Documentation](#documentation)
  - [API Reference](#api-reference)
  - [Architecture](./ARCHITECTURE.md)
  - [Testing](#testing)
  - [Deploying](#table-of-contents)
- [Contributing](#contributing)
- [Code of condut](#code-of-conduct)
- [License](#license)

## Requirements
---
* [Auth0](https://auth0.com/) You need to have an Auth0 domain registered.
* [docker](https://www.docker.com/products/docker-desktop/) (>= 18.02.0+) and `docker-compose`
* [nvm](https://github.com/nvm-sh/nvm) or latest version of [NodeJS 16-lts](https://nodejs.org/en/download/)

## Getting started
---

### Basic Setup

We have two main folders, `web` and `api`.

`cd` into the web folder and create a `.env.local` file based on the `.env.local.template`. Then `cd` into the api folder and once again create a `.env` file, based on `.env.template`.

```sh
> cd web
> cp .env.local.template .env.local

> cd api
> cp .env.template .env
```

In the following steps we will gather the necessary environment variables to fill up these files.

### Auth0 Configuration

Create a **Regular Web Application** in the [Auth0 Dashboard](https://manage.auth0.com/#/applications).

> **If you're using an existing application**, verify that you have configured the following settings in your Regular Web Application:
>
> - Click on the "Settings" tab of your application's page.
> - Scroll down and click on the "Show Advanced Settings" link.
> - Under "Advanced Settings", click on the "OAuth" tab.
> - Ensure that "JsonWebToken Signature Algorithm" is set to `RS256` and that "OIDC Conformant" is enabled.

Next, configure the following URLs for your application under the "Application URIs" section of the "Settings" page:

- **Allowed Callback URLs**: `http://localhost:3000/api/auth/callback`
- **Allowed Logout URLs**: `http://localhost:3000/`

Take note of the **Client ID**, **Client Secret**, and **Domain** values under the "Basic Information" section. You'll need these values in the upcoming steps.

Next, create a **machine to machine application (M2M)**.
Once again take note of the **Client ID**, **Client Secret**, and **Domain** values under the "Basic Information" section.

Next, go to "APIs" and then select your "Auth0 Management API" and authorize your newly created M2M application to access the "Auth0 Management API".
You can limit the permissions to the following list:

- `create:users`
- `delete:users`
- `read:users`
- `update:users`
- `create:app_meta_data`
- `delete:app_meta_data`
- `read:app_meta_data`
- `update:app_meta_data`

Also, take note of the **API Audience** of the "Auth0 Management API".

Finally, create a new Custom API and take note of the "identifier" (or **API Audience**).

OK, now it's time to actually use all the values you noted down and apply them as environment variables.

For the `web` we need to provide the following variables:

```sh
# The base url of your application
AUTH0_BASE_URL='http://localhost:3000'
# Your Auth0 application's Client ID
AUTH0_CLIENT_ID='YOUR_AUTH0_CLIENT_ID'
# Your Auth0 application's Domain
AUTH0_DOMAIN='https://YOUR_AUTH0_DOMAIN.auth0.com'
# Your Auth0 Custom API Audience
AUTH0_AUDIENCE='YOUR_AUTH0_AUDIENCE'
# Your Auth0 application's Client Secret
AUTH0_CLIENT_SECRET='YOUR_AUTH0_CLIENT_SECRET'
# The url of your Auth0 tenant domain
AUTH0_ISSUER_BASE_URL='https://YOUR_AUTH0_DOMAIN.auth0.com'
# A long, secret value used to encrypt the session cookie
AUTH0_SECRET='LONG_RANDOM_VALUE'
```

You can execute the following command to generate a suitable string for the `AUTH0_SECRET` value:

```sh
node -e "console.log(crypto.randomBytes(32).toString('hex'))"
```

Next, let's configure the api `.env` file.
We need to provide the following variables:

```sh
# The Management API audience
AUTH0_M2M_AUDIENCE='YOUR_AUTH0_M2M_AUDIENCE'
# The url of your Auth0 tenant domain
AUTH0_M2M_BASE_URL='https://YOUR_AUTH0_DOMAIN.auth0.com'
# Your Auth0 M2M application's Client ID
AUTH0_M2M_CLIENT_ID='YOUR_AUTH0_CLIENT_ID'
# Your Auth0 M2M application's Client Secret
AUTH0_M2M_CLIENT_SECRET='YOUR_AUTH0_CLIENT_SECRET'
# Your Auth0 M2M application's Domain
AUTH0_M2M_DOMAIN='https://YOUR_AUTH0_DOMAIN.auth0.com'
# Your Auth0 M2M application's Token URL
AUTH0_M2M_TOKEN_URL='YOUR_AUTH0_TOKEN_URL' # Normally will be your Auth0 tenant domain with /oauth/token appended

# Your Auth0 Custom API Audience
AUTH0_JWT_AUDIENCE='YOUR_AUTH0_AUDIENCE'
# Your Auth0 application's Domain
AUTH0_JWT_DOMAIN='https://YOUR_AUTH0_DOMAIN.auth0.com'
```

### Twilio and SendGrid

To notify users about events this platform allows sending of notifications via emails and/or text messages (SMS/WhatsApp) This platform currently supports email via "SendGrid" and uses "Twilio" to send text messages (SMS) and WhatsApp messages.

You can enable all of them or choose which messaging options you want to enable.

To enable the "SendGrid" provider, provide the following config in the `.env` file:

```sh
SENDGRID_ENABLE=true
SENDGRID_API_KEY=[API_KEY]
SENDGRID_FROM=[email@myhost.com]
```

You'll have to create an account [here](https://sendgrid.com/) (free tier is available) and get yourself an [API key](https://docs.sendgrid.com/ui/account-and-settings/api-keys#creating-an-api-key) and either authenticate a [domain](https://docs.sendgrid.com/ui/account-and-settings/how-to-set-up-domain-authentication) or [single sender](https://docs.sendgrid.com/ui/sending-email/sender-verification).
Use the email address you authenticated as the `SENDGRID_FROM` value.

To enable "Twilio" text messages (SMS), provide the following config in the `.env` file:

```sh
# Account credentials
#
TWILIO_ACCOUNT_SID=[ACCOUNT_SID]
TWILIO_AUTH_TOKEN=[AUTH_TOKEN]

# SMS configuration
#
TWILIO_SMS_ENABLE=true
TWILIO_SMS_FROM=[PHONE_NUMBER]
```

You'll have to create an account [here](https://www.twilio.com/try-twilio) (trial account with free credits available) and [go through their setup process](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account) so you can get the `ACCOUNT_SID` and `AUTH_TOKEN` which are necessary to send messages via this provider.

To enable "Twilio" WhatsApp messages, provide the following config in the `.env` file:

```sh
# Account credentials
#
TWILIO_ACCOUNT_SID=[ACCOUNT_SID]
TWILIO_AUTH_TOKEN=[AUTH_TOKEN]

# WhatsApp configuration
#
TWILIO_WHATSAPP_ENABLE=true
TWILIO_WHATSAPP_FROM=[FROM_WHATSAPP]
```

You'll have to create an account [here](https://www.twilio.com/try-twilio) and [go through their setup process](https://www.twilio.com/docs/usage/tutorials/how-to-use-your-free-trial-account) so you can get the `ACCOUNT_SID` and `AUTH_TOKEN` which are necessary to send messages via this provider. Next, you'll have to configure the number you bought to be able to be used by `WhatsApp`, read the documentation [here](https://www.twilio.com/docs/whatsapp/self-sign-up).

### Mapbox and Google Maps API

## Mapbox
---

To enable Mapbox which is used to display the different locations of the PLWD on the map you will need to get an access Token.
It is free until a certain amount of requests.
What you have to do is go to [Mapbox](https://mapbox.com/) and sign up with a new account if you don't already have one. Afterwards go into your account [Mapbox account](https://account.mapbox.com) and create an access token from the available button. You should just give it a name and you can create your token.
Once you have your token, you can copy it and parse it into the related env variable in your .env file.

```sh
NEXT_PUBLIC_MAPBOX_TOKEN=[MAPBOX_TOKEN]
```

## Google Maps API
---

The Google Maps API allows you to use the different location inputs across the platform. To be able to use it you will be also required to create a token.
For this you can visit the [Google Maps Platform](https://mapsplatform.google.com/).
Create an account if not already done (you will need gmail account). Once done click on start and it will redirect you to the Google Cloud Console.
From there you'll have to create a billing account (you can create a free trial but your payment method will still be required).
After the account is create visit the credentials tab to see your api key for Google Maps that you can then insert in your .env file.

```sh
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=[GOOGLE_MAPS_API_KEY]
```

## Postgis
---

This project uses [postgis](https://postgis.net/) for calculating distances and storing coordinates within postgres.

There are multiple ways to get such a container up-and-running but we're going to use Docker and docker-compose.

> If you're using Apple silicon you'll need to build the image yourself since postgis does not host any ARM-64 builds on their Docker repository yet. Read [here](#postgis-bis-apple-silicon) how to do this.

Make sure that `POSTGRES_DB`, `POSTGRES_PASSWORD`, `POSTGRES_USER`, `POSTGRES_HOST` and `POSTGRES_PORT` in the `.env` file are correctly set before continuing - for local development the values specified in the `.env.template` should suffice to get started.

Next, run the command below in your terminal:

```sh
# Pulls a postgis image and starts the container
docker-compose up
```

>The first time executing this command you could get a warning from Docker that the volume folder is missing - you can dismiss this by typing `y[es]` in the terminal.

After a few seconds the container should be up-and-running - you should see a `database system is ready to accept connections` log statement that confirms this. The container's volume data is stored in a `.volumes` folder.

### Postgis (Apple silicon)
---
Postgis does not have an official ARM build for the docker image available on their Docker repository (see: https://github.com/postgis/docker-postgis/issues/216).

To circumvent this issue you can build the image yourself as described below.

```sh
# Clone the repository locally
> git clone git@github.com:postgis/docker-postgis.git
> cd postgis

# This project uses postgres@11 and postgis@3.2
> cd 11-3.2
> docker build -t postgis/postgis:11-3.2-alpine -f Dockerfile .

# Finally run a container based on the built image
> docker-compose up
```

### API application
---
Finally, we're going to start up the actual application.

If you're using `nvm` then you can execute the following command to make sure that you use the minimum required NodeJS version that this project requires.

```sh
nvm use
```

Otherwise make sure that the latest NodeJS 16-lts version is available on your machine (as specified in the requirements).

Next, run the following 2 commands to get the api application started.

```sh
npm install
npm run dev
```

If all went well you should see the following appear in the terminal: `Development Server Started`.

Great, the api is now up-and-running!
### Web application
> TODO

## Documentation
---

### Testing

This project includes some integration tests, you can find them [here](./src/__integration_tests__/).
These tests use jest as their test-runner and [testcontainers](https://github.com/testcontainers/testcontainers-node#readme) to spin up a fresh postgis container for each test suite.

The environment variables used by the tests are configured [here](./.jest/setEnvVars.js).

You can run the tests via the command below:
```shell
npm run test
```

## Contributing
Please refer to the [CONTRIBUTING.MD](./CONTRIBUTING.md) file in this repo for how to contribute.

## Code of conduct
Please refer to the [CODE_OF_CONDUCT.MD](./CODE_OF_CONDUCT.md) file in this repo for the code of conduct.

## License
---
See [License](./LICENSE)
