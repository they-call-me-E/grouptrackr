document.addEventListener('DOMContentLoaded', function () {
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

    // Function to handle the "Create" button click
    function createItem() {
        openCreateGroupModal();
    }

    // Ensure the createItem function is accessible globally if needed
    window.createItem = createItem;
});
