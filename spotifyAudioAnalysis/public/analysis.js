 /* globals Spotify */
// client-side js
// run by the browser each time your view template is loaded

var player;

const LOCALSTORAGE_ACCESS_TOKEN_KEY = 'spotify-audio-analysis-playback-token';
const LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY = 'spotify-audio-analysis-playback-token-expires-in';
const accessToken = localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_KEY);
if(!accessToken || parseInt(localStorage.getItem(LOCALSTORAGE_ACCESS_TOKEN_EXPIRY_KEY)) < Date.now()) {
  window.location = '/';
}

let deviceId = '';

const colors = [
  'rgba(30,215,96, 0.9)',
  'rgba(245,115,160, 0.9)',
  'rgba(80,155,245, 0.9)',
  'rgba(255,100,55, 0.9)',
  'rgba(180,155,200, 0.9)',
  'rgba(250,230,45, 0.9)',
  'rgba(0,100,80, 0.9)',
  'rgba(175,40,150, 0.9)',
  'rgba(30,50,100, 0.9)'
]

var img = new Image;

function binaryIndexOf(searchElement, valueof, valueout) {
    'use strict';
 
    var minIndex = 0;
    var maxIndex = this.length - 1;
    var currentIndex;
    var currentElement;
 
    while (minIndex <= maxIndex) {
        currentIndex = (minIndex + maxIndex) / 2 | 0;
        currentElement = valueof(this[currentIndex]);
 
        if (currentElement < searchElement && ((currentIndex + 1 < this.length) ? valueof(this[currentIndex+1]) : Infinity) > searchElement) {
          return valueout(currentElement, currentIndex, this);
        }
        if (currentElement < searchElement) {
            minIndex = currentIndex + 1;
        }
        else if (currentElement > searchElement) {
            maxIndex = currentIndex - 1;
        }
        else {
            return this[currentIndex];
        }
    }
 
    return -1;
}

const getCurrentAndLastArrayLikes = (arrayLikes, time) => arrayLikes
  .map(arrayLike =>
       binaryIndexOf.call(arrayLike,
                          time,
                          e => e.start,
                          (element, index, array) => ([
                            array[index],
                            array[index > 0 ?
                                  index - 1 :
                                  0]
                          ])));

const getRowPosition =
      index => index === 0 ? 0 : 1 / index + getRowPosition(index-1);

const getFloorRowPosition =
  (searchPosition, rowHeight, i = 0, max = 5) => i > max ? max :
    searchPosition < (getRowPosition(i + 1) * rowHeight) ? i : getFloorRowPosition(searchPosition, rowHeight, i + 1, max);

function drawAnalysis(data) {
  const featuresChart = document.getElementById('features-chart');
  featuresChart.style.width = featuresChart.offsetWidth;
  featuresChart.width = featuresChart.offsetWidth * 2;
  featuresChart.style.height = featuresChart.offsetHeight;
  featuresChart.height = featuresChart.offsetHeight * 2;
  
  const width = featuresChart.width;
  const height = featuresChart.height;
  
  const ctx = featuresChart.getContext("2d");
  
  const arrayLikesEntries = Object.entries(data)
    .filter(entry => entry[1] instanceof Array)
    .sort((a, b) => a[1].length - b[1].length)
  
  const arrayLikesKeys = arrayLikesEntries
    .map(entry => entry[0]);
  const arrayLikes = arrayLikesEntries
    .map(entry => entry[1]);
  
  const rowHeight = height / arrayLikes.length;
  
  featuresChart.addEventListener('click', (clickEvent) => {
    
    const time = (clickEvent.offsetX/featuresChart.width) * data.track.duration * 2;
    
    console.log("arraylike: ", arrayLikes[getFloorRowPosition(clickEvent.offsetY * 2 , rowHeight)]);
    console.log("FloorPosition: ", getFloorRowPosition(clickEvent.offsetY * 2 , rowHeight));

    const kind = getFloorRowPosition(clickEvent.offsetY * 2 , rowHeight);
    const seekTime = binaryIndexOf.call(arrayLikes[kind], time, e => e.start, (element, index) => element);
    
    fetch(`https://api.spotify.com/v1/me/player/seek?position_ms=${Math.floor(seekTime*1000)}`, {
        method: "PUT",
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }).catch(console.log);
  });
  
  arrayLikes.forEach((arrayLike, arrayLikeIndex) => {
    const startY = getRowPosition(arrayLikeIndex) * rowHeight;
    const arrayLikeHeight = rowHeight / (arrayLikeIndex + 1);
    arrayLike.forEach((section, sectionIndex) => {
      ctx.fillStyle = colors[sectionIndex % colors.length];
      ctx.fillRect(section.start/data.track.duration*width,
                   getRowPosition(arrayLikeIndex) * rowHeight,
                   section.duration/data.track.duration*width,
                   arrayLikeHeight);
    });
    const label = arrayLikesKeys[arrayLikeIndex].charAt(0).toUpperCase() + arrayLikesKeys[arrayLikeIndex].slice(1)
    ctx.fillStyle = "#000";
    ctx.font = `bold ${arrayLikeHeight}px Circular`;
    ctx.fillText(label,0,startY + arrayLikeHeight);
  });
  const markerHeight = getRowPosition(arrayLikes.length) * rowHeight;
  function provideAnimationFrame(timestamp) {
    player && player.getCurrentState().then(state => {
      ctx.clearRect(0, 0, featuresChart.width, featuresChart.height);
      ctx.drawImage(img,0,0);
      ctx.fillStyle = "#000";

      const position = state.position/1000/data.track.duration*width
      ctx.fillRect(position-2,
                   0,
                   5,
                   markerHeight);
      
      

      const currentAndLastArrayLikes = getCurrentAndLastArrayLikes(arrayLikes, state.position/1000);
      const pitchChanges = currentAndLastArrayLikes[3][0].pitches.map((pitch, index) => Math.abs(pitch - currentAndLastArrayLikes[3][1].pitches[index]));
      const timbreChanges = currentAndLastArrayLikes[3][0].timbre.map((timbre, index) => Math.abs(timbre - currentAndLastArrayLikes[3][1].timbre[index]));
      
      // Pitch boxes
      const pitchBoxWidth = 60;
      ctx.strokeStyle = "#AAA";
      pitchChanges.forEach((pitchChange, i) => {
        ctx.fillStyle = `hsl(0, 0%, ${pitchChange * 100}%)`;
        ctx.fillRect(i*pitchBoxWidth,
                     height - 2 * pitchBoxWidth,
                     pitchBoxWidth,
                     pitchBoxWidth);
      });
      timbreChanges.forEach((timbreChange, i) => {
        ctx.fillStyle = `hsl(0, 0%, ${timbreChange * 100}%)`;
        ctx.fillRect(i*pitchBoxWidth,
                     height - 4 * pitchBoxWidth,
                     pitchBoxWidth,
                     pitchBoxWidth);
      });
      currentAndLastArrayLikes[3][0].pitches.forEach((pitchChange, i) => {
        ctx.fillStyle = `hsl(0, 0%, ${pitchChange * 100}%)`;
        ctx.fillRect(i*pitchBoxWidth,
                     height - pitchBoxWidth,
                     pitchBoxWidth,
                     pitchBoxWidth);
      });
      currentAndLastArrayLikes[3][0].timbre.forEach((pitchChange, i) => {
        ctx.fillStyle = `hsl(0, 0%, ${pitchChange * 100}%)`;
        ctx.fillRect(i*pitchBoxWidth,
                     height - 3 * pitchBoxWidth,
                     pitchBoxWidth,
                     pitchBoxWidth);
      });
      
      window.requestAnimationFrame(provideAnimationFrame);
    }).catch(e => {
      console.error("Animation: ", e);
      window.requestAnimationFrame(provideAnimationFrame);
    });
  }
  window.requestAnimationFrame(provideAnimationFrame);
  img.src = featuresChart.toDataURL('png');
}



function getAnalysis(id) {
  let query = '/analysis?id=' + id;
  
  return fetch(query).then(e => e.json()).then(data => {
    drawAnalysis(data);
    fetch(`https://api.spotify.com/v1/me/player/play${deviceId && `?device_id=${deviceId}`}`, {
        method: "PUT",
        body: JSON.stringify({"uris": [`spotify:track:${id}`]}),
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }).catch(e => console.error(e));
  });
}

function onSpotifyPlayerAPIReady() {
  player = new Spotify.Player({
    name: 'Audio Analysis Player',
    getOauthToken: function (callback) { callback(accessToken); },
    volume: 0.8
  });
  
  // Ready
  player.on('ready', function (data) {
    deviceId = data.device_id;
    setTimeout(() => {
      fetch('https://api.spotify.com/v1/me/player', {
        method: "PUT",
        body: JSON.stringify({
          device_ids:[
            data.device_id
          ],
          play: false
        }),
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }).catch(e => console.error(e));
    }, 100);
  });
  // Connect to the player!
  player.connect();
}
        
document.addEventListener('DOMContentLoaded', () => {
  const input = document.querySelector('input');
  document.querySelector('form').addEventListener('submit', function(event) {
    event.preventDefault();
    const searchQuery = '/search?query=' + (query => !query ? "cut to the feeling" : query)(input.value);
    
    fetch(searchQuery).then(e => e.json()).then(data => {
      document.getElementById('results').innerHTML = data.tracks.items
        .map(track => `<li class="text-salmon" onClick="getAnalysis(&apos;${ track.id }&apos;)">${track.name} - ${track.artists[0].name}</li>`)
        .join('\n');
    }).catch(error => {
      document.getElementById('results').innerHTML = error;
    });
  });
});
