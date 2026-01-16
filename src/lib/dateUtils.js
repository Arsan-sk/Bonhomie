// Utility function to calculate actual event date from day_number and global settings
export const calculateEventDate = (dayNumber, festStartDate) => {
    if (!dayNumber || !festStartDate) return null

    const startDate = new Date(festStartDate)
    const eventDate = new Date(startDate)
    eventDate.setDate(startDate.getDate() + (dayNumber - 1))

    return eventDate
}

// Format event date as readable string
export const formatEventDate = (dayNumber, festStartDate) => {
    const date = calculateEventDate(dayNumber, festStartDate)
    if (!date) return 'TBA'

    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

// Get day label with date
export const getDayLabel = (dayNumber, festStartDate) => {
    const date = calculateEventDate(dayNumber, festStartDate)
    if (!date) return `Day ${dayNumber}`

    const formattedDate = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    })

    return `Day ${dayNumber} (${formattedDate})`
}

// Convert 24-hour time format to 12-hour AM/PM format
export const formatTime12Hour = (time24) => {
    if (!time24) return 'TBA'

    // time24 format: "HH:MM:SS" or "HH:MM"
    const timeParts = time24.split(':')
    let hours = parseInt(timeParts[0])
    const minutes = timeParts[1]

    const period = hours >= 12 ? 'PM' : 'AM'

    // Convert to 12-hour format
    if (hours === 0) {
        hours = 12 // Midnight
    } else if (hours > 12) {
        hours = hours - 12
    }

    return `${hours}:${minutes} ${period}`
}
