const express = require('express');
const cors = require('cors');
const SpotifyWebApi = require('spotify-web-api-node');
const dotenv = require('dotenv');
const querystring = require('querystring');
const session = require('express-session');
const axios = require('axios');

dotenv.config();

const app = express();
// Set up the session middleware
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: true
    })
);

app.use(express.json());
app.use(cors());

const clientId = process.env.CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

const spotifyAuthUrl = 'https://accounts.spotify.com/authorize';
const spotifyTokenUrl = 'https://accounts.spotify.com/api/token';
const youtubeApiKey = process.env.YOUTUBE_API_KEY;
const youtubeApiUrl = 'https://www.googleapis.com/youtube/v3/playlistItems';

// Set up the Spotify API client
const spotifyApi = new SpotifyWebApi({
    clientId: clientId,
    clientSecret: clientSecret,
    redirectUri: redirectUri
});

// Set up the route for the authentication button
app.get('/auth', (req, res) => {
    // Redirect the user to the Spotify authentication page
    const scope = 'playlist-modify-public playlist-modify-private';
    res.redirect(
        spotifyAuthUrl +
        '?' +
        querystring.stringify({
            client_id: clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scope,
            session: req.session
        })
    );
});

// Set up the route for the authentication callback
app.get('/callback', async (req, res) => {
    // Exchange the authorization code for an access token
    const code = req.query.code;
    const data = await spotifyApi.authorizationCodeGrant(code);
    try {
        // Save the access token to the session
        req.session.accessToken = data.body.access_token;

        // Set the access token on the Spotify API client
        spotifyApi.setAccessToken(data.body.access_token);

        // Redirect the user back to the main page
        res.redirect('http://localhost:3000');
    } catch (error) {
        res.status(500).send(error);
        console.log(error)
    }
});

// Set up the route for migrating a YouTube playlist
app.post('/migrate', async (req, res) => {
    // Check if the user is authenticated
    if (req.session === undefined) {
        return res.status(500).send("Session not found");
    }
    if (!req.session.accessToken) {
        return res.status(401).send('Unauthorized');
    }

    // Get the playlist ID and name from the request body
    const youtubePlaylistId = req.body.youtubePlaylistId;
    const spotifyPlaylistName = req.body.spotifyPlaylistName;

    // Get the list of videos in the YouTube playlist
    let remaining = 9999;
    let videos = []
    let nextPageToken = null;
    while (remaining > 0) {
        const youtubeResponse = await axios.get(youtubeApiUrl, {
            params: {
                key: process.env.YOUTUBE_API_KEY,
                part: 'snippet',
                playlistId: youtubePlaylistId,
                maxResults: 50,
                pageToken: nextPageToken
            }
        });
        nextPageToken = youtubeResponse.data.nextPageToken;
        if (remaining === 9999) remaining = youtubeResponse.data.pageInfo.totalResults;
        remaining -= youtubeResponse.data.items.length;
        videos.push(...youtubeResponse.data.items);
    }
    // Create a new playlist on Spotify
    const spotifyResponse = await spotifyApi.createPlaylist(
        'me',
        {
            name: spotifyPlaylistName,
            public: true
        }
    );
    const spotifyPlaylistId = spotifyResponse.body.id;
    let tracks = [];
    // Add the videos to the Spotify playlist
    for (youtubeVideo of videos) {
        let youtubeVideoTitle = youtubeVideo.snippet.title + ' ' + youtubeVideo.snippet.videoOwnerChannelTitle;
        youtubeVideoTitle = youtubeVideoTitle.replace(/\[.*\]/, "");
        youtubeVideoTitle = youtubeVideoTitle.replace(" - Topic", "");
        const spotifyResponse = await spotifyApi.searchTracks(youtubeVideoTitle, {
            limit: 1,
            type: "track,album"
        });
        const spotifyTrack = spotifyResponse.body.tracks.items[0];
        if (spotifyTrack !== undefined) tracks.push(spotifyTrack.uri);
    }
    // Add the tracks to the Spotify playlist
    await spotifyApi.addTracksToPlaylist(spotifyPlaylistId, tracks)
        .catch(err => {
            res.status(500).send(err);
        });


    res.send('Playlist migrated successfully');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Running on port ${PORT}`));
