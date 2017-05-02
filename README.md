# Google Calendar Listener
Respond to events and create actions in response to calendar events created within a Google suite.

## Requirements
- G Suite (Google Apps for Work)
- Admin priviledges within a G Suite
- MongoDB
- A publicly available server with a URL

## Observer Usage
Observers respond to incoming notification of newly created events. Since they operate independently from each other, it's important to avoid having multiple observers manipulate or update the same event to prevent unexpected bugs.

1. Create an observer file within the `/observers` directory.
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


## Contributors
- [Brandon Him](https://github.com/brh55/)
- [Rekha Rawat](https://github.com/orgs/cisco-ie/people/rekharawat)
- [Innovation Edge Team @ Cisco](https://github.com/cisco-ie)

## License
MIT
