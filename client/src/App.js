// App.js
import React, { useState } from 'react';
import axios from 'axios';

function App() {
  // Set up the state for the form values and error messages
  const [youtubePlaylistId, setYoutubePlaylistId] = useState('');
  const [spotifyPlaylistName, setSpotifyPlaylistName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Set up the event handler for the authentication button
  const handleAuthClick = () => {
    document.location.href = 'http://localhost:5000/auth';
  };

  // Set up the event handler for the migration form
  const handleMigrateSubmit = e => {
    e.preventDefault();

    // Validate the form values
    if (!youtubePlaylistId || !spotifyPlaylistName) {
      setErrorMessage('Please enter a YouTube playlist ID and a Spotify playlist name');
      return;
    }

    // Send the request to the server to migrate the playlist
    axios
      .post('/migrate', {
        youtubePlaylistId: youtubePlaylistId,
        spotifyPlaylistName: spotifyPlaylistName
      })
      .then(response => {
        // Clear the form values and error message
        setYoutubePlaylistId('');
        setSpotifyPlaylistName('');
        setErrorMessage('');

        // Show a success message
        alert('Playlist migrated successfully');
      })
      .catch(error => {
        // Show the error message
        setErrorMessage(error.response.data);
      });
  };

  // Render the page content
  return (
    <div>
      <h1>YouTube to Spotify Playlist Migrator</h1>
      <button onClick={handleAuthClick}>Authenticate with Spotify</button>
      <form onSubmit={handleMigrateSubmit}>
        <label htmlFor="youtube-playlist-id">
          YouTube Playlist ID:
          <input
            id="youtube-playlist-id"
            type="text"
            value={youtubePlaylistId}
            onChange={e => setYoutubePlaylistId(e.target.value)}
          />
        </label>
        <br />
        <label htmlFor="spotify-playlist-name">
          Spotify Playlist Name:
          <input
            id="spotify-playlist-name"
            type="text"
            value={spotifyPlaylistName}
            onChange={e => setSpotifyPlaylistName(e.target.value)}
          />
        </label>
        <br />
        <button type="submit">Migrate Playlist</button>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
      </form>
    </div>
  )
}

export default App;