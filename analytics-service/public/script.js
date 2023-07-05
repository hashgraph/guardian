const BASE_URL = location.href + 'analytics';

document.addEventListener('DOMContentLoaded', () => {
    onInit();
})

async function onInit() {
    const users = await loadUsers();
    console.log(users);
}

async function loadUsers() {
    try {
        const result = await fetch(`${BASE_URL}/users`);
        if (result.status === 200) {
            const data = await result.json();
            return data;
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}