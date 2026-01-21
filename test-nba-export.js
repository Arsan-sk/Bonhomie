/**
 * Test NBA Export Function
 * Run: node test-nba-export.js
 */

// Mock escape function
function escapeCSVField(field) {
    if (field === null || field === undefined) return ''
    const stringField = String(field)
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
        return `"${stringField.replace(/"/g, '""')}"`
    }
    return stringField
}

// NBA CSV Generator (copied from csvExport.js)
function generateNBACSV(registrations) {
    const rows = []
    
    const addRow = (...cells) => {
        rows.push(cells.map(c => escapeCSVField(c || '')).join(','))
    }
    
    const categories = ['Cultural', 'Sports', 'Technical']
    const categoryStats = {}
    
    categories.forEach(categoryName => {
        const categoryRegs = registrations.filter(reg => reg.event?.category === categoryName)
        const soloRegs = categoryRegs.filter(reg => reg.event?.subcategory === 'Individual')
        const teamRegs = categoryRegs.filter(reg => reg.event?.subcategory === 'Group')
        
        const soloEvents = new Set(soloRegs.map(reg => reg.event?.id).filter(Boolean))
        const teamEvents = new Set(teamRegs.map(reg => reg.event?.id).filter(Boolean))
        
        const soloRegistered = soloRegs.length
        const soloActual = soloRegs.filter(reg => reg.status === 'confirmed').length
        const teamCount = teamRegs.length
        
        let teamParticipants = 0
        teamRegs.forEach(reg => {
            teamParticipants += 1
            if (reg.team_members && Array.isArray(reg.team_members)) {
                teamParticipants += reg.team_members.length
            }
        })
        
        categoryStats[categoryName] = {
            soloEvents: soloEvents.size,
            teamEvents: teamEvents.size,
            totalEvents: soloEvents.size + teamEvents.size,
            soloRegistered,
            soloActual,
            teamCount,
            teamParticipants,
            totalParticipants: soloActual + teamParticipants
        }
        
        const totalParticipationTeamWise = `${soloEvents.size}+${teamEvents.size}=${soloEvents.size + teamEvents.size}`
        const totalParticipants = `${soloActual}+${teamParticipants}=${soloActual + teamParticipants}`
        
        addRow(categoryName.toUpperCase())
        addRow()
        addRow('SR NO', 'SOLO', '', '', '')
        addRow('', '', 'REGISTERED', 'ACTUAL PARTICIPATION', '')
        addRow('1', 'EVENTS', soloEvents.size, soloEvents.size, '')
        addRow('2', 'PARTICIPANTS', soloRegistered, soloActual, '')
        addRow()
        addRow('SR NO', 'TEAMS', '', '', '')
        addRow('1', 'EVENTS', teamEvents.size, '', '')
        addRow('2', 'TEAMS', teamCount, '', '')
        addRow('3', 'PARTICIPANTS IN THE TEAMS', teamParticipants, '', '')
        addRow('TOTAL PARTICIPATION TEAM/', totalParticipationTeamWise, '', '', '')
        addRow('TOTAL PARTICIPANTS', totalParticipants, '', '', '')
        addRow()
        addRow()
    })
    
    addRow('NBA REQUIREMENTS')
    addRow()
    addRow('SR NO', 'EVENT', 'NO OF EVENT', 'NO OF TEAMS', 'PARTICIPANTS', 'Registered')
    
    let totalEvents = 0
    let totalTeams = 0
    let totalParticipants = 0
    let srNo = 1
    
    categories.forEach(categoryName => {
        const stats = categoryStats[categoryName]
        totalEvents += stats.totalEvents
        totalTeams += stats.teamCount
        totalParticipants += stats.totalParticipants
        
        addRow(srNo++, categoryName.toUpperCase(), stats.totalEvents, stats.teamCount, stats.totalParticipants, 'Registered')
    })
    
    addRow(srNo, 'TOTAL', totalEvents, totalTeams, totalParticipants, totalParticipants)
    
    return rows.join('\n')
}

// Test with sample data
console.log('=== TEST 1: Empty Data ===\n')
const emptyResult = generateNBACSV([])
console.log(emptyResult)
console.log('\n\n')

// Test with sample data matching the provided screenshot
console.log('=== TEST 2: Sample Data (Similar to Screenshot) ===\n')
const sampleData = [
    // Cultural - Solo
    { event: { id: 1, category: 'Cultural', subcategory: 'Individual' }, status: 'confirmed' },
    { event: { id: 1, category: 'Cultural', subcategory: 'Individual' }, status: 'confirmed' },
    { event: { id: 2, category: 'Cultural', subcategory: 'Individual' }, status: 'pending' },
    
    // Cultural - Teams
    { event: { id: 3, category: 'Cultural', subcategory: 'Group' }, status: 'confirmed', team_members: [{}, {}] }, // 3 total
    { event: { id: 3, category: 'Cultural', subcategory: 'Group' }, status: 'confirmed', team_members: [{}, {}, {}] }, // 4 total
    { event: { id: 4, category: 'Cultural', subcategory: 'Group' }, status: 'confirmed', team_members: [{}, {}] }, // 3 total
    
    // Sports - Solo
    { event: { id: 5, category: 'Sports', subcategory: 'Individual' }, status: 'confirmed' },
    { event: { id: 5, category: 'Sports', subcategory: 'Individual' }, status: 'confirmed' },
    { event: { id: 6, category: 'Sports', subcategory: 'Individual' }, status: 'confirmed' },
    
    // Sports - Teams
    { event: { id: 7, category: 'Sports', subcategory: 'Group' }, status: 'confirmed', team_members: [{}, {}] },
    { event: { id: 7, category: 'Sports', subcategory: 'Group' }, status: 'confirmed', team_members: [{}] },
    
    // Technical - Solo
    { event: { id: 8, category: 'Technical', subcategory: 'Individual' }, status: 'confirmed' },
    
    // Technical - Teams (none)
]

const sampleResult = generateNBACSV(sampleData)
console.log(sampleResult)
console.log('\n\n=== CSV structure created successfully! ===')
