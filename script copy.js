// Fetch sessionStorage variables
// const token = sessionStorage.getItem('token');
if (!token) {
  window.location.href = 'Auth/login.html'
}
const userName = sessionStorage.getItem('name');
const userAvatar = 'https://group-api-b4pm.onrender.com/img/users/' + sessionStorage.getItem('avatar');
//const userAvatar = 'https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/pngimg.com%20-%20deadpool_PNG15.png';
const avatarBG = getRandomColor();

console.log('User Avatar: ', userAvatar);
const userId = sessionStorage.getItem('uuid');
console.log("Current UserID: ", userId);

console.log("Avatar URL from sessionStorage:", userAvatar);
const markers = {}; // Object to store markers by member ID
let groupId = localStorage.getItem('GroupId');

let places = null; // local stored geofence data
let isDarkMode = true; // Keep track of dark mode
const color = isDarkMode ? "#FFFFFF" : "#FFFFFF"; // White for dark mode, black for light mode
console.log("Retrieved GroupUUID from localStorage:", groupId);

document.querySelector('.profile-section img').src = userAvatar;
document.querySelector('.profile-button img').src = userAvatar;


mapboxgl.accessToken = "pk.eyJ1IjoidGhleWNhbGxtZWUiLCJhIjoiY2xhZXF6anQxMHgzazNxczNzd2I5em10dyJ9.fa-pBQ_2cMg9H2fD-FBCDg";
const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/dark-v10",
  center: [-82.04842360357094, 35.18969231143789],
  zoom: 8,
});

map.on("load", async () => {
  console.log("Map loaded");
  loadMapData();

});




// Function to load all map data
async function loadMapData() {
  removeMapData();
  console.log('loading map data');

  console.log("Map loaded");

  try {
    showLoadingSpinner();

    await fetchDropdownData();

    if (groupId) {
      console.log("GroupId found, fetching fence and member data...");

      await fetchFenceData();
      await fetchmembersData();
      // await fetchUserData();
    } else {
      await fetchUserData();
      console.log("No GroupId found, skipping fence and member data fetch.");
    }

    updateProfileSection(userName, userAvatar);
  } catch (error) {
    handleError(error, "Error during map load process");
  } finally {
    hideLoadingSpinner();
  }
}


function removeMapData() {
  if (places && places.document) {
    // Remove geofence layers
    places.document.forEach((geofence) => {
      const fillLayerId = geofence.uuid;
      const circleLayerId = geofence.uuid + "-circle";

      // Remove the filled geofence layer
      if (map.getLayer(fillLayerId)) {
        map.removeLayer(fillLayerId);
      }

      // Remove the outer circle layer
      if (map.getLayer(circleLayerId)) {
        map.removeLayer(circleLayerId);
      }

      // Remove the associated geofence source
      if (map.getSource(fillLayerId)) {
        map.removeSource(fillLayerId);
      }

      if (map.getSource(circleLayerId)) {
        map.removeSource(circleLayerId);
      }
    });
  } else {
    console.log("No geofences found to remove.");
  }

  // Remove all markers and their associated SVGs
  for (const id in markers) {
    if (markers[id]) {
      // Remove marker from the map
      markers[id].remove();

      // Explicitly remove marker's DOM element if still present
      const markerElement = markers[id].getElement(); // Get marker's DOM element

      if (markerElement && markerElement.parentNode) {
        markerElement.parentNode.removeChild(markerElement); // Remove marker's div from DOM
      }

      delete markers[id];    // Delete the marker from the markers object
    }
  }

  console.log("Geofence layers and markers removed.");

  // Clear all the previous members from the member div
  const membersDiv = document.getElementById("membersDiv");
  membersDiv.innerHTML = ''; // Clear all the previous members
}


// Error handler function for centralized error logging
function handleError(error, context) {
  console.error(`${context}:`, error);
}

// Function to update profile section with name and avatar
function updateProfileSection(userName, userAvatar) {
  if (userName) {
    document.getElementById('profileName').innerText = userName;
  }

  if (userAvatar) {
    // const avatarImg = 'https://group-api-b4pm.onrender.com/img/users/' + document.querySelector('.profile-img');
    const avatarImg = userAvatar;

    if (avatarImg) {
      console.log("Setting profile image source to:", userAvatar);
      avatarImg.src = userAvatar;
    } else {
      console.error("Profile image element not found!");
    }
  } else {
    console.log("No user avatar available.");
  }
}


function showLoadingSpinner() {
  document.getElementById("loadingSpinner").style.display = "block";
}

// Hide loading spinner
function hideLoadingSpinner() {
  document.getElementById("loadingSpinner").style.display = "none";
}

async function fetchFenceData() {
  console.log("Fetching geofence data...");

  // Check if groupId exists before making the API call
  if (!groupId) {
    console.error("GroupId not found in localStorage! Skipping geofence data fetch.");
    return; // Exit the function if no GroupId is available
  }

  try {
    const response = await fetch(
      `https://group-api-b4pm.onrender.com/api/groups/${groupId}/fences`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Use the token from sessionStorage
        },
      }
    );

    const rawResponse = await response.text();



    const data = JSON.parse(rawResponse);
    places = data;
    console.log(places);
    console.log("Raw API response:", rawResponse);

    console.log("Fence data fetched:", data);

    if (data && data.document) {
      data.document.forEach((geofence) => {
        addGeofence(geofence, color);
        addFenceToMenu(geofence);
      });
      // addFenceToMenu(data);
    } else {
      console.error("Geofence data structure is incorrect:", data);
    }
  } catch (error) {
    console.error("Error fetching geofence data:", error);
  }
}

// Add geofence to the map
function addGeofence(geofence, color) {
  const center = [geofence.longitude, geofence.latitude];
  const radiusInMeters = parseFloat(geofence.radius);
  const options = { steps: 64, units: "meters" };
  const circle = turf.circle(center, radiusInMeters, options);

  // Add a filled circle for the geofence
  map.addLayer({
    id: geofence.uuid,
    type: "fill",
    source: {
      type: "geojson",
      data: circle,
    },
    paint: {
      "fill-color": "#007cbf",
      "fill-opacity": 0.25,
    },
  });

  // Add a marker at the center of the geofence
  const defaultMarker = new mapboxgl.Marker({
    anchor: "bottom",
    offset: [0, 24],
  });
  defaultMarker.setLngLat(center).addTo(map);

  // Store the default marker in the markers object using the geofence's UUID as the key
  markers[geofence.uuid] = defaultMarker;

  // Add an outer circle to represent the radius visually
  map.addLayer({
    id: geofence.uuid + "-circle",
    type: "circle",
    source: {
      type: "geojson",
      data: {
        type: "Feature",
        geometry: { type: "Point", coordinates: center },
      },
    },
    paint: {
      "circle-radius": 22,
      // "circle-color": "#FFFFFF",
      "circle-color": color,
      "circle-opacity": 1,
      'circle-stroke-color': '#777',
      'circle-stroke-width': 1

    },
  });
}

function addFenceData() {
  console.log("loading fence data after style change");
  if (places && places.document) {
    places.document.forEach((geofence) => {
      const color = isDarkMode ? "#FFFFFF" : "#FFFFFF"; // White for dark mode, darker for light mode
      addGeofence(geofence, color);
    });
  } else {
    console.error("Geofence data structure is incorrect:", places);
  }
}



async function fetchmembersDataOld() {
  console.log("Fetching members data...");

  // Retrieve the GroupId from localStorage
  //getGroupId();
  console.log("Using this groupId: ", groupId);

  // Check if groupId exists
  if (!groupId) {
    console.error("GroupId not found in localStorage!");
    return; // Exit the function if no GroupId is available
  }

  try {
    // Use backticks for template literal
    const response = await fetch(
      `https://group-api-b4pm.onrender.com/api/groups/${groupId}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Use the token from sessionStorage
        },
      }
    );

    const rawText = await response.text();
    console.log("Response as plain text:", rawText);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${response.statusText}`
      );
    }

    const data = JSON.parse(rawText);

    if (data && data.document && Array.isArray(data.document.members)) {
      data.document.members.forEach((member) => {
        const bgColor = getRandomColor();
        addMemberToMenu(member, bgColor);
        addMemberMarker(member, bgColor);
      });
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching members data:", error);
  }
}
async function fetchmembersData() {
  console.log("Fetching members data...");

  // Check if groupId exists
  if (!groupId) {
    console.error("GroupId not found in localStorage!");
    return; // Exit the function if no GroupId is available
  }

  try {
    const response = await fetch(
      `https://group-api-b4pm.onrender.com/api/groups/${groupId}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Use the token from sessionStorage
        },
      }
    );

    const rawText = await response.text();
    console.log("Response as plain text:", rawText);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${response.statusText}`
      );
    }

    const data = JSON.parse(rawText);

    if (data && data.document && Array.isArray(data.document.members)) {
      data.document.members.forEach((member) => {
        const bgColor = getRandomColor();
        updateOrAddMemberMarker(member, bgColor); // Use the new function here
        addMemberToMenu(member, bgColor);
      });
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching members data:", error);
  }
}


async function fetchUserData() {
  console.log("Fetching members data...");

  try {
    // Use backticks for template literal
    const response = await fetch(
      `https://group-api-b4pm.onrender.com/api/users/${userId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`, // Use the token from sessionStorage
        },
      }
    );

    const rawText = await response.text();
    console.log("Response as plain text:", rawText);

    if (!response.ok) {
      throw new Error(
        `HTTP error! status: ${response.status}, message: ${response.statusText}`
      );
    }

    const data = JSON.parse(rawText);

    if (data && data.user) {
      const user = data.user;

      // Extract and log user details
      console.log(`User Name: ${user.name}`);
      console.log(`Email: ${user.email}`);
      console.log(`Phone: ${user.phone}`);
      console.log(`Location: Latitude ${user.location.latitude}, Longitude ${user.location.longitude}`);
      console.log(`Address: ${user.location.address}`);

      // Log status information
      if (user.status) {
        console.log(`Location Sharing: ${user.status.location_sharing}`);
        console.log(`Is Moving: ${user.status.isMoving}`);
        console.log(`Speed: ${user.status.speed}`);
        console.log(`Battery Level: ${user.status.device.battery_level}%`);
        console.log(`Charging: ${user.status.device.charging}`);
      }

      // Use the avatar, location, or other data to update the UI (example functions)
      const bgColor = getRandomColor();
      addMemberToMenu(user, bgColor); // Assume this adds user info to the UI
      addMemberMarker(user, bgColor); // Assume this adds a map marker
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching members data:", error);
  }
}



function addMemberToMenu_1(memberData, bgColor) {
  const membersDiv = document.getElementById("membersDiv");

  // Create a member box
  const memberBox = document.createElement("div");
  memberBox.className = "member-box";

  // Create the avatar/initials circle
  const avatarDiv = document.createElement("div");
  avatarDiv.className = "member-avatar";

  if (memberData.avatar) {
    // Create the initials div ahead of time
    const initialsDiv = document.createElement("div");
    initialsDiv.classList.add("init-cir");
    initialsDiv.textContent = getInitials(memberData.name); // Generate initials from the name
    initialsDiv.style.backgroundColor = bgColor; // Set background color dynamically

    // Append the initialsDiv by default
    avatarDiv.appendChild(initialsDiv);

    // Create an image element and set the source
    const img = document.createElement("img");
    img.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;

    // Handle image load success
    img.onload = function () {
      // Remove initialsDiv and show the image
      avatarDiv.removeChild(initialsDiv);
      avatarDiv.appendChild(img);
    };

    // Handle image load error (keep initialsDiv displayed)
    img.onerror = function () {
      console.error("Avatar image failed to load for member:", memberData.name);
      // The initialsDiv remains; no further action needed
    };

    // Start loading the image (onload/onerror will handle display)
    // No need to append img here; it will be appended in onload
  } else {
    // If no avatar, show the initials inside a circle
    const initialsDiv = document.createElement("div");
    initialsDiv.classList.add("init-cir");
    initialsDiv.textContent = getInitials(memberData.name); // Generate initials from the name
    initialsDiv.style.backgroundColor = bgColor; // Set background color dynamically
    avatarDiv.appendChild(initialsDiv); // Append initials to avatarDiv
  }

  // Add the avatar/initials to the member box
  memberBox.appendChild(avatarDiv);

  // Add member name and other details

  const card_content = `
    ${memberData.status.device.charging ? `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="card-charging-icon charging"
    >
      <path d="M14 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-3" />
      <path d="M7 7H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
      <polyline points="11 7 8 12 12 12 9 17" />
      <line x1="22" x2="22" y1="11" y2="13" />
    </svg>
  ` : `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="card-charging-icon not-charging"
    >
      <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      <line x1="6" x2="6" y1="10" y2="14" />
      <line x1="10" x2="10" y1="10" y2="14" />
    </svg>
  `}
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="#000000"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-wifi-icon ${memberData?.status?.device?.wifi ? 'true' : 'false'}"
  >
    <path d="M5 13a10 10 0 0114 0" />
    <path d="M8.5 16.5a5 5 0 017 0" />
    <path d="M2 8.82a15 15 0 0120 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
  <span class="card-member-name">${memberData.name}</span><br>
  <span class="card-member-speed">Speed:</span><span class="card-member-speed-value"> ${memberData.status.speed} MPH</span>
  `;

  memberBox.innerHTML += card_content;

  // Append the member box to the members div
  membersDiv.appendChild(memberBox);

  // Add click event to fly to the member's marker location
  memberBox.addEventListener("click", function () {
    console.log("Fly to location");
    const lat = memberData.location.latitude;
    const lng = memberData.location.longitude;
    map.flyTo({
      center: [lng, lat],
      zoom: 12,
      essential: true,
    });
    document.body.classList.remove("menu-open");
  });
}

// Add member to the slide-out menu
function addMemberToMenu(memberData, bgColor) {
  const membersDiv = document.getElementById("membersDiv");

  // Create a member box
  const memberBox = document.createElement("div");
  memberBox.className = "member-box";

  // Create the avatar/initials circle
  const avatarDiv = document.createElement("div");
  avatarDiv.className = "member-avatar";

  if (memberData.avatar) {
    // If an avatar exists, create an image element and set the source
    const img = document.createElement("img");
    img.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;
    avatarDiv.appendChild(img);
  } else {
    // If no avatar, show the initials inside a circle
    const initialsDiv = document.createElement("div");
    initialsDiv.classList.add("init-cir");
    initialsDiv.textContent = getInitials(memberData.name); // Generate initials from the name
    initialsDiv.style.backgroundColor = bgColor; // Set background color dynamically
    avatarDiv.appendChild(initialsDiv); // Append initials to avatarDiv
  }


  // Add the avatar/initials to the member box
  memberBox.appendChild(avatarDiv);

  // Add member name and coordinates
  // const infoDiv = document.createElement("div");
  const card_content = `
      ${memberData.status.device.charging ? `
      <svg 
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#000000"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="card-charging-icon charging"
      >
        <path d="M14 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-3" />
        <path d="M7 7H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
        <polyline points="11 7 8 12 12 12 9 17" />
        <line x1="22" x2="22" y1="11" y2="13" />
      </svg>
    ` : `
      <svg 
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#000000"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="card-charging-icon not-charging"
      >
        <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
        <line x1="22" x2="22" y1="11" y2="13" />
        <line x1="6" x2="6" y1="10" y2="14" />
        <line x1="10" x2="10" y1="10" y2="14" />
      </svg>
    `}
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"

      stroke="#000000"
      stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="card-wifi-icon ${memberData?.status?.device?.wifi ? 'true' : 'false'}"
    >
      <path d="M5 13a10 10 0 0114 0" />
      <path d="M8.5 16.5a5 5 0 017 0" />
      <path d="M2 8.82a15 15 0 0120 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </svg>
    <span class="card-member-name">${memberData.name}</span><br>
    <span class="card-member-speed">Speed:</span><span class="card-member-speed-value"> ${memberData.status.speed} MPH</span>
    <!-- <span class="card-member-address">Addres:</span><span class="card-member-address-value">${memberData.location.address || 'N/A'}</span> -->
    <!-- <div class="gps-coordinates">Lat: ${memberData.location.latitude}, Long: ${memberData.location.longitude}</div> -->
   `;

  //infoDiv.innerHTML += card_content;
  //memberBox.appendChild(infoDiv);

  memberBox.innerHTML += card_content;

  // Append the member box to the members div
  membersDiv.appendChild(memberBox);

  // Add click event to fly to the member's marker location
  memberBox.addEventListener("click", function () {
    console.log("FLyto");
    const lat = memberData.location.latitude;
    const lng = memberData.location.longitude;
    map.flyTo({
      center: [lng, lat],
      zoom: 12,
      essential: true,
    });
    document.body.classList.remove("menu-open");
  });
}

function addMemberMarkerOld(memberData, bgColor) {
  const { latitude, longitude } = memberData.location;
  const is_moving = memberData.is_moving !== undefined ? memberData.is_moving : true; // Assume moving if undefined
  const speed = memberData.status.speed !== undefined ? memberData.status.speed : 10; // Default speed if undefined
  const memberId = memberData.uuid || memberData._id; // Unique member ID

  if (!latitude || !longitude) {
    console.error("Missing latitude or longitude for member:", memberData);
    return;
  }

  // Check if the marker for this member already exists
  if (markers[memberId]) {
    // Update existing marker position and badge
    console.log(`Marker position updated: Lat: ${latitude}, Long: ${longitude}`);
    const markerEl = markers[memberId].getElement();

    // Update marker location
    markers[memberId].setLngLat([longitude, latitude]);

    // Update badge if moving and speed > 5
    const badgeDiv = markerEl.querySelector(".badge");
    if (is_moving && speed > 5) {
      if (!badgeDiv) {
        // Add new badge if not present
        console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

        const newBadgeDiv = document.createElement("div");
        newBadgeDiv.classList.add("badge");

        const badgeImg = document.createElement("img");
        badgeImg.src = "../assets/car.svg"; // Update with your correct asset path

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("badge-speed");
        speedSpan.textContent = `${speed} mph`;

        newBadgeDiv.appendChild(badgeImg);
        newBadgeDiv.appendChild(speedSpan);
        markerEl.appendChild(newBadgeDiv);

        // Hide badge if location_sharing is false
        if (!memberData.status.location_sharing) {
          newBadgeDiv.style.display = "none";
        }
      } else {
        // Update badge with new speed
        console.log(`Updating badge for member: ${memberData.name} with speed: ${speed} mph`);
        badgeDiv.querySelector(".badge-speed").textContent = `${speed} mph`;

        // Hide or show badge based on location_sharing
        badgeDiv.style.display = memberData.status.location_sharing ? "block" : "none";
      }
    } else if (badgeDiv) {
      // Remove badge if no longer moving or speed <= 5
      console.log(`Removing badge for member: ${memberData.name} (Speed <= 5 mph)`);
      badgeDiv.remove();
    }
  } else {
    // Create a new marker if one doesn't exist
    console.log(`Creating new marker for member: ${memberData.name}`);

    const el = document.createElement("div");
    el.className = "marker";

    const circleDiv = document.createElement("div");
    circleDiv.classList.add("circle-div");

    // Create the initials div ahead of time
    const innerCircle = document.createElement("div");
    innerCircle.classList.add("circle-inner");
    innerCircle.style.backgroundColor = bgColor;

    const initialsDiv = document.createElement("div");
    initialsDiv.textContent = getInitials(memberData.name);

    innerCircle.appendChild(initialsDiv);
    circleDiv.appendChild(innerCircle);

    if (memberData.avatar) {
      // Create an image element and set the source
      const avatarImg = document.createElement("img");
      avatarImg.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;

      // Handle image load success
      avatarImg.onload = function () {
        // Remove initialsDiv and innerCircle, show the image
        circleDiv.removeChild(innerCircle);
        circleDiv.appendChild(avatarImg);
      };

      // Handle image load error (keep initialsDiv displayed)
      avatarImg.onerror = function () {
        console.error("Avatar image failed to load for member:", memberData.name);
        // The initialsDiv remains; no further action needed
      };

      // Start loading the image
      // We don't append avatarImg to circleDiv yet; it will be appended in onload
    }

    // Apply grayscale filter to circleDiv if location_sharing is disabled
    if (!memberData.status.location_sharing) {
      circleDiv.style.filter = "grayscale(100%)";
    } else {
      circleDiv.style.filter = "none";
    }

    el.appendChild(circleDiv);

    // Add the tail to the marker
    const tailDiv = document.createElement("div");
    tailDiv.classList.add("tail-div");
    el.appendChild(tailDiv);

    // Add badge if moving and speed > 5
    if (is_moving && speed > 5) {
      console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

      const badgeDiv = document.createElement("div");
      badgeDiv.classList.add("badge");

      const badgeImg = document.createElement("img");
      badgeImg.src = "../assets/car.svg"; // Update with your correct asset path
      const speedSpan = document.createElement("span");
      speedSpan.classList.add("badge-speed");
      speedSpan.textContent = `${speed} mph`;

      badgeDiv.appendChild(badgeImg);
      badgeDiv.appendChild(speedSpan);
      el.appendChild(badgeDiv);

      // Hide badge if location_sharing is false
      if (!memberData.status.location_sharing) {
        badgeDiv.style.display = "none";
      }
    }

    // Create the expanded view (popup), initially hidden
    const expandedDiv = document.createElement("div");
    expandedDiv.classList.add("marker-expanded");
    expandedDiv.style.display = "none"; // Initially hidden

    // Clone the circleDiv for the expanded view
    const expandedCircleDiv = circleDiv.cloneNode(true);

    if (memberData.avatar) {
      // If an avatar exists, create an image element and set the source
      const img = document.createElement("img");
      img.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;
      expandedDiv.appendChild(img);
      //avatarDiv.appendChild(img);
    } else {
      // If no avatar, show the initials inside a circle
      // const initialsDiv = document.createElement("div");
      // initialsDiv.classList.add("init-cir");
      // initialsDiv.textContent = getInitials(memberData.name); // Generate initials from the name
      // initialsDiv.style.backgroundColor = bgColor; // Set background color dynamically
      // avatarDiv.appendChild(initialsDiv); // Append initials to avatarDiv
    }


    expandedDiv.appendChild(expandedCircleDiv);

    // Add content to the expanded marker (for popup)
    const screenStatus = memberData.status.device.screen ? "On" : "Off";
    const content = `
    <div class="content">
      <strong class="popup-member-name">${memberData.name}</strong><br>
      <span class="popup-member-speed">Speed:</span><span class="popup-member-speed-value"> ${memberData.status.speed} MPH</span>
      <span class="popup-screen-on">Screen:</span><span class="popup-screen-on-value"> ${screenStatus}</span>
      <span class="popup-lat">Lat:</span><span class="popup-lat-value">${latitude}</span>
      <span class="popup-long">Long:</span><span class="popup-long-value">${longitude}</span>
      <span class="popup-battery-level">${memberData.status.device.battery_level}%</span>
      <span class="popup-member-address">Address: </span><span class="popup-member-address-value">${memberData.location.address}</span>
      ${memberData.status.device.charging ? `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="popup-charging-icon charging"
    >
      <path d="M14 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-3" />
      <path d="M7 7H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
      <polyline points="11 7 8 12 12 12 9 17" />
      <line x1="22" x2="22" y1="11" y2="13" />
    </svg>
  ` : `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="popup-charging-icon not-charging"
    >
      <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      <line x1="6" x2="6" y1="10" y2="14" />
      <line x1="10" x2="10" y1="10" y2="14" />
    </svg>
  `}
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="#000000"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="popup-wifi-icon ${memberData?.status?.device?.wifi ? 'true' : 'false'}"
  >
    <path d="M5 13a10 10 0 0114 0" />
    <path d="M8.5 16.5a5 5 0 017 0" />
    <path d="M2 8.82a15 15 0 0120 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
  
    </div>
    <button class="close-btn">&times;</button>
    `;
    expandedDiv.innerHTML += content;

    el.appendChild(expandedDiv); // Add expanded view to marker

    // Add the marker to the map
    const marker = new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    markers[memberId] = marker; // Store marker by member ID

    el.addEventListener("click", function () {
      console.log(`Marker clicked: ${memberData.name}`);

      if (expandedDiv.style.display === "none") {
        expandedDiv.style.display = "block";
        circleDiv.style.display = "none"; // Hide circle when expanded

        // Append the expandedDiv to the map's container
        document.getElementById("map").appendChild(expandedDiv);

        // Function to update position dynamically
        function updateExpandedMarkerPosition() {
          const markerLngLat = marker.getLngLat(); // Get the current marker position
          const markerScreenPosition = map.project(markerLngLat); // Convert to screen coordinates

          expandedDiv.style.position = "absolute";
          expandedDiv.style.top = `${markerScreenPosition.y - 60}px`; // Adjust to position above the marker
          expandedDiv.style.left = `${markerScreenPosition.x - 110}px`; // Center it horizontally over the marker
        }

        // Call the function initially to position the expanded marker
        updateExpandedMarkerPosition();

        // Update the expanded marker's position on map move/zoom
        map.on("move", updateExpandedMarkerPosition);
        map.on("zoom", updateExpandedMarkerPosition);
      }

      // Close button logic to collapse the expanded marker
      expandedDiv.querySelector(".close-btn").addEventListener("click", function (e) {
        e.stopPropagation(); // Prevent the click from bubbling up to the marker click event
        expandedDiv.style.display = "none"; // Hide expanded view
        circleDiv.style.display = "flex"; // Show circular marker again

        // Remove the expandedDiv from the map container
        document.getElementById("map").removeChild(expandedDiv);

        // Stop updating the position
        map.off("move", updateExpandedMarkerPosition);
        map.off("zoom", updateExpandedMarkerPosition);
      });
    });



    // Close button event to collapse the expanded marker
    expandedDiv.querySelector(".close-btn").addEventListener("click", (e) => {
      e.stopPropagation(); // Prevent the event from bubbling
      expandedDiv.style.display = "none"; // Hide expanded view
      circleDiv.style.display = "flex"; // Show circular marker again
    });
  }
}

function updateOrAddMemberMarkerOld(memberData, bgColor) {
  const { latitude, longitude } = memberData.location;
  const is_moving = memberData.is_moving !== undefined ? memberData.is_moving : true; // Assume moving if undefined
  const speed = memberData.status.speed !== undefined ? memberData.status.speed : 10; // Default speed if undefined
  const memberId = memberData.uuid || memberData._id; // Unique member ID

  if (!latitude || !longitude) {
    console.error("Missing latitude or longitude for member:", memberData);
    return;
  }

  // Check if the marker for this member already exists
  if (markers[memberId]) {
    // Get current marker position
    const currentMarker = markers[memberId];
    const currentLngLat = currentMarker.getLngLat();
    const newLngLat = { lng: longitude, lat: latitude };

    // Smoothly move marker
    moveMarker(currentMarker, currentLngLat, newLngLat, 1000); // Move over 1 second

    // Update badge if moving and speed > 5
    const markerEl = currentMarker.getElement();
    const badgeDiv = markerEl.querySelector(".badge");
    if (is_moving && speed > 5) {
      if (!badgeDiv) {
        // Add new badge if not present
        console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

        const newBadgeDiv = document.createElement("div");
        newBadgeDiv.classList.add("badge");

        const badgeImg = document.createElement("img");
        badgeImg.src = "../assets/car.svg"; // Update with your correct asset path

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("badge-speed");
        speedSpan.textContent = `${speed} mph`;

        newBadgeDiv.appendChild(badgeImg);
        newBadgeDiv.appendChild(speedSpan);
        markerEl.appendChild(newBadgeDiv);

        // Hide badge if location_sharing is false
        if (!memberData.status.location_sharing) {
          newBadgeDiv.style.display = "none";
        }
      } else {
        // Update badge with new speed
        console.log(`Updating badge for member: ${memberData.name} with speed: ${speed} mph`);
        badgeDiv.querySelector(".badge-speed").textContent = `${speed} mph`;

        // Hide or show badge based on location_sharing
        badgeDiv.style.display = memberData.status.location_sharing ? "block" : "none";
      }
    } else if (badgeDiv) {
      // Remove badge if no longer moving or speed <= 5
      console.log(`Removing badge for member: ${memberData.name} (Speed <= 5 mph)`);
      badgeDiv.remove();
    }

    // Update click event
    markerEl.onclick = function () {
      console.log(`Marker clicked: ${memberData.name}`);
      const expandedDiv = markerEl.querySelector(".marker-expanded");
      const circleDiv = markerEl.querySelector(".circle-div");

      if (expandedDiv.style.display === "none") {
        expandedDiv.style.display = "block";
        circleDiv.style.display = "none"; // Hide circle when expanded

        // Append the expandedDiv to the map's container
        document.getElementById("map").appendChild(expandedDiv);

        // Function to update position dynamically
        function updateExpandedMarkerPosition() {
          const markerLngLat = currentMarker.getLngLat(); // Get the current marker position
          const markerScreenPosition = map.project(markerLngLat); // Convert to screen coordinates

          expandedDiv.style.position = "absolute";
          expandedDiv.style.top = `${markerScreenPosition.y - 60}px`; // Adjust to position above the marker
          expandedDiv.style.left = `${markerScreenPosition.x - 110}px`; // Center it horizontally over the marker
        }

        // Call the function initially to position the expanded marker
        updateExpandedMarkerPosition();

        // Update the expanded marker's position on map move/zoom
        map.on("move", updateExpandedMarkerPosition);
        map.on("zoom", updateExpandedMarkerPosition);

        // Close button logic to collapse the expanded marker
        expandedDiv.querySelector(".close-btn").addEventListener("click", function (e) {
          e.stopPropagation(); // Prevent the click from bubbling up to the marker click event
          expandedDiv.style.display = "none"; // Hide expanded view
          circleDiv.style.display = "flex"; // Show circular marker again

          // Remove the expandedDiv from the map container
          document.getElementById("map").removeChild(expandedDiv);

          // Stop updating the position
          map.off("move", updateExpandedMarkerPosition);
          map.off("zoom", updateExpandedMarkerPosition);
        });
      }
    };
  } else {
    // Create a new marker if one doesn't exist
    console.log(`Creating new marker for member: ${memberData.name}`);

    const el = document.createElement("div");
    el.className = "marker";

    const circleDiv = document.createElement("div");
    circleDiv.classList.add("circle-div");

    // Create the initials div ahead of time
    const innerCircle = document.createElement("div");
    innerCircle.classList.add("circle-inner");
    innerCircle.style.backgroundColor = bgColor;

    const initialsDiv = document.createElement("div");
    initialsDiv.textContent = getInitials(memberData.name);

    innerCircle.appendChild(initialsDiv);
    circleDiv.appendChild(innerCircle);

    if (memberData.avatar) {
      // Create an image element and set the source
      const avatarImg = document.createElement("img");
      avatarImg.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;

      // Handle image load success
      avatarImg.onload = function () {
        // Remove initialsDiv and innerCircle, show the image
        circleDiv.removeChild(innerCircle);
        circleDiv.appendChild(avatarImg);
      };

      // Handle image load error (keep initialsDiv displayed)
      avatarImg.onerror = function () {
        console.error("Avatar image failed to load for member:", memberData.name);
        // The initialsDiv remains; no further action needed
      };

      // Start loading the image
    }

    // Apply grayscale filter to circleDiv if location_sharing is disabled
    if (!memberData.status.location_sharing) {
      circleDiv.style.filter = "grayscale(100%)";
    } else {
      circleDiv.style.filter = "none";
    }

    el.appendChild(circleDiv);

    // Add the tail to the marker
    const tailDiv = document.createElement("div");
    tailDiv.classList.add("tail-div");
    el.appendChild(tailDiv);

    // Add badge if moving and speed > 5
    if (is_moving && speed > 5) {
      console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

      const badgeDiv = document.createElement("div");
      badgeDiv.classList.add("badge");

      const badgeImg = document.createElement("img");
      badgeImg.src = "../assets/car.svg"; // Update with your correct asset path
      const speedSpan = document.createElement("span");
      speedSpan.classList.add("badge-speed");
      speedSpan.textContent = `${speed} mph`;

      badgeDiv.appendChild(badgeImg);
      badgeDiv.appendChild(speedSpan);
      el.appendChild(badgeDiv);

      // Hide badge if location_sharing is false
      if (!memberData.status.location_sharing) {
        badgeDiv.style.display = "none";
      }
    }

    // Create the expanded view (popup), initially hidden
    const expandedDiv = document.createElement("div");
    expandedDiv.classList.add("marker-expanded");
    expandedDiv.style.display = "none"; // Initially hidden

    // Clone the circleDiv for the expanded view
    const expandedCircleDiv = circleDiv.cloneNode(true);

    if (memberData.avatar) {
      // If an avatar exists, create an image element and set the source
      const img = document.createElement("img");
      img.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;
      expandedDiv.appendChild(img);
    }

    expandedDiv.appendChild(expandedCircleDiv);

    // Add content to the expanded marker (for popup)
    const screenStatus = memberData.status.device.screen ? "On" : "Off";
    const content = `
    <div class="content">
      <strong class="popup-member-name">${memberData.name}</strong><br>
      <span class="popup-member-speed">Speed:</span><span class="popup-member-speed-value"> ${memberData.status.speed} MPH</span>
      <span class="popup-screen-on">Screen:</span><span class="popup-screen-on-value"> ${screenStatus}</span>
      <span class="popup-lat">Lat:</span><span class="popup-lat-value">${latitude}</span>
      <span class="popup-long">Long:</span><span class="popup-long-value">${longitude}</span>
      <span class="popup-battery-level">${memberData.status.device.battery_level}%</span>
      <span class="popup-member-address">Address: </span><span class="popup-member-address-value">${memberData.location.address}</span>
      ${memberData.status.device.charging ? `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="popup-charging-icon charging"
    >
      <path d="M14 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-3" />
      <path d="M7 7H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
      <polyline points="11 7 8 12 12 12 9 17" />
      <line x1="22" x2="22" y1="11" y2="13" />
    </svg>
  ` : `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="popup-charging-icon not-charging"
    >
      <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      <line x1="6" x2="6" y1="10" y2="14" />
      <line x1="10" x2="10" y1="10" y2="14" />
    </svg>
  `}
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="#000000"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="popup-wifi-icon ${memberData?.status?.device?.wifi ? 'true' : 'false'}"
  >
    <path d="M5 13a10 10 0 0114 0" />
    <path d="M8.5 16.5a5 5 0 017 0" />
    <path d="M2 8.82a15 15 0 0120 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
  
    </div>
    <button class="close-btn">&times;</button>
    `;
    expandedDiv.innerHTML += content;

    el.appendChild(expandedDiv); // Add expanded view to marker

    // Add the marker to the map
    const marker = new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    markers[memberId] = marker; // Store marker by member ID

    el.addEventListener("click", function () {
      console.log(`Marker clicked: ${memberData.name}`);

      if (expandedDiv.style.display === "none") {
        expandedDiv.style.display = "block";
        circleDiv.style.display = "none"; // Hide circle when expanded

        // Append the expandedDiv to the map's container
        document.getElementById("map").appendChild(expandedDiv);

        // Function to update position dynamically
        function updateExpandedMarkerPosition() {
          const markerLngLat = marker.getLngLat(); // Get the current marker position
          const markerScreenPosition = map.project(markerLngLat); // Convert to screen coordinates

          expandedDiv.style.position = "absolute";
          expandedDiv.style.top = `${markerScreenPosition.y - 60}px`; // Adjust to position above the marker
          expandedDiv.style.left = `${markerScreenPosition.x - 110}px`; // Center it horizontally over the marker
        }

        // Call the function initially to position the expanded marker
        updateExpandedMarkerPosition();

        // Update the expanded marker's position on map move/zoom
        map.on("move", updateExpandedMarkerPosition);
        map.on("zoom", updateExpandedMarkerPosition);
      }

      // Close button logic to collapse the expanded marker
      expandedDiv.querySelector(".close-btn").addEventListener("click", function (e) {
        e.stopPropagation(); // Prevent the click from bubbling up to the marker click event
        expandedDiv.style.display = "none"; // Hide expanded view
        circleDiv.style.display = "flex"; // Show circular marker again

        // Remove the expandedDiv from the map container
        document.getElementById("map").removeChild(expandedDiv);

        // Stop updating the position
        map.off("move", updateExpandedMarkerPosition);
        map.off("zoom", updateExpandedMarkerPosition);
      });
    });
  }
}
function updateOrAddMemberMarker(memberData, bgColor) {
  const { latitude, longitude } = memberData.location;
  const memberId = memberData.uuid || memberData._id; // Unique member ID

  if (!latitude || !longitude) {
    console.error("Missing latitude or longitude for member:", memberData);
    return;
  }

  // Correctly retrieve isMoving and speed from memberData.status
  const is_moving = memberData.status.isMoving !== undefined ? memberData.status.isMoving : false; // Default to false
  const speed = memberData.status.speed !== undefined ? memberData.status.speed : 0; // Default to 0

  // Check if the marker for this member already exists
  if (markers[memberId]) {
    // Get current marker position
    const currentMarker = markers[memberId];
    const currentLngLat = currentMarker.getLngLat();
    const newLngLat = { lng: longitude, lat: latitude };

    // Smoothly move marker
    moveMarker(currentMarker, currentLngLat, newLngLat, 1000); // Move over 1 second

    // Update badge if moving and speed > 5
    const markerEl = currentMarker.getElement();
    const badgeDiv = markerEl.querySelector(".badge");

    if (is_moving && speed > 5) {
      if (!badgeDiv) {
        // Add new badge if not present
        console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

        const newBadgeDiv = document.createElement("div");
        newBadgeDiv.classList.add("badge");

        const badgeImg = document.createElement("img");
        badgeImg.src = "../assets/car.svg"; // Update with your correct asset path

        const speedSpan = document.createElement("span");
        speedSpan.classList.add("badge-speed");
        speedSpan.textContent = `${speed} mph`;

        newBadgeDiv.appendChild(badgeImg);
        newBadgeDiv.appendChild(speedSpan);
        markerEl.appendChild(newBadgeDiv);

        // Hide badge if location_sharing is false
        if (!memberData.status.location_sharing) {
          newBadgeDiv.style.display = "none";
        }
      } else {
        // Update badge with new speed
        console.log(`Updating badge for member: ${memberData.name} with speed: ${speed} mph`);
        badgeDiv.querySelector(".badge-speed").textContent = `${speed} mph`;

        // Hide or show badge based on location_sharing
        badgeDiv.style.display = memberData.status.location_sharing ? "block" : "none";
      }
    } else if (badgeDiv) {
      // Remove badge if no longer moving or speed <= 5
      console.log(`Removing badge for member: ${memberData.name} (Not moving or speed <= 5 mph)`);
      badgeDiv.remove();
    }

    // Update click event
    markerEl.onclick = function () {
      console.log(`Marker clicked: ${memberData.name}`);

      // Fly to the marker's location
      map.flyTo({
        center: [longitude, latitude],
        zoom: 12,
        essential: true,
      });

      const expandedDiv = markerEl.querySelector(".marker-expanded");
      const circleDiv = markerEl.querySelector(".circle-div");

      if (expandedDiv.style.display === "none") {
        expandedDiv.style.display = "block";
        circleDiv.style.display = "none"; // Hide circle when expanded

        // Append the expandedDiv to the map's container
        document.getElementById("map").appendChild(expandedDiv);

        // Function to update position dynamically
        function updateExpandedMarkerPosition() {
          const markerLngLat = currentMarker.getLngLat(); // Get the current marker position
          const markerScreenPosition = map.project(markerLngLat); // Convert to screen coordinates

          expandedDiv.style.position = "absolute";
          expandedDiv.style.top = `${markerScreenPosition.y - 60}px`; // Adjust to position above the marker
          expandedDiv.style.left = `${markerScreenPosition.x - 110}px`; // Center it horizontally over the marker
        }

        // Call the function initially to position the expanded marker
        updateExpandedMarkerPosition();

        // Update the expanded marker's position on map move/zoom
        map.on("move", updateExpandedMarkerPosition);
        map.on("zoom", updateExpandedMarkerPosition);

        // Close button logic to collapse the expanded marker
        expandedDiv.querySelector(".close-btn").addEventListener("click", function (e) {
          e.stopPropagation(); // Prevent the click from bubbling up to the marker click event
          expandedDiv.style.display = "none"; // Hide expanded view
          circleDiv.style.display = "flex"; // Show circular marker again

          // Remove the expandedDiv from the map container
          document.getElementById("map").removeChild(expandedDiv);

          // Stop updating the position
          map.off("move", updateExpandedMarkerPosition);
          map.off("zoom", updateExpandedMarkerPosition);
        });
      }
    };
  } else {
    // Create a new marker if one doesn't exist
    console.log(`Creating new marker for member: ${memberData.name}`);

    const el = document.createElement("div");
    el.className = "marker";

    const circleDiv = document.createElement("div");
    circleDiv.classList.add("circle-div");

    // Create the initials div ahead of time
    const innerCircle = document.createElement("div");
    innerCircle.classList.add("circle-inner");
    innerCircle.style.backgroundColor = bgColor;

    const initialsDiv = document.createElement("div");
    initialsDiv.textContent = getInitials(memberData.name);

    innerCircle.appendChild(initialsDiv);
    circleDiv.appendChild(innerCircle);

    if (memberData.avatar) {
      // Create an image element and set the source
      const avatarImg = document.createElement("img");
      avatarImg.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;

      // Handle image load success
      avatarImg.onload = function () {
        // Remove initialsDiv and innerCircle, show the image
        circleDiv.removeChild(innerCircle);
        circleDiv.appendChild(avatarImg);
      };

      // Handle image load error (keep initialsDiv displayed)
      avatarImg.onerror = function () {
        console.error("Avatar image failed to load for member:", memberData.name);
        // The initialsDiv remains; no further action needed
      };

      // Start loading the image
    }

    // Apply grayscale filter to circleDiv if location_sharing is disabled
    if (!memberData.status.location_sharing) {
      circleDiv.style.filter = "grayscale(100%)";
    } else {
      circleDiv.style.filter = "none";
    }

    el.appendChild(circleDiv);

    // Add the tail to the marker
    const tailDiv = document.createElement("div");
    tailDiv.classList.add("tail-div");
    el.appendChild(tailDiv);

    // Add badge if moving and speed > 5
    if (is_moving && speed > 5) {
      console.log(`Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`);

      const badgeDiv = document.createElement("div");
      badgeDiv.classList.add("badge");

      const badgeImg = document.createElement("img");
      badgeImg.src = "../assets/car.svg"; // Update with your correct asset path
      const speedSpan = document.createElement("span");
      speedSpan.classList.add("badge-speed");
      speedSpan.textContent = `${speed} mph`;

      badgeDiv.appendChild(badgeImg);
      badgeDiv.appendChild(speedSpan);
      el.appendChild(badgeDiv);

      // Hide badge if location_sharing is false
      if (!memberData.status.location_sharing) {
        badgeDiv.style.display = "none";
      }
    }

    // Create the expanded view (popup), initially hidden
    const expandedDiv = document.createElement("div");
    expandedDiv.classList.add("marker-expanded");
    expandedDiv.style.display = "none"; // Initially hidden

    // Clone the circleDiv for the expanded view
    const expandedCircleDiv = circleDiv.cloneNode(true);

    if (memberData.avatar) {
      // If an avatar exists, create an image element and set the source
      const img = document.createElement("img");
      img.src = 'https://group-api-b4pm.onrender.com/img/users/' + memberData.avatar;
      expandedDiv.appendChild(img);
    }

    expandedDiv.appendChild(expandedCircleDiv);

    // Add content to the expanded marker (for popup)
    const screenStatus = memberData.status.device.screen ? "On" : "Off";
    const content = `
    <div class="content">
      <strong class="popup-member-name">${memberData.name}</strong><br>
      <span class="popup-member-speed">Speed:</span><span class="popup-member-speed-value"> ${speed} MPH</span>
      <span class="popup-screen-on">Screen:</span><span class="popup-screen-on-value"> ${screenStatus}</span>
      <span class="popup-lat">Lat:</span><span class="popup-lat-value">${latitude}</span>
      <span class="popup-long">Long:</span><span class="popup-long-value">${longitude}</span>
      <span class="popup-battery-level">${memberData.status.device.battery_level}%</span>
      <span class="popup-member-address">Address: </span><span class="popup-member-address-value">${memberData.location.address}</span>
      ${memberData.status.device.charging ? `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="popup-charging-icon charging"
    >
      <path d="M14 7h2a2 2 0 012 2v6a2 2 0 01-2 2h-3" />
      <path d="M7 7H4a2 2 0 00-2 2v6a2 2 0 002 2h2" />
      <polyline points="11 7 8 12 12 12 9 17" />
      <line x1="22" x2="22" y1="11" y2="13" />
    </svg>
  ` : `
    <svg 
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#000000"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="popup-charging-icon not-charging"
    >
      <rect x="2" y="7" width="16" height="10" rx="2" ry="2" />
      <line x1="22" x2="22" y1="11" y2="13" />
      <line x1="6" x2="6" y1="10" y2="14" />
      <line x1="10" x2="10" y1="10" y2="14" />
    </svg>
  `}
   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
    stroke="#000000"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="popup-wifi-icon ${memberData?.status?.device?.wifi ? 'true' : 'false'}"
  >
    <path d="M5 13a10 10 0 0114 0" />
    <path d="M8.5 16.5a5 5 0 017 0" />
    <path d="M2 8.82a15 15 0 0120 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
  
    </div>
    <button class="close-btn">&times;</button>
    `;
    expandedDiv.innerHTML += content;

    el.appendChild(expandedDiv); // Add expanded view to marker

    // Add the marker to the map
    const marker = new mapboxgl.Marker(el).setLngLat([longitude, latitude]).addTo(map);
    markers[memberId] = marker; // Store marker by member ID

    el.addEventListener("click", function () {
      console.log(`Marker clicked: ${memberData.name}`);

      // Fly to the marker's location
      map.flyTo({
        center: [longitude, latitude],
        zoom: 12,
        essential: true,
      });

      if (expandedDiv.style.display === "none") {
        expandedDiv.style.display = "block";
        circleDiv.style.display = "none"; // Hide circle when expanded

        // Append the expandedDiv to the map's container
        document.getElementById("map").appendChild(expandedDiv);

        // Function to update position dynamically
        function updateExpandedMarkerPosition() {
          const markerLngLat = marker.getLngLat(); // Get the current marker position
          const markerScreenPosition = map.project(markerLngLat); // Convert to screen coordinates

          expandedDiv.style.position = "absolute";
          expandedDiv.style.top = `${markerScreenPosition.y - 60}px`; // Adjust to position above the marker
          expandedDiv.style.left = `${markerScreenPosition.x - 110}px`; // Center it horizontally over the marker
        }

        // Call the function initially to position the expanded marker
        updateExpandedMarkerPosition();

        // Update the expanded marker's position on map move/zoom
        map.on("move", updateExpandedMarkerPosition);
        map.on("zoom", updateExpandedMarkerPosition);

        // Close button logic to collapse the expanded marker
        expandedDiv.querySelector(".close-btn").addEventListener("click", function (e) {
          e.stopPropagation(); // Prevent the click from bubbling up to the marker click event
          expandedDiv.style.display = "none"; // Hide expanded view
          circleDiv.style.display = "flex"; // Show circular marker again

          // Remove the expandedDiv from the map container
          document.getElementById("map").removeChild(expandedDiv);

          // Stop updating the position
          map.off("move", updateExpandedMarkerPosition);
          map.off("zoom", updateExpandedMarkerPosition);
        });
      }
    });
  }
}

// Function to smoothly move the marker to a new position
function moveMarker(marker, fromLngLat, toLngLat, duration) {
  const start = performance.now();

  function animateMarker(timestamp) {
    const progress = Math.min((timestamp - start) / duration, 1);

    const lng = fromLngLat.lng + (toLngLat.lng - fromLngLat.lng) * progress;
    const lat = fromLngLat.lat + (toLngLat.lat - fromLngLat.lat) * progress;

    marker.setLngLat([lng, lat]);

    if (progress < 1) {
      requestAnimationFrame(animateMarker);
    }
  }

  requestAnimationFrame(animateMarker);
}



// Toggle the menu open 
document
  .getElementById("toggle-menu")
  .addEventListener("click", function () {
    document.body.classList.add("menu-open");
  });

// Close the menu with the close button
document
  .getElementById("close-menu")
  .addEventListener("click", function () {
    document.body.classList.remove("menu-open");
  });

// Toggle the hidden members div with dynamic height
document.getElementById("members-btn").addEventListener("click", function () {
  const membersDiv = document.getElementById("membersDiv");

  const fencesDiv = document.getElementById("fencesDiv");
  const membersCon = document.getElementById('membersCon');
  // Toggle membersDiv
  if (membersDiv.classList.contains("open")) {
    membersDiv.classList.remove("open");
    membersCon.classList.remove("open");
    membersDiv.style.opacity = 0;  // Hide the div
  } else {
    membersDiv.classList.add("open");
    membersCon.classList.add("open");
    membersDiv.style.opacity = 1;  // Show the div
  }

  // Ensure fencesDiv is not affected
  fencesDiv.style.opacity = 0;
  fencesDiv.classList.remove("open");
});

document.getElementById("places-btn").addEventListener("click", function () {
  const fencesDiv = document.getElementById("fencesDiv");
  const membersDiv = document.getElementById("membersDiv");
  const membersCon = document.getElementById('membersCon');

  // Toggle fencesDiv
  if (fencesDiv.classList.contains("open")) {
    fencesDiv.classList.remove("open");
    fencesDiv.style.opacity = 0;  // Hide the div
  } else {
    membersCon.classList.remove("open");
    fencesDiv.classList.add("open");
    fencesDiv.style.opacity = 1;  // Show the div
  }

  // Ensure membersDiv is not affected
  membersDiv.style.opacity = 0;
  membersDiv.classList.remove("open");
});





// Generate random color for initials background
function getRandomColor() {
  const letters = "0123456789ABCDEF";
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Generate initials from name
function getInitials(name) {
  const nameParts = name.split(" ");
  const initials =
    nameParts[0].charAt(0).toUpperCase() +
    (nameParts[1] ? nameParts[1].charAt(0).toUpperCase() : "");
  return initials;
}

document.querySelector('.back-arrow').addEventListener('click', function () {
  // Add a class to hide the menu (e.g., sliding it out)
  document.querySelector('.menu').classList.remove("open");
  document.querySelector('.profile-menu').classList.remove('profile-menu-open');
});

document.querySelector('#profile-button').addEventListener('click', function () {
  document.querySelector('.menu').classList.add("open");
  document.querySelector('.profile-menu').classList.add('profile-menu-open');
});

document.querySelector('#profileName').addEventListener('click', function () {
  const profileNameDiv = this;
  const currentName = profileNameDiv.innerText;

  // Create an input field for editing
  const inputField = document.createElement('input');
  inputField.type = 'text';
  inputField.value = currentName;
  inputField.classList.add('profile-name-input'); // Add a class for styling if needed

  // Replace the div with the input field
  profileNameDiv.replaceWith(inputField);
  inputField.focus();

  // Handle when the user finishes editing (e.g., pressing Enter or clicking outside)
  function saveName() {
    const updatedName = inputField.value;

    // Create a new div with the updated name
    const newProfileNameDiv = document.createElement('div');
    newProfileNameDiv.innerText = updatedName;
    newProfileNameDiv.classList.add('profile-name');
    newProfileNameDiv.id = 'profileName';

    // Replace the input field with the new div
    inputField.replaceWith(newProfileNameDiv);

    // Re-apply the event listener for future editing
    newProfileNameDiv.addEventListener('click', arguments.callee);
  }

  // Save on Enter key press
  inputField.addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
      saveName();
    }
  });

  // Save on losing focus (clicking outside)
  inputField.addEventListener('blur', saveName);
});

// Toggle dropdown visibility
function toggleDropdown() {
  const dropdown = document.getElementById('customDropdown');
  dropdown.classList.toggle('open'); // Toggle the 'open' class

  // Highlight the currently selected item (pass the selected value)
  const selectedName = document.getElementById('dropdownButton').textContent; // Get current selection from the button
  highlightSelectedItem(selectedName);
}

// Highlight the currently selected item in the dropdown
function highlightSelectedItem(selectedName) {
  const dropdownItems = document.querySelectorAll('.dropdown-item');

  dropdownItems.forEach(item => {
    const itemName = item.querySelector('span').textContent;
    const selectBar = item.querySelector('.select-bar');


    if (itemName === selectedName) {
      item.classList.add('selected-item');  // Add selected-item to the dropdown-item
      if (selectBar) {
        selectBar.classList.add('selected-item');  // Add selected-item to the select-bar
      }
    } else {
      item.classList.remove('selected-item');  // Remove selected-item from dropdown-item
      if (selectBar) {
        selectBar.classList.remove('selected-item');  // Remove selected-item from the select-bar
      }
    }
  });
}

function selectItem(element) {
  const selectedName = element.querySelector("span").textContent;
  const selectedValue = element.getAttribute("data-value"); // UUID

  // Save the GroupUUID in localStorage for persistence across sessions
  localStorage.setItem("GroupId", selectedValue); // Ensure it's saved

  // Immediately retrieve the updated GroupId and update groupId variable
  groupId = localStorage.getItem('GroupId');
  console.log("Updated GroupId in localStorage:", groupId);

  // Clear previous members (optional, if needed)
  //clearMemberMenu();

  // Update the dropdown button text
  document.getElementById('dropdownButton').textContent = selectedName;
  // Highlight the selected item and corresponding select-bar
  highlightSelectedItem(selectedName);
  // Close the dropdown after selection
  toggleDropdown();

  // Reload map data with the new GroupId
  loadMapData();
}


// Edit item function
function editItem(itemName) {
  event.stopPropagation(); // Prevent dropdown from closing when editing
  const newName = prompt("Edit the item name:", itemName);
  if (newName) {
    const dropdownItems = document.querySelectorAll(".dropdown-item span");
    dropdownItems.forEach(item => {
      if (item.textContent === itemName) {
        item.textContent = newName;
      }
    });
    alert(`${itemName} changed to ${newName}`);
  }
}

// Delete item function
function deleteItem(itemName) {
  event.stopPropagation(); // Prevent dropdown from closing when deleting
  if (confirm(`Are you sure you want to delete ${itemName}?`)) {
    const dropdownItems = document.querySelectorAll(".dropdown-item");
    dropdownItems.forEach(item => {
      if (item.querySelector("span").textContent === itemName) {
        item.remove();
      }
    });
    alert(`${itemName} deleted`);
  }
}

// Add new item to the dropdown
function addNewItem() {
  const newItemName = document.getElementById("newItemName").value;
  const newItemUUID = generateUUID();  // Generate a new UUID for the item
  if (newItemName.trim() !== "") {
    const dropdown = document.getElementById("dropdownItems");
    const footer = document.querySelector('.dropdown-footer'); // Get the footer

    // Create a new dropdown item dynamically
    const newItem = document.createElement("div");
    newItem.classList.add("dropdown-item");
    newItem.setAttribute("data-value", newItemUUID);  // Assign UUID as data-value
    newItem.setAttribute("onclick", "selectItem(this)");  // Add click handler

    const newItemText = document.createElement("span");
    newItemText.textContent = newItemName;

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.onclick = function (event) {
      event.stopPropagation();
      editItem(newItemName);
    };

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = function (event) {
      event.stopPropagation();
      deleteItem(newItemName);
    };

    newItem.appendChild(newItemText);
    //newItem.appendChild(editButton);
    //newItem.appendChild(deleteButton);

    // Insert the new item before the footer
    dropdown.insertBefore(newItem, footer);

    // Clear input field after adding the item
    document.getElementById("newItemName").value = "";
  } else {
    alert("Please enter a valid item name.");
  }
}
// Function to generate a new UUID (for simplicity)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Function to handle the "Create" button click
function createItem() {
  alert('Create button clicked');
}

// Function to handle the "Join" button click
function joinItem() {
  alert('Join button clicked');
}

// Function to fetch dropdown data from API and populate the dropdown
async function fetchDropdownData() {
  console.log("Fetching group data...");

  try {
    const response = await fetch("https://group-api-b4pm.onrender.com/api/groups/", {
      headers: {
        Authorization: `Bearer ${token}`, // Use token from sessionStorage
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Group data fetched:", data);

    if (data && data.document && Array.isArray(data.document)) {
      populateDropdown(data.document); // Call function to populate dropdown with group data
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching group data:", error);
  }
}

// Function to populate the dropdown with fetched group data
function populateDropdown(groups) {
  const dropdownItems = document.getElementById("dropdownItems");
  dropdownItems.innerHTML = ''; // Clear existing items

  groups.forEach(group => {
    const newItem = document.createElement("div");
    newItem.classList.add("dropdown-item");
    newItem.setAttribute("data-value", group.uuid); // Use the group UUID
    newItem.setAttribute("onclick", "selectItem(this)");  // Add click handler

    const selectBar = document.createElement("div");
    selectBar.classList.add("select-bar");
    const newItemText = document.createElement("span");
    newItemText.textContent = group.name; // Display the group name

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.onclick = function (event) {
      event.stopPropagation();
      editItem(group.name);
    };

    const deleteButton = document.createElement("button");
    deleteButton.textContent = "Delete";
    deleteButton.onclick = function (event) {
      event.stopPropagation();
      deleteItem(group.name);
    };
    newItem.appendChild(selectBar);
    newItem.appendChild(newItemText);
    //newItem.appendChild(editButton);
    //newItem.appendChild(deleteButton);

    // Append the new item to the dropdown
    dropdownItems.appendChild(newItem);
    initializeDropdown();
  });
}

// Call the function to fetch data and populate the dropdown when the page loads
document.addEventListener("DOMContentLoaded", function () {
  fetchDropdownData();
});

// Function to initialize the dropdown and select the corresponding group based on GroupId
function initializeDropdown() {
  // Check if a GroupId exists in localStorage
  if (groupId) {
    console.log("GroupId found in localStorage:", groupId);

    // Find the dropdown item that matches the stored GroupId
    const dropdownItems = document.querySelectorAll('.dropdown-item');
    let matchFound = false;  // Flag to check if match is found

    dropdownItems.forEach(item => {
      const itemValue = item.getAttribute('data-value');

      if (itemValue === groupId) {
        // Set this item as selected in the dropdown
        const selectedName = item.querySelector('span').textContent;
        document.getElementById('dropdownButton').textContent = selectedName; // Update button text
        console.log("Selected item:", selectedName);

        // Optionally, highlight the selected item in the dropdown list
        item.classList.add('selected-item');

        document.querySelector('.select-bar').classList.add("selected-item");
        matchFound = true;
      } else {
        item.classList.remove('selected-item');
        document.querySelector('.select-bar').classList.remove("selected-item");

      }
    });

    // If no match is found, you can handle it (e.g., set a default group or log an error)
    if (!matchFound) {
      console.log("No matching GroupId found in dropdown items.");
    }
  } else {
    console.log("No GroupId found in localStorage.");
  }
}

// Call this function after the dropdown items are populated
document.addEventListener("DOMContentLoaded", () => {
  // Ensure dropdown is populated before calling this
  initializeDropdown();
});

function getGroupId() {
  //const groupId = localStorage.getItem('GroupId');
  if (!groupId) {
    console.error("GroupId not found in localStorage!");
  }
  return groupId;
}
document.getElementById("dark-mode-toggle").addEventListener("change", function () {
  if (this.checked) {
    // Checkbox is checked (dark mode on)
    map.setStyle('mapbox://styles/mapbox/dark-v11');
    document.body.classList.remove("lightmode");
    isDarkMode = true;
  } else {
    // Checkbox is unchecked (dark mode off)
    map.setStyle('mapbox://styles/mapbox/streets-v12');
    document.body.classList.add("lightmode");
    isDarkMode = false;
  }
});

// Add source and layer whenever base style is loaded
map.on('style.load', () => {
  if (places !== null) {
    addFenceData();
  }
});


// setInterval(() => {
//   fetchmembersData(); // Fetch and update members data every 30 seconds
// }, 30000); // 30 seconds


function addFenceToMenu(fenceData) {
  const fencesDiv = document.getElementById("fencesDiv");
  console.log('adding fences to menu');
  console.log(fenceData);
  // Create a container for the fence item
  const fenceItem = document.createElement("div");
  fenceItem.className = "fence-item";
  fenceItem.setAttribute("data-fence-uuid", fenceData.uuid);  // Store fence UUID in the dataset

  // Create a div for the fence icon
  const fenceIcon = document.createElement("div");
  fenceIcon.className = "fence-icon";
  fenceIcon.innerHTML = `
    <svg display="block" height="41px" width="27px" viewBox="0 0 27 41"><g fill-rule="nonzero"><g transform="translate(3.0, 29.0)" fill="#000000"><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="10.5" ry="5.25002273"></ellipse><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="10.5" ry="5.25002273"></ellipse><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="9.5" ry="4.77275007"></ellipse><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="8.5" ry="4.29549936"></ellipse><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="7.5" ry="3.81822308"></ellipse><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="6.5" ry="3.34094679"></ellipse><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="5.5" ry="2.86367051"></ellipse><ellipse opacity="0.04" cx="10.5" cy="5.80029008" rx="4.5" ry="2.38636864"></ellipse></g><g fill="#3FB1CE"><path d="M27,13.5 C27,19.074644 20.250001,27.000002 14.75,34.500002 C14.016665,35.500004 12.983335,35.500004 12.25,34.500002 C6.7499993,27.000002 0,19.222562 0,13.5 C0,6.0441559 6.0441559,0 13.5,0 C20.955844,0 27,6.0441559 27,13.5 Z"></path></g><g opacity="0.25" fill="#000000"><path d="M13.5,0 C6.0441559,0 0,6.0441559 0,13.5 C0,19.222562 6.7499993,27 12.25,34.5 C13,35.522727 14.016664,35.500004 14.75,34.5 C20.250001,27 27,19.074644 27,13.5 C27,6.0441559 20.955844,0 13.5,0 Z M13.5,1 C20.415404,1 26,6.584596 26,13.5 C26,15.898657 24.495584,19.181431 22.220703,22.738281 C19.945823,26.295132 16.705119,30.142167 13.943359,33.908203 C13.743445,34.180814 13.612715,34.322738 13.5,34.441406 C13.387285,34.322738 13.256555,34.180814 13.056641,33.908203 C10.284481,30.127985 7.4148684,26.314159 5.015625,22.773438 C2.6163816,19.232715 1,15.953538 1,13.5 C1,6.584596 6.584596,1 13.5,1 Z"></path></g><g transform="translate(6.0, 7.0)" fill="#FFFFFF"></g><g transform="translate(8.0, 8.0)"><circle fill="#000000" opacity="0.25" cx="5.5" cy="5.5" r="5.4999962"></circle><circle fill="#FFFFFF" cx="5.5" cy="5.5" r="5.4999962"></circle></g></g></svg>`;

  // Create a div for the fence name
  const fenceName = document.createElement("div");
  fenceName.className = "fence-name";
  fenceName.innerText = fenceData.name;

  // Create a div for the edit icon
  const editIcon = document.createElement("div");
  editIcon.className = "edit-icon";
  editIcon.innerHTML = `
    <svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="#000000"
  stroke-width="2"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
</svg>`;

  // Add click event to the edit icon
  editIcon.addEventListener("click", function () {
    const fenceUUID = fenceItem.getAttribute("data-fence-uuid");
    openEditFenceModal(fenceUUID);  // Function to open modal and pass the UUID
  });

  // Append the icon, name, and edit icon to the fence item
  fenceItem.appendChild(fenceIcon);
  fenceItem.appendChild(fenceName);
  fenceItem.appendChild(editIcon);

  // Append the fence item to the main container
  fencesDiv.appendChild(fenceItem);
}

// Function to open the modal for editing a fence
function openEditFenceModalOld(fenceUUID) {
  console.log("Open modal for fence UUID:", fenceUUID);

  // Get the modal and iframe elements
  const modal = document.getElementById("fenceEditModal");
  const iframe = document.getElementById("fenceModalIframe");

  // Set the iframe source to the fences.html file
  iframe.src = `fences.html?fenceUUID=${fenceUUID}`; // Pass fenceUUID as a query parameter

  // Display the modal
  modal.style.display = "block";

  // Optionally set a data attribute for the UUID
  modal.setAttribute("data-fence-uuid", fenceUUID);
}

// Function to open the modal for editing a fence
function openEditFenceModal(fenceUUID) {
  console.log("Open modal for fence UUID:", fenceUUID);

  // Find the corresponding fence data in the places variable
  const fenceData = places.document.find(fence => fence.uuid === fenceUUID);

  if (!fenceData) {
    console.error("Fence data not found for UUID:", fenceUUID);
    return;
  }
  console.log(fenceData);
  // Pass the fence data to the modal in a way that makes sense for your implementation
  // Example: Display the data in the iframe or directly inside the modal content

  // Get the modal and iframe elements
  const modal = document.getElementById("fenceEditModal");
  const iframe = document.getElementById("fenceModalIframe");

  // Pass the fence data to the iframe (e.g., through query params or directly in the iframe content)
  iframe.src = `fences.html?fenceUUID=${fenceUUID}&name=${encodeURIComponent(fenceData.name)}&lat=${(fenceData.latitude)
    }&long=${(fenceData.longitude)}&radius=${fenceData.radius}&groupid=${groupId}`; // Pass fenceUUID and other data as query params
  console.log("Iframe URL: ", iframe.src);

  // Display the modal
  modal.style.display = "block";

  // Optionally, set a data attribute for the UUID on the modal for future reference
  modal.setAttribute("data-fence-uuid", fenceUUID);
}


// Function to close the modal
function closeModal() {
  const modal = document.getElementById("fenceEditModal");
  modal.style.display = "none";  // Hide the modal
}

// Add event listener to the close button
document.querySelector('.close').addEventListener('click', closeModal);

// Also, ensure the modal can close if clicked outside the modal content
window.onclick = function (event) {
  const modal = document.getElementById("fenceEditModal");
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
// Set an interval to update member markers every 15 seconds
setInterval(() => {
  fetchmembersData(); // Fetch and update members data every 15 seconds
}, 15000); // 15 seconds
