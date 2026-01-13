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
