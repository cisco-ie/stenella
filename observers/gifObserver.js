const calendarEvents = require('../controllers/eventController').observable;
const AdministerCalendars = require('../services/AdministerCalendars');
var SpotifyWebApi = require('spotify-web-api-node');
// credentials are optional
var spotifyApi = new SpotifyWebApi({
  clientId : 'fc3801a4e4d34067a09e16a655bfdb88',
  clientSecret : '5e537ade305d45adb8ff02df03dddd4d',
  redirectUri : 'http://www.example.com/callback'
});

calendarEvents.subscribe(PMRUrls);

// Find a way to implement exit logic of updating existing event
function PMRUrls (calendarEvent) {
	if (calendarEvent.summary.match(/@spotify/i)) {
		if (calendarEvent.status === 'confirmed') {
			if (calendarEvent.description) {
				if (calendarEvent.description.indexOf('Get Your') > 0) return;
			}

			spotifyApi.clientCredentialsGrant()
				.then(function(data) {
					// Save the access token so that it's used in future calls
					spotifyApi.setAccessToken(data.body['access_token']);

					const startIndex = calendarEvent.summary.indexOf('@spotify:');
					const endIndex = calendarEvent.summary.length;
					const searchString = calendarEvent.summary.substring(startIndex, endIndex);
					// Do search using the access token
					spotifyApi.searchTracks(searchString)
						.then(function(data) {
							const track = data.body.tracks.items[0];
							const existingDescription = (calendarEvent.description) ? calendarEvent.description : '';
							const updateInfo = {
								description: `${existingDescription}
=== Get Your 🎧 🎶  On ===
${track.name}
Listen Here: ${track.external_urls.spotify}`,
								colorId: 10
							};
				
							const updatedEvent = Object.assign({}, calendarEvent, updateInfo);

							AdministerCalendars.updateEvent({
								calendarId: calendarEvent.calendarId,
								eventId: calendarEvent.id
							}, updatedEvent)
								.then(() => console.log('updated'))
								.catch(console.log);

						}, function(err) {
							console.log('Something went wrong!', err);
						});
				}, function(err) {
					console.log('Something went wrong when retrieving an access token', err);
				});
		}
	}
}
