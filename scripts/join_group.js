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

