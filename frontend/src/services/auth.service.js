// Add this to your existing authService object
export const authService = {
    // ... existing methods
    updateProfile: async (userData) => {
        try {
            const response = await api.put('/users/profile', userData);
            // Update the stored user data
            if (response.data.user) {
                localStorage.setItem('user', JSON.stringify(response.data.user));
            }
            return response;
        } catch (error) {
            throw error;
        }
    },
};
