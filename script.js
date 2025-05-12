// const token = sessionStorage.getItem('token');
if (!token) {
  window.location.href = 'Auth/login.html'
}
const userName = sessionStorage.getItem('name');
//const userAvatar = 'https://group-api-b4pm.onrender.com/img/users/' + sessionStorage.getItem('avatar');
const userAvatar = sessionStorage.getItem('avatar');
//const userAvatar = 'https://raw.githubusercontent.com/they-call-me-E/Sharptools/main/CustomeTile/Mapviewer/pngimg.com%20-%20deadpool_PNG15.png';
const avatarBG = getRandomColor();


const userId = sessionStorage.getItem('uuid');
console.log("Current UserID: ", userId);

console.log("Avatar URL from sessionStorage:", userAvatar);
const markers = {}; // Object to store markers by member ID
let groupId = localStorage.getItem('GroupId');
console.log("groupID: ", groupId);

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

  // Clear all the previous fences from the fences div
  const fencesDiv = document.getElementById("fencesDiv");
  fencesDiv.innerHTML = ''; // Clear all the previous members
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
      //avatarImg.src = userAvatar;
      document.querySelector('.profile-img').src = userAvatar;

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
    alert("Failed to fetch geofence data. Please try again later.");
  }
}

// Add geofence to the map
function addGeofence(geofence, color) {

  if (geofence.latitude == null || geofence.longitude == null) {
    console.log(`Skipping geofence with UUID ${geofence.uuid} due to missing latitude or longitude.`);
    return; // Exit the function if coordinates are missing
  }
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

function addFenceToMenu_old(fenceData) {
  // Check if latitude and longitude are present
  if (fenceData.latitude == null || fenceData.longitude == null) {
    console.log(`Skipping menu entry for fence with UUID ${fenceData.uuid} due to missing latitude or longitude.`);
    return; // Exit the function if coordinates are missing
  }
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
  fenceIcon.addEventListener("click", function () {
    map.flyTo({
      center: [fenceData.longitude, fenceData.latitude],
      zoom: 15,
      essential: true // This ensures the transition is smooth
    });
  });
  // Create a div for the fence name
  const fenceName = document.createElement("div");
  fenceName.className = "fence-name";
  fenceName.innerText = fenceData.name;
  fenceName.addEventListener("click", function () {
    map.flyTo({
      center: [fenceData.longitude, fenceData.latitude],
      zoom: 15,
      essential: true // This ensures the transition is smooth
    });
    document.body.classList.remove("menu-open");
  });

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
function addFenceToMenu(fenceData) {
  // Check if latitude and longitude are present
  if (fenceData.latitude == null || fenceData.longitude == null) {
    console.log(`Skipping menu entry for fence with UUID ${fenceData.uuid} due to missing latitude or longitude.`);
    return; // Exit the function if coordinates are missing
  }

  const fencesDiv = document.getElementById("fencesDiv");

  console.log('Adding fence to menu:', fenceData);

  // Create a container for the fence item
  const fenceItem = document.createElement("div");
  fenceItem.className = "fence-item";
  fenceItem.setAttribute("data-fence-uuid", fenceData.uuid);       // Store fence UUID
  fenceItem.setAttribute("data-latitude", fenceData.latitude);     // Store latitude
  fenceItem.setAttribute("data-longitude", fenceData.longitude);   // Store longitude

  // Create a div for the fence icon
  const fenceIcon = document.createElement("div");
  fenceIcon.className = "fence-icon";
  fenceIcon.innerHTML = `
    <svg display="block" height="41px" width="27px" viewBox="0 0 27 41">
      <g fill-rule="nonzero">
        <g transform="translate(3.0, 29.0)" fill="#000000">
          <ellipse opacity="0.04" cx="10.5" cy="5.80029" rx="10.5" ry="5.25002"></ellipse>
          <!-- Additional ellipses can be included here if needed -->
        </g>
        <g fill="#3FB1CE">
          <path d="M27,13.5 C27,19.0746 20.25,27 14.75,34.5 C14.0167,35.5 12.9833,35.5 12.25,34.5 C6.75,27 0,19.2226 0,13.5 C0,6.04416 6.04416,0 13.5,0 C20.9558,0 27,6.04416 27,13.5 Z"></path>
        </g>
        <g opacity="0.25" fill="#000000">
          <path d="M13.5,0 C6.04416,0 0,6.04416 0,13.5 C0,19.2226 6.75,27 12.25,34.5 C13,35.5227 14.0167,35.5 14.75,34.5 C20.25,27 27,19.0746 27,13.5 C27,6.04416 20.9558,0 13.5,0 Z M13.5,1 C20.4154,1 26,6.5846 26,13.5 C26,15.8987 24.4956,19.1814 22.2207,22.7383 C19.9458,26.2951 16.7051,30.1422 13.9434,33.9082 C13.7434,34.1808 13.6127,34.3227 13.5,34.4414 C13.3873,34.3227 13.2566,34.1808 13.0566,33.9082 C10.2845,30.128 7.41487,26.3142 5.01562,22.7734 C2.61638,19.2327 1,15.9535 1,13.5 C1,6.5846 6.5846,1 13.5,1 Z"></path>
        </g>
        <g transform="translate(8.0, 8.0)">
          <circle fill="#000000" opacity="0.25" cx="5.5" cy="5.5" r="5.5"></circle>
          <circle fill="#FFFFFF" cx="5.5" cy="5.5" r="5.5"></circle>
        </g>
      </g>
    </svg>
  `;

  // Update event listener to use data attributes
  fenceIcon.addEventListener("click", function () {
    const latStr = fenceItem.getAttribute("data-latitude");
    const lonStr = fenceItem.getAttribute("data-longitude");
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (!isNaN(lat) && !isNaN(lon)) {
      map.flyTo({
        center: [lon, lat],
        zoom: 15,
        essential: true
      });
    } else {
      console.error('Invalid coordinates:', lat, lon);
    }
  });

  // Create a div for the fence name
  const fenceName = document.createElement("div");
  fenceName.className = "fence-name";
  fenceName.innerText = fenceData.name;

  // Update event listener to use data attributes
  fenceName.addEventListener("click", function () {
    const latStr = fenceItem.getAttribute("data-latitude");
    const lonStr = fenceItem.getAttribute("data-longitude");
    const lat = parseFloat(latStr);
    const lon = parseFloat(lonStr);

    if (!isNaN(lat) && !isNaN(lon)) {
      map.flyTo({
        center: [lon, lat],
        zoom: 15,
        essential: true
      });
      document.body.classList.remove("menu-open");
    } else {
      console.error('Invalid coordinates:', lat, lon);
    }
  });

  // Create a div for the edit icon
  const editIcon = document.createElement("div");
  editIcon.className = "edit-icon";
  editIcon.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg"
         width="24"
         height="24"
         viewBox="0 0 24 24"
         fill="none"
         stroke="#000000"
         stroke-width="2"
         stroke-linecap="round"
         stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  `;

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


async function fetchmembersData() {
  console.log("Fetching members data...");

  if (!groupId) {
    console.error("GroupId not found in localStorage!");
    return;
  }

  try {
    const response = await fetch(
      `https://group-api-b4pm.onrender.com/api/groups/${groupId}/members`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
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
        updateOrAddMemberMarker(member, bgColor); // Update or add the marker
        updateOrAddMemberToMenu(member, bgColor); // Update or add the member in the menu
      });
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching members data:", error);
  }
}

function updateOrAddMemberToMenu(memberData, bgColor) {
  const membersDiv = document.getElementById("membersDiv");
  const memberId = memberData.uuid || memberData._id; // Unique member ID

  // Check if member has valid location data
  if (
    !memberData.location ||
    memberData.location.latitude == null ||
    memberData.location.longitude == null
  ) {
    console.warn(`Member ${memberData.name} does not have valid location data. Skipping menu addition.`);
    return; // Exit the function early
  }

  // Try to find the existing member in the DOM by their uuid
  let existingMember = document.querySelector(`[data-member-id="${memberId}"]`);

  if (existingMember) {
    // Update existing member's data (e.g., speed, name, etc.)
    const memberName = existingMember.querySelector(".card-member-name");
    const memberSpeed = existingMember.querySelector(".card-member-speed-value");

    if (memberName) {
      memberName.textContent = memberData.name;
    }
    if (memberSpeed) {
      const speed = memberData.status?.speed;
      if (speed != null) {
        memberSpeed.textContent = `${speed} MPH`;
      } else {
        memberSpeed.textContent = `Speed: N/A`;
      }
    }
  } else {
    // Create new member entry if not found
    const memberBox = document.createElement("div");
    memberBox.className = "member-box";
    memberBox.setAttribute("data-member-id", memberId); // Set a unique identifier

    // No need to set styles here if handled in CSS
    // memberBox.style.userSelect = "none";
    // memberBox.style.cursor = "pointer";

    const avatarDiv = document.createElement("div");
    avatarDiv.className = "member-avatar";

    if (memberData.avatar) {
      const img = document.createElement("img");
      img.src = memberData.avatar;

      img.onerror = function () {
        avatarDiv.removeChild(img);
        const initialsDiv = document.createElement("div");
        initialsDiv.classList.add("init-cir");
        initialsDiv.textContent = getInitials(memberData.name);
        initialsDiv.style.backgroundColor = bgColor;
        avatarDiv.appendChild(initialsDiv);
      };

      avatarDiv.appendChild(img);
    } else {
      const initialsDiv = document.createElement("div");
      initialsDiv.classList.add("init-cir");
      initialsDiv.textContent = getInitials(memberData.name);
      initialsDiv.style.backgroundColor = bgColor;
      avatarDiv.appendChild(initialsDiv);
    }

    memberBox.appendChild(avatarDiv);

    // Safely access speed
    const speed = memberData.status?.speed;

    // Create content elements
    const contentDiv = document.createElement("div");
    contentDiv.className = "member-content"; // For additional styling if needed

    const memberNameDiv = document.createElement("div");
    memberNameDiv.className = "card-member-name";
    memberNameDiv.textContent = memberData.name;

    const memberSpeedDiv = document.createElement("div");
    memberSpeedDiv.className = "card-member-speed";
    memberSpeedDiv.textContent = speed != null ? `Speed: ${speed} MPH` : `Speed: N/A`;

    // Append content to contentDiv
    contentDiv.appendChild(memberNameDiv);
    contentDiv.appendChild(memberSpeedDiv);

    // Append contentDiv to memberBox
    memberBox.appendChild(contentDiv);

    membersDiv.appendChild(memberBox);

    // Attach click event to fly to the member's marker location
    memberBox.addEventListener("click", function () {
      if (
        memberData.location &&
        memberData.location.latitude != null &&
        memberData.location.longitude != null
      ) {
        const lat = memberData.location.latitude;
        const lng = memberData.location.longitude;
        map.flyTo({
          center: [lng, lat],
          zoom: 15,
          essential: true,
        });
        document.body.classList.remove("menu-open");
      } else {
        console.warn(`Member ${memberData.name} does not have location data.`);
      }
    });
  }
}


function updateOrAddMemberMarker(memberData, bgColor) {
  const { latitude, longitude } = memberData.location;
  const memberId = memberData.uuid || memberData._id; // Unique member ID

  if (!memberData || !memberData.location || memberData.location.latitude == null || memberData.location.longitude == null) {
    console.warn(`Member ${memberData.name} does not have valid location data.`);
    return; // Exit the function if location data is missing
  }


  // Correctly retrieve isMoving and speed from memberData.status
  const is_moving = memberData.status?.isMoving ?? false; // Default to false
  const speed = memberData.status?.speed ?? 0; // Default to 0


  // Declare markerEl and marker to be accessible in both if and else blocks
  let markerEl;
  let marker;

  // Check if the marker for this member already exists
  if (markers[memberId]) {
    // Get current marker
    marker = markers[memberId];
    const currentLngLat = marker.getLngLat();
    const newLngLat = { lng: longitude, lat: latitude };

    // Smoothly move marker
    moveMarker(marker, currentLngLat, newLngLat, 1000); // Move over 1 second

    // Update badge if moving and speed > 5
    markerEl = marker.getElement();
    const badgeDiv = markerEl.querySelector(".badge");

    if (is_moving && speed > 5) {
      if (!badgeDiv) {
        // Add new badge if not present
        console.log(
          `Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`
        );

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
          newBadgeDiv.style.visibility = "hidden"; // Change to visibility
        }
      } else {
        // Update badge with new speed
        console.log(
          `Updating badge for member: ${memberData.name} with speed: ${speed} mph`
        );
        badgeDiv.querySelector(".badge-speed").textContent = `${speed} mph`;

        // Hide or show badge based on location_sharing
        badgeDiv.style.visibility = memberData.status.location_sharing
          ? "visible"
          : "hidden";
      }
    } else if (badgeDiv) {
      // Remove badge if no longer moving or speed <= 5
      console.log(
        `Removing badge for member: ${memberData.name} (Not moving or speed <= 5 mph)`
      );
      badgeDiv.style.visibility = "hidden"; // Use visibility instead of display
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
      avatarImg.src = memberData.avatar;

      // Handle image load success
      avatarImg.onload = function () {
        // Remove initialsDiv and innerCircle, show the image
        circleDiv.removeChild(innerCircle);
        circleDiv.appendChild(avatarImg);
      };

      // Handle image load error (keep initialsDiv displayed)
      avatarImg.onerror = function () {
        console.error(
          "Avatar image failed to load for member:",
          memberData.name
        );
        // The initialsDiv remains; no further action needed
      };
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
      console.log(
        `Adding badge for moving member: ${memberData.name} (Speed: ${speed} mph)`
      );

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
      img.src = memberData.avatar;
      expandedDiv.appendChild(img);
    }

    expandedDiv.appendChild(expandedCircleDiv);

    // Add content to the expanded marker (for popup)
    const screenStatus = memberData.status.device.screen ? "On" : "Off";
    // const speed = memberData.status?.speed;
    const content = `
      <div class="content">
        <strong class="popup-member-name">${memberData.name}</strong><br>
       <span class="popup-member-speed">${speed != null ? `Speed: ${speed} MPH` : `Speed: N/A`}</span>
        <span class="popup-screen-on">Screen:</span><span class="popup-screen-on-value"> ${screenStatus}</span>
        <span class="popup-lat">Lat:</span><span class="popup-lat-value">${latitude}</span>
        <span class="popup-long">Long:</span><span class="popup-long-value">${longitude}</span>
        <span class="popup-battery-level">${memberData.status.device.battery_level}%</span>
        <span class="popup-member-address">Address: </span><span class="popup-member-address-value">${memberData.location.address}</span>
        ${memberData.status.device.charging
        ? `
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
        `
        : `
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
        `
      }
       <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="#000000"
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="popup-wifi-icon ${memberData?.status?.device?.wifi ? "true" : "false"
      }"
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
    marker = new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
      offset: [20, 10], // Adjust the Y offset if needed
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    markers[memberId] = marker; // Store marker by member ID

    // Set markerEl to the newly created element
    markerEl = el;
  }

  // Update click event for both existing and new markers
  markerEl.onclick = function () {
    console.log(`Marker clicked: ${memberData.name}`);

    // Fly to the marker's location
    map.flyTo({
      center: [longitude, latitude],
      zoom: 15,
      essential: true,
    });


  };
  markerEl.ondblclick = function () {
    expandMarker();
  };

  // Attach long-press event for touch devices
  markerEl.addEventListener('touchstart', function (e) {
    e.preventDefault();
    pressTimer = setTimeout(function () {
      expandMarker();
    }, 500);
  }, false);

  markerEl.addEventListener('touchend', function (e) {
    clearTimeout(pressTimer);
  }, false);

  function expandMarker() {
    console.log(`Marker Double clicked: ${memberData.name}`);
    const expandedDiv = markerEl.querySelector(".marker-expanded");
    const circleDiv = markerEl.querySelector(".circle-div");

    if (expandedDiv.style.display === "none") {
      expandedDiv.style.display = "block";
      circleDiv.style.display = "none"; // Hide circle when expanded

      // Append the expandedDiv to the map's container
      document.getElementById("map").appendChild(expandedDiv);

      // Function to update position dynamically
      function updateExpandedMarkerPosition() {
        const markerLngLat = marker.getLngLat(); // Use 'marker' instead of 'currentMarker'
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
      expandedDiv
        .querySelector(".close-btn")
        .addEventListener("click", function (e) {
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
document.getElementById("toggle-menu").addEventListener("click", function () {
  document.body.classList.add("menu-open");
});

// Close the menu with the close button
document.getElementById("close-menu").addEventListener("click", function () {
  document.body.classList.remove("menu-open");
});

// Toggle the hidden members div with dynamic height
document.getElementById("members-btn").addEventListener("click", function () {
  const membersCon = document.getElementById('membersCon');
  const membersDiv = document.getElementById("membersDiv");
  const fencesCon = document.getElementById("fencesCon");
  const fencesDiv = document.getElementById("fencesDiv");
  // Toggle membersDiv
  if (membersDiv.classList.contains("open")) {
    membersDiv.classList.remove("open");
    membersCon.classList.remove("open");
    // membersDiv.style.opacity = 0;  // Hide the div
  } else {
    membersDiv.classList.add("open");
    membersCon.classList.add("open");
    // membersDiv.style.opacity = 1;  // Show the div
  }

  // Ensure fencesDiv is not affected
  // fencesDiv.style.opacity = 0;
  fencesCon.classList.remove("open");
  fencesDiv.classList.remove("open");
});

document.getElementById("places-btn").addEventListener("click", function () {

  const membersCon = document.getElementById('membersCon');
  const membersDiv = document.getElementById("membersDiv");
  const fencesCon = document.getElementById("fencesCon");
  const fencesDiv = document.getElementById("fencesDiv");

  // Toggle fencesDiv

  if (fencesDiv.classList.contains("open")) {
    fencesDiv.classList.remove("open");
    fencesCon.classList.remove("open");
    // fencesDiv.style.opacity = 0;  // Hide the div
  } else {
    fencesDiv.classList.add("open");
    fencesCon.classList.add("open");
    // fencesDiv.style.opacity = 1;  // Show the div
  }

  // Ensure membersDiv is not affected
  // membersDiv.style.opacity = 0;
  membersDiv.classList.remove("open");
  membersCon.classList.remove("open");
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
function highlightSelectedItem_old(selectedName) {
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
function highlightSelectedItem(selectedName) {
  const dropdownItems = document.querySelectorAll('.dropdown-item');

  dropdownItems.forEach(item => {
    const spanElement = item.querySelector('span');
    if (!spanElement) {
      // Skip this item if no span element is found
      return;
    }
    const itemName = spanElement.textContent;
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
function createGroup() {
  // alert('Create button clicked');
  openCreateGroupModal();
}

// Function to handle the "Join" button click
function joinGroup() {
  // alert('Join button clicked');
  openJoinGroupModal();
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
      initializeDropdown();
    } else {
      console.error("Unexpected data structure:", data);
    }
  } catch (error) {
    console.error("Error fetching group data:", error);
  }
}

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

    newItem.appendChild(selectBar);
    newItem.appendChild(newItemText);

    // Append the new item to the dropdown
    dropdownItems.appendChild(newItem);
  });

  // Create a dropdown item to hold both buttons
  const buttonsItem = document.createElement('div');
  buttonsItem.classList.add('dropdown-item', 'dropdown-buttons-item');

  // Create the "Create" button
  const createButton = document.createElement('button');
  createButton.textContent = 'Create';
  createButton.classList.add('dropdown-button');
  createButton.onclick = createGroup; // Attach the createGroup function
  createButton.addEventListener('click', createGroup);
  // Create the "Join" button
  const joinButton = document.createElement('button');
  joinButton.textContent = 'Join';
  joinButton.classList.add('dropdown-button');
  // joinButton.id.add('joinGroupModalTrigger');
  joinButton.onclick = joinGroup; // Attach the joinGroup function
  joinButton.addEventListener('click', joinGroup);

  // Append both buttons to the buttonsItem div
  buttonsItem.appendChild(createButton);
  buttonsItem.appendChild(joinButton);

  // Append the buttonsItem to the dropdown
  dropdownItems.appendChild(buttonsItem);
}



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
    }&lon=${(fenceData.longitude)}&radius=${fenceData.radius}&groupid=${groupId}`; // Pass fenceUUID and other data as query params
  console.log("Iframe URL: ", iframe.src);

  // Display the modal
  modal.style.display = "block";

  // Optionally, set a data attribute for the UUID on the modal for future reference
  modal.setAttribute("data-fence-uuid", fenceUUID);
}

function openCreateFenceModal() {
  // Get the current center of the map
  const center = map.getCenter();
  const latitude = center.lat;
  const longitude = center.lng;

  const modal = document.getElementById("fenceEditModal");
  const iframe = document.getElementById("fenceModalIframe");

  // Prepare the URL for the iframe, including the latitude and longitude as query parameters
  iframe.src = `fences.html?create=true&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&groupid=${encodeURIComponent(groupId)}`;

  modal.style.display = 'block';
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

window.addEventListener('message', function (event) {
  console.log('Message received from child:', event.data);
  console.log('Event origin:', event.origin);

  // Security check: Ensure the message is coming from a trusted origin
  if (
    event.origin !== 'http://127.0.0.1:5500' &&
    event.origin !== 'http://localhost' &&
    event.origin !== 'https://your-trusted-origin.com'
  ) {
    console.warn('Untrusted origin:', event.origin);
    return;
  }
  if (event.data.action === 'geofenceSaved') {
    const fenceUUID = event.data.fenceUUID;
    const latitude = parseFloat(event.data.latitude);
    const longitude = parseFloat(event.data.longitude);
    const radius = event.data.radius;
    const name = event.data.name;
    console.log('Updating geofence with UUID:', fenceUUID);
    if (isNaN(latitude) || isNaN(longitude)) {
      console.error('Invalid coordinates received from child window.');
      return;
    }

    // Update geofence and menu
    updateGeofenceOnMap(fenceUUID, latitude, longitude, event.data.radius, event.data.name);
    updateFenceInMenu(fenceUUID, event.data.name, latitude, longitude);

    // Close the modal if requested
    if (event.data.closeModal) {
      console.log('Calling closeModal()');
      closeModal();
    } else {
      console.log('closeModal flag not set');
    }
  }

  if (event.data.action === 'geofenceDeleted') {
    const fenceUUID = event.data.fenceUUID;
    console.log('Processing geofence deletion for UUID:', fenceUUID);

    // Remove the geofence from the map and menu
    removeGeofenceFromMap(fenceUUID);
    removeFenceFromMenu(fenceUUID);

    // Close the modal if requested
    if (event.data.closeModal) {
      console.log('Calling closeModal()');
      closeModal();
    } else {
      console.log('closeModal flag not set');
    }
  }
});
function updateGeofenceOnMap(fenceUUID, latitude, longitude, radius, name) {
  console.log('Updating geofence on map:', fenceUUID);

  // First, remove the existing geofence
  removeGeofenceFromMap(fenceUUID);

  // Create a new geofence object with the updated data
  const updatedGeofence = {
    uuid: fenceUUID,
    latitude: latitude,
    longitude: longitude,
    radius: radius,
    name: name
  };

  // Add the updated geofence to the map
  const color = isDarkMode ? "#FFFFFF" : "#FFFFFF"; // Adjust color if needed
  addGeofence(updatedGeofence, color);
}
function updateFenceInMenu_old(fenceUUID, name, latitude, longitude) {
  console.log('Updating fence in menu:', fenceUUID);

  // Find the fence item in the menu
  const fenceItem = document.querySelector(`[data-fence-uuid="${fenceUUID}"]`);

  if (fenceItem) {
    // Update the fence name in the menu
    const fenceNameElement = fenceItem.querySelector('.fence-name');
    if (fenceNameElement) {
      fenceNameElement.textContent = name;

      // Update the click event listener to use the new coordinates
      // Remove existing event listeners
      fenceNameElement.replaceWith(fenceNameElement.cloneNode(true));
      const newFenceNameElement = fenceItem.querySelector('.fence-name');

      newFenceNameElement.addEventListener("click", function () {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true
        });
        document.body.classList.remove("menu-open");
      });
    }

    // Update the latitude and longitude displayed in the menu
    const fenceLatElement = fenceItem.querySelector('.fence-latitude');
    const fenceLonElement = fenceItem.querySelector('.fence-longitude');

    if (fenceLatElement) {
      fenceLatElement.textContent = `Lat: ${latitude.toFixed(6)}`;
      // Update click event listener
      fenceLatElement.replaceWith(fenceLatElement.cloneNode(true));
      const newFenceLatElement = fenceItem.querySelector('.fence-latitude');
      newFenceLatElement.addEventListener("click", function () {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true
        });
      });
    }

    if (fenceLonElement) {
      fenceLonElement.textContent = `Lon: ${longitude.toFixed(6)}`;
      // Update click event listener
      fenceLonElement.replaceWith(fenceLonElement.cloneNode(true));
      const newFenceLonElement = fenceItem.querySelector('.fence-longitude');
      newFenceLonElement.addEventListener("click", function () {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true
        });
      });
    }

    // Update the fence icon click event listener
    const fenceIconElement = fenceItem.querySelector('.fence-icon');
    if (fenceIconElement) {
      // Remove existing event listeners
      fenceIconElement.replaceWith(fenceIconElement.cloneNode(true));
      const newFenceIconElement = fenceItem.querySelector('.fence-icon');
      newFenceIconElement.addEventListener("click", function () {
        map.flyTo({
          center: [longitude, latitude],
          zoom: 15,
          essential: true
        });
      });
    }

    // Update the edit icon click event listener (if necessary)
    const editIconElement = fenceItem.querySelector('.edit-icon');
    if (editIconElement) {
      // Ensure the edit icon still opens the modal with updated data
      editIconElement.replaceWith(editIconElement.cloneNode(true));
      const newEditIconElement = fenceItem.querySelector('.edit-icon');
      newEditIconElement.addEventListener("click", function () {
        openEditFenceModal(fenceUUID);
      });
    }
  } else {
    // If the fence item doesn't exist, add it to the menu
    const updatedGeofence = {
      uuid: fenceUUID,
      name: name,
      latitude: latitude,
      longitude: longitude
      // Include other properties as needed
    };
    addFenceToMenu(updatedGeofence);
  }
}

function updateFenceInMenu(fenceUUID, name, latitude, longitude) {
  console.log('Updating fence in menu:', fenceUUID);

  // Find the fence item in the menu
  const fenceItem = document.querySelector(`[data-fence-uuid="${fenceUUID}"]`);

  if (fenceItem) {
    // Update data attributes with new coordinates
    fenceItem.setAttribute("data-latitude", latitude);
    fenceItem.setAttribute("data-longitude", longitude);

    // Update the fence name
    const fenceNameElement = fenceItem.querySelector('.fence-name');
    if (fenceNameElement) {
      fenceNameElement.textContent = name;
    }

    // Update other elements as needed...
  } else {
    // If the fence item doesn't exist, add it to the menu
    const updatedGeofence = {
      uuid: fenceUUID,
      name: name,
      latitude: latitude,
      longitude: longitude
      // Include other properties as needed
    };
    addFenceToMenu(updatedGeofence);
  }
}


function updateFenceInMenu_old(fenceUUID, name) {
  console.log('Updating fence in menu:', fenceUUID);

  // Find the fence item in the menu
  const fenceItem = document.querySelector(`[data-fence-uuid="${fenceUUID}"]`);

  if (fenceItem) {
    // Update the fence name in the menu
    const fenceNameElement = fenceItem.querySelector('.fence-name');
    if (fenceNameElement) {
      fenceNameElement.textContent = name;
    }
  } else {
    // If the fence item doesn't exist, add it to the menu
    const updatedGeofence = {
      uuid: fenceUUID,
      name: name,
      latitude: latitude,
      longitude: longitude,
      radius: radius
    };
    addFenceToMenu(updatedGeofence);
  }
}


function removeGeofenceFromMap(fenceUUID) {
  // Remove geofence layers
  const fillLayerId = fenceUUID;
  const circleLayerId = fenceUUID + "-circle";

  if (map.getLayer(fillLayerId)) {
    map.removeLayer(fillLayerId);
  }
  if (map.getLayer(circleLayerId)) {
    map.removeLayer(circleLayerId);
  }
  if (map.getSource(fillLayerId)) {
    map.removeSource(fillLayerId);
  }
  if (map.getSource(circleLayerId)) {
    map.removeSource(circleLayerId);
  }

  // Remove the marker associated with the geofence
  if (markers[fenceUUID]) {
    markers[fenceUUID].remove(); // Remove the marker from the map
    delete markers[fenceUUID];   // Remove the marker from the markers object
  }
}

function removeFenceFromMenu(fenceUUID) {
  // Remove the fence item from the menu
  const fenceItem = document.querySelector(`[data-fence-uuid="${fenceUUID}"]`);
  if (fenceItem) {
    fenceItem.parentNode.removeChild(fenceItem);
  }
}


// Get modal elements
const createGroupModal = document.getElementById('createGroupModal');
const createGroupModalClose = document.getElementById('createGroupModalClose');
const saveGroupButton = document.getElementById('saveGroupButton');
const cancelGroupButton = document.getElementById('cancelGroupButton');

// Function to open the modal
function openCreateGroupModal() {
  createGroupModal.style.display = 'block';
}

// Function to close the modal
function closeCreateGroupModal() {
  createGroupModal.style.display = 'none';
}

// Event listeners for closing the modal
createGroupModalClose.addEventListener('click', closeCreateGroupModal);
cancelGroupButton.addEventListener('click', closeCreateGroupModal);

// Close the modal when clicking outside of the modal content
window.addEventListener('click', function (event) {
  if (event.target == createGroupModal) {
    closeCreateGroupModal();
  }
});

// Handle the Save button click
saveGroupButton.addEventListener('click', function () {
  const groupNameInput = document.getElementById('groupNameInput');
  const groupName = groupNameInput.value.trim();

  if (groupName === '') {
    alert('Please enter a group name.');
    return;
  }

  // Call the function to create the group (you'll implement this)
  createNewGroup(groupName);

  // Close the modal
  closeCreateGroupModal();

  // Clear the input field
  groupNameInput.value = '';
});

// Function to create a new group (you need to implement the API call)
function createNewGroup(groupName) {
  // Example: Show an alert (replace with your API call)
  alert(`Group "${groupName}" created!`);

  // TODO: Implement the API call to create the group
  // After creating the group, refresh the dropdown list
  // fetchDropdownData(); // Uncomment if you have this function
}

// Get modal elements for joining a group
const joinGroupModal = document.getElementById('joinGroupModal');
const joinGroupModalClose = document.getElementById('joinGroupModalClose');
const joinGroupButton = document.getElementById('joinGroupButton');
const cancelJoinGroupButton = document.getElementById('cancelJoinGroupButton');

// Function to open the join group modal
function openJoinGroupModal() {
  joinGroupModal.style.display = 'block';
}

// Function to close the join group modal
function closeJoinGroupModal() {
  joinGroupModal.style.display = 'none';
}

// Event listeners for closing the modal
joinGroupModalClose.addEventListener('click', closeJoinGroupModal);
cancelJoinGroupButton.addEventListener('click', closeJoinGroupModal);

// Close the modal when clicking outside of the modal content
window.addEventListener('click', function (event) {
  if (event.target == joinGroupModal) {
    closeJoinGroupModal();
  }
});

// Handle the Join button click
joinGroupButton.addEventListener('click', function () {
  const groupCodeInput = document.getElementById('groupCodeInput');
  const groupCode = groupCodeInput.value.trim();

  if (groupCode === '') {
    alert('Please enter a valid group code or link.');
    return;
  }

  // Call the function to join the group (you'll implement this)
  joinExistingGroup(groupCode);

  // Close the modal
  closeJoinGroupModal();

  // Clear the input field
  groupCodeInput.value = '';
});

// Function to join an existing group (you need to implement the API call)
function joinExistingGroup(groupCode) {
  // Example: Show an alert (replace with your API call)
  alert(`Attempting to join group with code "${groupCode}".`);

  // TODO: Implement the API call to join the group
  // After joining the group, refresh the dropdown list or redirect the user
  // fetchDropdownData(); // Uncomment if you have this function
}


// JavaScript code to handle the profile picture upload
document.addEventListener("DOMContentLoaded", function () {
  // Get the profile image element
  const profileImage = document.querySelector('.profile-img');

  // Add a click event listener to open file selection dialog
  profileImage.addEventListener('click', function () {
    // Create a hidden input element to select files
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';  // Only allow image files
    fileInput.style.display = 'none';

    // Append the input to the body and trigger click
    document.body.appendChild(fileInput);
    fileInput.click();

    // When a file is selected, upload it
    fileInput.addEventListener('change', function () {
      const file = fileInput.files[0];
      if (file) {
        console.log('File selected:', file);
        uploadAvatar(file);
      }
    });
  });

  // Function to upload avatar
  function uploadAvatar(file) {
    // Get userId from sessionStorage
    const userId = sessionStorage.getItem('uuid');
    if (!userId) {
      console.error('User ID not found in sessionStorage');
      return;
    }

    // Construct the URL for the user's avatar upload
    const uploadUrl = `https://group-api-b4pm.onrender.com/api/users/${userId}`;

    // Create a FormData object to hold the file
    const formData = new FormData();
    formData.append('avatar', file);  // 'avatar' is the key expected by the server

    // Log formData to see if it's correctly formed
    for (let pair of formData.entries()) {
      console.log(pair[0] + ':', pair[1]);
    }

    // Set up the fetch request
    fetch(uploadUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${sessionStorage.getItem('token')}`  // Add the token from sessionStorage
      },
      body: formData
    })
      .then(response => {
        console.log('Response status:', response.status, response.data);
        if (!response.ok) {
          throw new Error(`Error: ${response.statusText}`);
        }
        return response.json();
      })
      .then(data => {
        alert('Avatar uploaded successfully!');
        console.log('Response data:', data);
        // Optionally update the profile image source to the new uploaded image
        if (data.avatarUrl) {
          profileImage.src = data.avatarUrl;
        }
      })
      .catch(error => {
        console.error('Error uploading avatar:', error);
        alert(`Error uploading avatar: ${error.message}`);
      });
  }
});
// Ensure the DOM is fully loaded before attaching the event listener
document.addEventListener('DOMContentLoaded', function () {
  const fencesSettingsBtn = document.getElementById('fences-settings-btn');

  if (fencesSettingsBtn) {
    fencesSettingsBtn.addEventListener('click', function () {
      // Your code here
      console.log('Fences settings button clicked.');
      // For example, open the settings modal or toggle visibility
      openCreateFenceModal();
    });
  } else {
    console.error('Element with ID "fences-settings-btn" not found.');
  }
});



let isFetchingMembers = false;

setInterval(async () => {
  if (isFetchingMembers) return;

  try {
    isFetchingMembers = true;
    await fetchmembersData();
  } catch (err) {
    console.error("Interval fetchmembersData error:", err);
  } finally {
    isFetchingMembers = false;
  }
}, 5000);