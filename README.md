# Google Calendar Listener
> Respond to events and create actions in response to calendar events created within a Google suite.

This primarily allows the application to respond to particular calendar events based on contextual cues found within a typical event payload *(date, subject, summary attendees, location, status, etc)*. In addition, observers, calendar event responders, are open-ended and flexible enough to allow the developer to perform whatever is necessary.

## Requirements
- G Suite (Google Apps for Work)
- Admin priviledges within a G Suite
- MongoDB
- A publicly available server with a URL

## Set Up
1. [Verify](https://support.google.com/webmasters/answer/35179?authuser=0) your application domain ownership
    
    Verification of the application domain with google proves that you own/trust it. This enables the application to handle Google calendar notifications.

2. Create a Google App
    1. Go to Google API Console
    2. From the project drop-down, select Create a New Project
    3. Select Dashboard Menu and click Enable API
    4. Select Google calendar API under Google Apps API category. This enables the Google Calendar API for the application.
    5. Go to the IAM & Admin view (click on left hamburger icon)
    6. Select Service Account > **CREATE SERVICE ACCOUNT**
    7. Enter a service account name, leave the role blank, and check Enable G Suite Domain-wide Delegation
    8. Check Furnish a new private key: Key Type: JSON > Create
        > This will automatically download a Private Key to your computer. This is the only copy of the key, so store it in a securely manner and ensure that it is accessible to the application.
    9. Go to the **API Manager** view, select the **Credentials** menu.
    10. Select the Domain verification tab, click Add domain and add your domain that was verified in Step 1
3. Setup the [MongoDB database](https://docs.mongodb.com/manual/installation/?jmp=footer)
4. Clone repository: `git clone https://github.com/cisco-ie/google-calendar-listener/`
5. Download application dependencies:    
    `$ npm install`
6. Copy the `example.env` to `.env` and set up the variables
7. Create an [observer](#observer-usage) to respond to calendar events
8. Start the application:    
    `$ npm start`

## Observer Usage
Observers respond to incoming notification of newly created events. Since they operate independently from each other, it's important to avoid having multiple observers manipulate or update the same event to prevent unexpected bugs.

1. Create an observer file within the `/observers` directory
2. Import the observable from the event controller. The observable will provide notifications for when new calendar events have been created.   
   ```
   const calendarEvents = require('../controllers/eventController').observable;
   ```
3. Once you have access to an observable, you need to subscribe a handler for the event notifications.
   ```
   calendarEvents.subscribe((event) => {
      // Do work based on event
   });
   ```
4. Start the application, and you'll application import the observer at run-time.

## Contributors
- [Brandon Him](https://github.com/brh55/)
- [Rekha Rawat](https://github.com/orgs/cisco-ie/people/rekharawat)
- [Innovation Edge Team @ Cisco](https://github.com/cisco-ie)

## License
MIT © [Innovation Edge @ Cisco](https://github.com/cisco-ie/google-calendar-listener)
