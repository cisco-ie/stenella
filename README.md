# Google Calendar Listener
> A reactive application for calendar events created within a [G Suite](https://gsuite.google.com/).

![Google Calendar Listener Demo](http://g.recordit.co/uBCEUMWD4N.gif)

This application responds to particular calendar events based on user defined contextual cues found within a typical event payload *(date, subject, summary, attendees, location, status, etc.)*. In addition, observers *(calendar event handlers)* are open-ended and flexible enough to allow the developer to define appropriate actions.

> :warning:  **ES6 Migration**
> 
> The current code base is still in the process of migrating from ES5 to ES6, so please bear with us as we finish this process.

## Features
- An easy to use, and straightforward API to hook into event notifications
- Re-processing of any missed events during downtime as long as calendar subscriptions (env.TTL) is still valid
- A MongoDB hooks for observers for more complicated task
- Prune of old/stale events within a series of events -- essentially your observer will only recieve the latest event in time, so no need to handle intermediate updates/cancellations within a short period of time

## Requirements
- G Suite (Google Apps for Work)
- Admin privileges within a G Suite
- MongoDB
- A publicly available server

## Set Up
1. [Verify](https://support.google.com/webmasters/answer/35179?authuser=0) your application's domain name ownership
    
    Verification of the application domain name with Google proves that you own/trust it. This enables the application to handle Google calendar notifications. `google-calendar-listener` provides a `/verify` directory where you can simply drop your `verification.html` files into it and it will be publicly available to Google verfication servers.

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
4. Clone the repository: `git clone https://github.com/cisco-ie/google-calendar-listener/`
5. Download the application's dependencies:    
    `$ npm install`
6. Copy the `example.env` to `.env` and set up the variables
7. Create an [observer](#observer-usage) to respond to calendar events
8. Start the application:    
    `$ npm start`

## Observer Usage
[Observers](http://reactivex.io/rxjs/class/es6/MiscJSDoc.js~ObserverDoc.html) respond to incoming notifications for newly created events. Since observers operate independently from each other, it's important to avoid having multiple observers manipulate or update the same event to prevent unexpected bugs.

1. Create an observer file within the `/observers` directory
2. Import the observable object from the event controller. The observable will provide notifications when new calendar events have been created.   
   ```
   const calendarEvents = require('../controllers/eventController').observable;
   ```
3. Once you have access to an observable, you need to subscribe a handler to the observable for event notifications.
   ```
   calendarEvents.subscribe((event) => {
      // Do work based on event notifications
   });
   ```
4. Start the application, and the application will import the observer at runtime.
5. Want to see a working example? Checkout the [`exampleObserver`](/observers/exampleObserver.js), which logs the users who have "PTO" in their calendar title.

## Authors
- [Brandon Him](https://github.com/brh55/)
- [Rekha Rawat](https://github.com/rekharawat)
- [Innovation Edge Team @ Cisco](https://github.com/cisco-ie)

## Contributing
:octocat: PR's are welcomed. Please, submit an issue prior to getting started to see how others can assist in determining implementation details.

Prior to submitting PRs: `$ npm test`

## License
MIT © [Innovation Edge @ Cisco](https://github.com/cisco-ie/google-calendar-listener)
