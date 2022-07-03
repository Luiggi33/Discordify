var SpotifyWebApi = require('spotify-web-api-node');
const client = require('discord-rich-presence')('924324822421471242');
var lastSong = "";
var lastlyrics = [];
var count = 0;

const dotenv = require('dotenv');
dotenv.config();

const request = require('request');

var spotifyApi = new SpotifyWebApi({
  clientId: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  redirectUri: 'https://getyourspotifyrefreshtoken.herokuapp.com/callback',
  refreshToken: process.env.REFRESH_TOKEN,
  accessToken: process.env.ACCESS_TOKEN,
});

console.log("Get your Tokens on https://getyourspotifyrefreshtoken.herokuapp.com/");

function refreshToken() {
  spotifyApi.refreshAccessToken().then(
    function (data) {
      spotifyApi.setAccessToken(data.body['access_token']);
      console.log('The access token has been refreshed!');
    },
    function (err) {
      console.log('Could not refresh access token', err);
    }
  );
}

refreshToken();

setInterval(refreshToken, 60000);

setInterval(function () {
  spotifyApi.getMyCurrentPlaybackState().then(function (data) {
    if (data.body.item == null) { return; }
    if (data.body.item.name != lastSong) {
      curTime = Date.now();
      lastSong = data.body.item.name;
      artistO = data.body.item.artists[0].name;
      artist = artistO.replace(/ /g, '%20');
      song = data.body.item.name.replace(/ /g, '%20');
      url = 'https://api.lyrics.ovh/v1/' + artist + '/' + song;
      r = request(url, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var lyrics = JSON.parse(body).lyrics.split('\n');
          if (lyrics[0].startsWith('Paroles de la chanson')) {
            lyrics = lyrics.slice(1);
          }
          for (var i = 0; i < lyrics.length; i++) {
            lyrics[i] = lyrics[i].trim();
          }
          console.log('Lyrics found');
          lastlyrics = lyrics;
        } else {
          lastlyrics = 'No Lyrics found';
        }
      });
      count = 0;
      console.log("New Song " + data.body.item.name);
    }
  });
}, 300);

setInterval(function () {
  if (lastlyrics == undefined || lastlyrics == "" || lastlyrics == "No Lyrics found") {
    client.updatePresence({
      details: 'No Lyrics found',
      state: lastSong + ' by ' + artistO,
      largeImageKey: 'spotfy',
      largeImageText: 'Spotify',
      smallImageKey: 'play',
      smallImageText: 'Playing',
      startTimestamp: curTime,
      instance: false,
    });
    return;
  }
  if (lastlyrics.length > 0) {
    if (lastlyrics[count] == "") {
      setTimeout(function () {
        count++;
      }, 1000);
    } else {
      setTimeout(function () {
        client.updatePresence({
          details: lastlyrics[count],
          state: lastSong + ' by ' + artistO,
          largeImageKey: 'spotfy',
          largeImageText: 'Spotify',
          smallImageKey: 'play',
          smallImageText: 'Playing',
          startTimestamp: curTime,
          instance: false,
        });
        count++;
        if (count >= lastlyrics.length) {
          count = 0;
        }
      // This calculation really needs to be improved
      // it works, but it's not very accurate
      }, 5000 / lastlyrics[count].length);
    }
  }
}, 3000);

spotifyApi.getMyCurrentPlaybackState().then(function (data) {
  if (data.body.item == null) {
    return;
  }
  client.updatePresence({
    details: 'Listening to ' + data.body.item.name,
    state: 'by ' + data.body.item.artists[0].name,
    largeImageKey: 'spotfy',
    startTimestamp: Date.now(),
    instance: true,
  });
  count = 0;
});