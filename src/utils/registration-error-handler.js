// Enhanced error handling for registration
// Place this in Register.jsx catch block (lines 81-98)

} catch (err) {
    console.error('Registration error:', err)

    // Parse error and provide user-friendly messages
    let errorMessage = 'Registration failed. Please try again.'

    // Check error message content for specific issues
    const errorText = err.message?.toLowerCase() || ''

    // Specific error messages from database trigger
    if (errorText.includes('email already registered')) {
        errorMessage = '❌ This email is already registered. Please use a different email or try logging in.'
    }
    else if (errorText.includes('roll number already registered')) {
        errorMessage = '❌ This roll number is already registered. Please check your roll number or contact admin.'
    }
    else if (errorText.includes('invalid email domain')) {
        errorMessage = '❌ Invalid email domain. Only @aiktc.ac.in and @bonhomie.com emails are allowed.'
    }
    else if (errorText.includes('missing required information')) {
        errorMessage = '❌ Please fill in all required fields and try again.'
    }
    // Generic duplicate errors
    else if (errorText.includes('duplicate') || errorText.includes('already exists')) {
        errorMessage = '❌ Email or Roll Number already exists. Please use different credentials.'
    }
    else if (errorText.includes('user already registered')) {
        errorMessage = '❌ Account already exists with this email. Try logging in instead.'
    }
    // Rate limiting
    else if (errorText.includes('rate limit') || errorText.includes('too many')) {
        errorMessage = '⏳ Too many attempts. Please wait a few minutes and try again.'
    }
    // Network issues
    else if (errorText.includes('network') || errorText.includes('connection')) {
        errorMessage = '🌐 Network error. Please check your internet connection.'
    }
    // Password issues
    else if (errorText.includes('password')) {
        errorMessage = '🔒 Password must be at least 6 characters long.'
    }
    // Database errors
    else if (errorText.includes('database error')) {
        errorMessage = '❌ Server error. Please try again in a few moments.'
    }
    // Show actual message if it's clear and short
    else if (err.message && err.message.length < 150) {
        errorMessage = `❌ ${err.message}`
    }

    setError(errorMessage)
} finally {
    setIsLoading(false)
}
