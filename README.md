** This project is no longer being maintained, please use at your own discretion! **
<p align="center">
  <br><br><br>
  <img src="https://user-images.githubusercontent.com/6020066/31189551-69a44eb0-a8ed-11e7-930a-675f0dcbe5f0.png">
  <br><br><br>
</p>

> Reactive application that listens on Google calendars within a [G Suite](https://gsuite.google.com/) with the ability to process business logic

- - -
> 🚨 This project is no longer being actively maintained, and remains as provided as good will for public consumption. Please use at your own discretion.

[![Build Status](https://img.shields.io/travis/cisco-ie/stenella.svg?style=flat-square)](https://travis-ci.org/cisco-ie/stenella) [![license](https://img.shields.io/github/license/cisco-ie/stenella.svg?style=flat-square)]() [![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg?style=flat-square)](https://github.com/sindresorhus/xo) [![Coveralls branch](https://img.shields.io/coveralls/cisco-ie/stenella/master.svg?style=flat-square)](https://coveralls.io/github/cisco-ie/stenella)

`stenella` is an unofficial, server-to-server, Node.js application that listens to Google calendars events that are created, deleted, or updated. With each event, developers can define and execute their own business logic in regards to contextual cues found within a calenader event payload *(date, subject, summary, attendees, location, status, etc.)*. These are known as "observers" *(calendar event handlers)*, which are flexible, open-ended, and simple to write.

![Google Calendar Listener Demo](http://g.recordit.co/uBCEUMWD4N.gif)

> 🌟
> 
> The demo above displays the application receiving a calendar event being created, which is logged to the console in real-time

## Contents

  * [Features](#features)
  * [Requirements](#requirements)
  * [Installation](#installation)
      * [Setting Up A Google Developer App](#setting-up-a-google-developer-app)
      * [Setting Up Stenella](#setting-up-stenella)
  * [Deployment](#deployment)
      * [Standard](#standard)
      * [Docker](#docker)
          * [Configure Docker](#configure)
          * [Start Docker](#start)
  * [Configuration](#configuration)
  * [Google API Usage](#google-api-usage)
  * [Observers](#observers)
      * [Create an Observer](#create-an-observer)
      * [Best Practices](#best-practices)
  * [Restricting Users](#restricting-users)
  * [Authors](#authors)
  * [Contributing](#contributing)
  * [License](#license)

## Features
Along with listening to a Google calendar, `stenella` provides the following features and performs additional heavy work:
- Ability to manually set users to listen
- Automatically renew listening channels with Google
- An easy to use, and straightforward way to implement observers
- Handles the complexities of processing events to `observers`:
    - Events created, deleted, or updated within a short period of time will cause the application to only process the most recent change
    - The application will prevent any duplicated events being processed twice within a cached time
    - An event with "Guests Can Modify" will only process the most recent event received, and will only process new changes
    - Events with multiple guests will only be regarded as one unique event for `observers`
- Includes a `Dockerfile`, along with `docker-compose` files for easier deployment examples
- Automatically listens to newly created users within a organization
- A means to verify domains with Google and to remain verified throughout the life of the application

## Requirements
- G Suite *(Previously known as Google Apps for Work)*
- Admin privileges within a G Suite
- MongoDB
- A publicly available server with a domain

## Installation
### Setting Up a Google Developer App
1. [Verify](https://support.google.com/webmasters/answer/35179?authuser=0) your application's domain name ownership

    Verification of the application domain name with Google proves that you own/trust it. This enables the application to handle Google calendar notifications. `stenella` provides a `/verify` directory where you can simply drop your `verification.html` files into it and it will be publicly available to Google verfication servers.

2. Create a Google App
    1. Go to the **Google API Console**
    2. From the project drop-down, select *Create a New Project*
    3. Select **Dashboard Menu** and click *Enable API*
    4. Select the *Google Calendar API* under **Google Apps API**. This enables the application to use the Google Calendar API.
    5. Go to the **IAM & Admin** view (click on left hamburger icon)
    6. Select **Service Account** > *CREATE SERVICE ACCOUNT*
    7. Enter a service account name, leave the role blank, and **check Enable G Suite Domain-wide Delegation**
    8. Check *Furnish a new private key*: Key Type: JSON > Create
        > This will automatically download a private key to your computer. This is the only copy of the key, so store it in a secure manner and ensure that it is accessible to the application.
    9. Go to the **API Manager** view, select the **Credentials** menu
    10. Select the **Domain Verification** tab, click *Add Domain* and add your domain that was verified in **Step 1**

### Setting Up Stenella
> ⚠️  Please complete the appropriate Google permissions and steps before moving on with Stenella

1. Download repository and install dependencies
    ```sh
    $ git clone https://github.com/cisco-ie/stenella.git && cd stenella
    $ npm install
    ```
2. Configure environment variables, refer to [configuration](#configuration) for more details
    ```
    $ cp example.env .env
    ```

## Deployment
### Standard
1. Setup the [MongoDB database](https://docs.mongodb.com/manual/installation/?jmp=footer)
2. Initiate Mongodb, `mongod`
3. Start up application, `$ npm start`
4. Go to `https://<YOUR_DOMAIN>:<?PORT>` *(localhost if you have not pointed the domain)* and you should see a `Calendar Listener Works!`

### Docker
Before running docker-compose, ensure an `.env` file is properly populated with correct configurations. The `/containers` directory contain different deployment examples:
- **/containers/** - A base deployment which includes mongodb, stenella
- **/containers/nginx** - An advance deployment which includes a mongodb, stenella, and nginx

#### Configure
- `DB_URL` should be set to `mongodb://database/<databaseName>`
-  Within the compose file, `volumes` should mount the location of your service token. 
    *e.g.*
    ```yaml
    volumes:
      - ../path/to/token:/app/secret
    ```

#### Start
To bring up docker containers:
```bash
$ cd [containers or containers/nginx]
$ docker-compose up
```

Validate that the application is exposed and running by checking the localhost, it should respond with `Google Listener Works!`
- **Base depoyment:** https://localhost:5000
- **With Nginx** https://localhost:5001

## Configuration
Stenella includes various configurations that are managed within the `.env` file of the application or environment variables set within shell of the application instance. Please refer to the table below, or the [`example.env`](/master/example.env) file.

| **ENV Variable**               | **Required** | **Description**                                                                                                                                 |
|--------------------------------|--------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| ADMIN                          | ✅            | A G Suite admin for the application to act as proxy for                                                                                         |
| DOMAIN                         | ✅            | The domain associated with the Google organization                                                                                              |
| CUSTOMER                       | ✅            | A `customerId` for organizations with multiple domains, the application will only run across that customerId                                    |
| RECEIVING_URL                  | ✅            | The public server url for Google to send notifications, and authorize API calls from                                                            |
| DB_URL                         | ✅            | The primary mongodb location of where stenella will store information regarding calendar subscriptions                                          |
| DB_URL_TEST                    | 🚫           | This is an mongodb location where the test suite would run it's associated file. It should be different from `DB_URL`                           |
| GOOGLE_APPLICATION_CREDENTIALS | ✅            | The path containing the Google service JSON web token, this should also be granted delegated permissions                                        |
| PRIVATE_KEY_PATH               | 🚫           | If you want to run SSL on the application server, this path should point to the private key (.pem).                                             |
| FULL_CHAIN_CERT_PATH           | 🚫           | To run SSL on the application server, this path should point to the full chain certificate (.pem).                                              |
| CERT_PASSPHRASE                | 🚫           | Required if the cert was generated using a passphrase, insert the passphrase here.                                                              |
| USER_WHITELIST_PATH            | 🚫           | A JavaScript file containing an array of emails for the application to listen on                                                                |
| TTL                            | 🚫           | A "time-to-live" in ms for user subscriptions -- how long to keep the subscription open with google before renewing. Default: 1500 ms (25 mins) |

## Google API Usage
While `stenella` is using several Google APIs, it heavily relies on Google Calendar API. In most scenarios, we don't believe this will exceed the **1,000,000 / day** quota, but large organizations *(> 10,000)* with significant amount of users should account for additional cost associated with [API usage](https://developers.google.com/google-apps/calendar/pricing).

#### API Calls Breakdown
| Action                            | # of API Request              |
| --------------------------------- | ----------------------------- |
| Start Up                          | ***1** / User*                |
| Updated, Cancelled, Created Event | ***1** / Attendee & Creator*  |
| Renewing Calendar Subscription    | ***1** / User*                |

## Observers
> If you are not familar with `observers`, please check out the rx.js documentation on [`observers`](http://reactivex.io/rxjs/class/es6/MiscJSDoc.js~ObserverDoc.html)

`Observers` give you the flexibility to create your own set of business logic in respose to events. Within `stenella`, `observers` are simply functions that receieve the event payload.

### Create an Observer
1. Create a new file within the `/observers` directory

    > 💡 All observers are loaded from the `/observers` directory, no configuration needed.

2. Within your file, import the observable object from the event controller to allow the observer to subscribe to new calendar events.
   ```
   const calendarEvents = require('../controllers/event-controller').observable;
   ```
3. Now subscribe to events, and write your own handler to perform any logic
   ```
   calendarEvents.subscribe((event) => {
      // Do work based on particular conditions
   });
   ```
4. Start the listener and your `Observer` will now be invoked upon calendar event notifications

Refer to the example observer within the `/observers` directory for coding reference.

### Best Practices
- Avoid multiple observers processing for the same condition
- Include a means to indicate a change was caused by your observer as `stenella` is unaware of any events created, deleted, or updated by observers
- For every update done on an event, this will count as 1 API call and + (1 * `X` # Attendees) since this will count as a theoretical new event

## Restricting Users
Restrict the calendar to only listen on a subset of users by exporting a JavaScript array of emails to only listen to and set the `USER_WHITELIST_PATH` to the path of the JavaScript file.

Example: `exampleList.js`
```js
module.exports = [
  "testuser1@gmail.com",
  "testuser2@gmail.com"
];
```

Setting the environment variable:
```
USER_WHITELIST_PATH=./exampleList.js
```

## Authors
- [Brandon Him](https://github.com/brh55/)
- [Rekha Rawat](https://github.com/rekharawat)
- [Innovation Edge Team @ Cisco](https://github.com/cisco-ie)

## Contributing
We know `Stenella` is far from perfect, so we are excited to build upon our existing work with other community members. With that said, please submit an issue prior to getting started to avoid duplicated effort.

For additional developer docs, refer to the [Wiki's Development Docs](https://github.com/cisco-ie/stenella/wiki/Development-Docs).

## Questions
Feel free to submit a issue for any questions in regards to bugs, deployment, details, etc.

## License
Apache License 2.0 © [Innovation Edge @ Cisco](https://github.com/cisco-ie/stenella)
