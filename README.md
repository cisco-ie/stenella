# Stenella 🐬✨
> Reactive application that listens on Google calendars within a [G Suite](https://gsuite.google.com/) with the ability to process business logic

`stenella` is an unofficial, server-to-server, Node.js application that listens to Google calendars events that are created, deleted, or updated. With each event, developers can define and execute their own business logic in regards to contextual cues found within a calenader event payload *(date, subject, summary, attendees, location, status, etc.)*. These are known as "observers" *(calendar event handlers)*, which are flexible, open-ended, and simple to write.

![Google Calendar Listener Demo](http://g.recordit.co/uBCEUMWD4N.gif)

> 🌟
> 
> The demo above displays the application receiving a calendar event being created, which is logged to the console in real-time

## Features
Along with listening to a Google calendar, `stenella` provides the following features and performs additional heavy work:
- Ability to manually set users to listen
- Automatically renew listening channels with Google
- An easy to use, and straightforward way to implement observers
- Re-process any missed events during downtime *(env.TTL)*
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

## Getting Started
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
3. Setup the [MongoDB database](https://docs.mongodb.com/manual/installation/?jmp=footer)
4. Clone the repository: `git clone https://github.com/cisco-ie/stenella/`
5. Download the application's dependencies:
    `$ npm install`
6. Copy the `example.env` to `.env` and set up the variables
7. Create an [observer](#observers) to respond to calendar events
8. Start the application:
    `$ npm start`

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

### Creating an Observer
1. Create a new file within the `/observers` directory

    > 💡 All observers are loaded from the `/observers` directory, no configuration needed.

2. Within your file, import the observable object from the event controller to allow the observer to subscribe to new calendar events.
   ```
   const calendarEvents = require('../controllers/eventController').observable;
   ```
3. Now subscribe to events, and write your own handler to perform any logic
   ```
   calendarEvents.subscribe((event) => {
      // Do work based on particular conditions
   });
   ```
4. Start the listener and your `Observer` will now be invoked upon calendar event notifications

### Observer Caveats and Tips
- Avoid multiple observers processing for the same condition
- Include a means to indicate a change was caused by your observer as `stenella` is unaware of any events created, deleted, or updated by observers
- For every update done on an event, this will count as 1 API call and + (1 * `X` # Attendees) since this will count as a theoretical new event

## Authors
- [Brandon Him](https://github.com/brh55/)
- [Rekha Rawat](https://github.com/rekharawat)
- [Innovation Edge Team @ Cisco](https://github.com/cisco-ie)

## Contributing
We know `Stenella` is far from perfect, so we are excited to build upon our existing work with other community members. With that said, please submit an issue prior to getting started to avoid duplicated effort.

## License
Apache License 2.0 © [Innovation Edge @ Cisco](https://github.com/cisco-ie/stenella)
