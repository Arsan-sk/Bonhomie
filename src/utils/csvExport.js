/**
 * CSV Export Utilities
 * Handles CSV generation and download for analytics data
 */

/**
 * Escape CSV field to handle special characters
 */
export function escapeCSVField(field) {
    if (field === null || field === undefined) return ''

    const stringField = String(field)

    // If field contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`
    }

    return stringField
}

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV(data, headers) {
    if (!data || data.length === 0) return ''

    // Create header row
    const headerRow = headers.map(h => escapeCSVField(h.label)).join(',')

    // Create data rows
    const dataRows = data.map(row => {
        return headers.map(h => {
            const value = h.key ? row[h.key] : row[h.label]
            return escapeCSVField(value)
        }).join(',')
    })

    return [headerRow, ...dataRows].join('\n')
}

/**
 * Download CSV file
 */
export function downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')

    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
    }
}

/**
 * Format date for filename
 */
export function getFormattedDate() {
    const now = new Date()
    return now.toISOString().split('T')[0] // YYYY-MM-DD
}

/**
 * Generate participant CSV data for individual events
 */
export function generateIndividualParticipantsCSV(registrations) {
    // Group by category
    const cultural = []
    const sports = []
    const technical = []

    registrations.forEach(reg => {
        const category = reg.event?.category
        if (category === 'Cultural') cultural.push(reg)
        else if (category === 'Sports') sports.push(reg)
        else if (category === 'Technical') technical.push(reg)
    })

    // Group registrations by event within each category
    const groupByEvent = (items) => {
        const grouped = {}
        items.forEach(reg => {
            const eventId = reg.event?.id
            if (!grouped[eventId]) grouped[eventId] = []
            grouped[eventId].push(reg)
        })
        return grouped
    }

    // Flatten data with proper numbering
    let eventNo = 1
    const data = []

    // Process each category in order
    ;[
        { name: 'Cultural', items: cultural },
        { name: 'Sports', items: sports },
        { name: 'Technical', items: technical }
    ].forEach(category => {
        const eventGroups = groupByEvent(category.items)
        
        Object.values(eventGroups).forEach(eventRegs => {
            const currentEventNo = eventNo++
            
            eventRegs.forEach((reg, idx) => {
                data.push({
                    'Event No': idx === 0 ? currentEventNo : '',
                    'Event Name': idx === 0 ? (reg.event?.name || 'N/A') : '',
                    'Member No': idx + 1,
                    'Roll Number': reg.profile?.roll_number || 'N/A',
                    'Name': reg.profile?.full_name || 'N/A',
                    'Email': reg.profile?.college_email || 'N/A',
                    'School': reg.profile?.school || 'N/A',
                    'Department': reg.profile?.department || 'N/A',
                    'Year of Study': reg.profile?.year_of_study || 'N/A',
                    'Gender': reg.profile?.gender || 'N/A',
                    'Phone': reg.profile?.phone || 'N/A',
                    'Category': category.name
                })
            })
        })
    })

    return data
}

/**
 * Generate participant CSV data for team events
 */
export function generateTeamParticipantsCSV(registrations) {
    // Group by category
    const cultural = []
    const sports = []
    const technical = []

    registrations.forEach(reg => {
        const category = reg.event?.category
        if (category === 'Cultural') cultural.push(reg)
        else if (category === 'Sports') sports.push(reg)
        else if (category === 'Technical') technical.push(reg)
    })

    // Group registrations by event within each category
    const groupByEvent = (items) => {
        const grouped = {}
        items.forEach(reg => {
            const eventId = reg.event?.id
            if (!grouped[eventId]) grouped[eventId] = []
            grouped[eventId].push(reg)
        })
        return grouped
    }

    // Flatten data with team members
    let eventNo = 1
    const data = []

    ;[
        { name: 'Cultural', items: cultural },
        { name: 'Sports', items: sports },
        { name: 'Technical', items: technical }
    ].forEach(category => {
        const eventGroups = groupByEvent(category.items)
        
        Object.values(eventGroups).forEach(eventRegs => {
            const currentEventNo = eventNo++
            let teamNo = 1
            let isFirstRowOfEvent = true
            
            // Only process registrations with team_members (actual team leaders)
            // Skip registrations with empty team_members as they are already included in someone's team
            const teamLeaderRegs = eventRegs.filter(reg => reg.team_members && reg.team_members.length > 0)
            
            teamLeaderRegs.forEach(reg => {
                const currentTeamNo = teamNo++
                const teamMembers = reg.team_members || []
                let isFirstRowOfTeam = true

                // Team registration - add team leader as member 1
                data.push({
                    'Event No': isFirstRowOfEvent ? currentEventNo : '',
                    'Event Name': isFirstRowOfEvent ? (reg.event?.name || 'N/A') : '',
                    'Team No': isFirstRowOfTeam ? currentTeamNo : '',
                    'Member No': 1,
                    'Roll Number': reg.profile?.roll_number || 'N/A',
                    'Name': reg.profile?.full_name || 'N/A',
                    'Email': reg.profile?.college_email || 'N/A',
                    'School': reg.profile?.school || 'N/A',
                    'Department': reg.profile?.department || 'N/A',
                    'Year of Study': reg.profile?.year_of_study || 'N/A',
                    'Gender': reg.profile?.gender || 'N/A',
                    'Phone': reg.profile?.phone || 'N/A',
                    'Category': category.name
                })
                isFirstRowOfEvent = false
                isFirstRowOfTeam = false

                // Then add team members from array as member 2, 3, etc.
                teamMembers.forEach((member, idx) => {
                    data.push({
                        'Event No': '',
                        'Event Name': '',
                        'Team No': '',
                        'Member No': idx + 2,
                        'Roll Number': member.roll_number || 'N/A',
                        'Name': member.full_name || 'N/A',
                        'Email': member.email || member.college_email || 'N/A',
                        'School': member.school || 'N/A',
                        'Department': member.department || 'N/A',
                        'Year of Study': member.year_of_study || 'N/A',
                        'Gender': member.gender || 'N/A',
                        'Phone': member.phone || 'N/A',
                        'Category': category.name
                    })
                })
            })
        })
    })

    return data
}

/**
 * Generate payment CSV data with summary
 * Filters out team members - only shows team leaders (who made the payment) and individual participants
 */
export function generatePaymentCSV(registrations) {
    // Filter out team members using same logic as payment analytics
    const filteredRegs = registrations.filter(reg => {
        const isLeader = reg.team_members && reg.team_members.length > 0
        
        // If it's a leader, include it
        if (isLeader) return true
        
        // Check if this registration is a team member by searching within same event
        let isTeamMember = false
        if (reg.profile_id && reg.event?.id) {
            isTeamMember = registrations.some(otherReg =>
                otherReg.event?.id === reg.event.id && // Same event only
                otherReg.team_members &&
                otherReg.team_members.length > 0 &&
                otherReg.team_members.some(member => member.id === reg.profile_id)
            )
        }
        
        // Include if NOT a team member (i.e., individual participant)
        return !isTeamMember
    })

    // Calculate summaries
    let totalRevenue = 0
    const paymentModeTotals = {}
    const eventTotals = {}

    filteredRegs.forEach(reg => {
        const fee = reg.event?.fee || 0
        const mode = reg.payment_mode || 'hybrid'
        const eventName = reg.event?.name || 'Unknown'

        totalRevenue += fee
        paymentModeTotals[mode] = (paymentModeTotals[mode] || 0) + fee
        eventTotals[eventName] = (eventTotals[eventName] || 0) + fee
    })

    // Group registrations by event
    const eventGroups = {}
    filteredRegs.forEach(reg => {
        const eventId = reg.event?.id
        if (!eventGroups[eventId]) eventGroups[eventId] = []
        eventGroups[eventId].push(reg)
    })

    let eventNo = 1
    const data = []

    // Add payment records
    Object.values(eventGroups).forEach(eventRegs => {
        const currentEventNo = eventNo++
        
        eventRegs.forEach((reg, idx) => {
            const isTeam = reg.team_members && reg.team_members.length > 0
            const participantName = reg.profile?.full_name || 'N/A'

            data.push({
                'Event No': idx === 0 ? currentEventNo : '',
                'Event Name': idx === 0 ? (reg.event?.name || 'N/A') : '',
                'Registration Type': isTeam ? 'Team' : 'Individual',
                'Participant Name': participantName,
                'Transaction ID': reg.transaction_id || 'N/A',
                'Payment Mode': reg.payment_mode || 'N/A',
                'Amount': reg.event?.fee || 0,
                'Status': reg.status || 'N/A',
                'Payment Date': reg.registered_at ? new Date(reg.registered_at).toLocaleDateString() : 'N/A'
            })
        })
    })

    // Add empty rows
    data.push({
        'Event No': '', 'Event Name': '', 'Registration Type': '', 'Participant Name': '',
        'Transaction ID': '', 'Payment Mode': '', 'Amount': '', 'Status': '', 'Payment Date': ''
    })
    data.push({
        'Event No': '', 'Event Name': '', 'Registration Type': '', 'Participant Name': '',
        'Transaction ID': '', 'Payment Mode': '', 'Amount': '', 'Status': '', 'Payment Date': ''
    })

    // Add Payment Mode Summary
    data.push({
        'Event No': 'PAYMENT MODE SUMMARY',
        'Event Name': '', 'Registration Type': '', 'Participant Name': '',
        'Transaction ID': '', 'Payment Mode': '', 'Amount': '', 'Status': '', 'Payment Date': ''
    })
    
    Object.entries(paymentModeTotals).forEach(([mode, amount]) => {
        data.push({
            'Event No': '',
            'Event Name': mode.toUpperCase(),
            'Registration Type': '',
            'Participant Name': '',
            'Transaction ID': '',
            'Payment Mode': '',
            'Amount': amount,
            'Status': '',
            'Payment Date': ''
        })
    })

    // Add empty row
    data.push({
        'Event No': '', 'Event Name': '', 'Registration Type': '', 'Participant Name': '',
        'Transaction ID': '', 'Payment Mode': '', 'Amount': '', 'Status': '', 'Payment Date': ''
    })

    // Add Event Revenue Summary
    data.push({
        'Event No': 'EVENT REVENUE SUMMARY',
        'Event Name': '', 'Registration Type': '', 'Participant Name': '',
        'Transaction ID': '', 'Payment Mode': '', 'Amount': '', 'Status': '', 'Payment Date': ''
    })

    Object.entries(eventTotals)
        .sort((a, b) => b[1] - a[1])
        .forEach(([eventName, amount]) => {
            data.push({
                'Event No': '',
                'Event Name': eventName,
                'Registration Type': '',
                'Participant Name': '',
                'Transaction ID': '',
                'Payment Mode': '',
                'Amount': amount,
                'Status': '',
                'Payment Date': ''
            })
        })

    // Add empty row
    data.push({
        'Event No': '', 'Event Name': '', 'Registration Type': '', 'Participant Name': '',
        'Transaction ID': '', 'Payment Mode': '', 'Amount': '', 'Status': '', 'Payment Date': ''
    })

    // Add Total Revenue
    data.push({
        'Event No': 'TOTAL REVENUE',
        'Event Name': '',
        'Registration Type': '',
        'Participant Name': '',
        'Transaction ID': '',
        'Payment Mode': '',
        'Amount': totalRevenue,
        'Status': '',
        'Payment Date': ''
    })

    return data
}
