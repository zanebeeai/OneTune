const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-audio-analysis-playback-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = 'spotify-audio-analysis-playback-token-expires-in';

function parseHash(hash) {
  return hash
    .substring(1)
    .split('&')
    .reduce(function (initial, item) {
      if (item) {
        var parts = item.split('=');
        initial[parts[0]] = decodeURIComponent(parts[1]);
      }
      return initial;
    }, {});
}

document.addEventListener('DOMContentLoaded', () => {
  if (localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY) &&
      parseInt(parseInt(localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY))) > Date.now()) {
    window.location = "/analysis.html";
  } else {
    if(window.location.hash) {
      const hash = parseHash(window.location.hash);
      if (hash['access_token'] &&
          hash['expires_in']) {
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_KEY, hash['access_token']);
        localStorage.setItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY, Date.now() + 990 * parseInt(hash['expires_in']));
        window.location = "/analysis.html";
      }
    } 
    document.getElementById('login').addEventListener('click', function(e) {
      e.preventDefault();
      fetch('spotifyRedirectUri')
      .then(e => e.json())
      .then(data => {
        window.location = data.redirectUri;
      })
      .catch(error => { alert("Failed to prepare for Spotify Authentication")});
    });
  }
})
