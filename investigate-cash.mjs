import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function investigateCashPayments() {
    console.log('🔍 Investigating cash payments...\n')

    // Get all confirmed registrations with payment_mode='cash'
    const { data: cashRegs, error } = await supabase
        .from('registrations')
        .select(`
            id,
            profile_id,
            payment_mode,
            status,
            team_members,
            registered_at,
            event:events(id, name, fee, subcategory),
            profile:profiles(roll_number, full_name)
        `)
        .eq('payment_mode', 'cash')
        .eq('status', 'confirmed')
        .order('registered_at', { ascending: false })

    if (error) {
        console.error('❌ Error fetching cash registrations:', error)
        return
    }

    console.log(`Found ${cashRegs.length} cash payment registrations\n`)
    console.log('='.repeat(80))

    let totalCashRevenue = 0
    const details = []

    cashRegs.forEach((reg, index) => {
        const isLeader = reg.team_members && reg.team_members.length > 0
        const teamSize = isLeader ? reg.team_members.length + 1 : 1
        const eventFee = reg.event?.fee || 0

        // Check if this is a team member
        let isTeamMember = false
        if (!isLeader && reg.profile_id && reg.event?.id) {
            isTeamMember = cashRegs.some(otherReg =>
                otherReg.event?.id === reg.event.id &&
                otherReg.team_members?.some(m => m.id === reg.profile_id)
            )
        }

        const detail = {
            index: index + 1,
            regId: reg.id.slice(0, 8),
            participant: reg.profile?.full_name || 'Unknown',
            rollNumber: reg.profile?.roll_number || 'N/A',
            event: reg.event?.name || 'Unknown',
            eventFee: eventFee,
            eventType: reg.event?.subcategory || 'Unknown',
            isLeader,
            teamSize,
            isTeamMember,
            shouldCount: !isTeamMember,
            registeredAt: new Date(reg.registered_at).toLocaleString()
        }

        details.push(detail)

        // Only count if not a team member
        if (!isTeamMember) {
            totalCashRevenue += eventFee
        }
    })

    // Print details
    details.forEach(d => {
        console.log(`\n${d.index}. ${d.participant} (${d.rollNumber})`)
        console.log(`   Event: ${d.event}`)
        console.log(`   Type: ${d.eventType} ${d.isLeader ? '(Team Leader)' : d.isTeamMember ? '(Team Member)' : '(Individual)'}`)
        console.log(`   Event Fee: ₹${d.eventFee}`)
        console.log(`   Team Size: ${d.teamSize}`)
        console.log(`   Count in Revenue: ${d.shouldCount ? 'YES ✓' : 'NO (team member)'}`)
        console.log(`   Registered: ${d.registeredAt}`)
        console.log('   ' + '-'.repeat(70))
    })

    console.log('\n' + '='.repeat(80))
    console.log(`\n💰 TOTAL CASH REVENUE: ₹${totalCashRevenue}`)
    console.log(`\n📊 BREAKDOWN:`)
    console.log(`   - Total cash registrations in DB: ${cashRegs.length}`)
    console.log(`   - Team leaders: ${details.filter(d => d.isLeader).length}`)
    console.log(`   - Team members: ${details.filter(d => d.isTeamMember).length}`)
    console.log(`   - Individual participants: ${details.filter(d => !d.isLeader && !d.isTeamMember).length}`)
    console.log(`   - Counted in revenue: ${details.filter(d => d.shouldCount).length}`)

    // If revenue is 60, explain
    if (totalCashRevenue === 60) {
        console.log(`\n🔍 EXPLANATION OF ₹60:`)
        const counted = details.filter(d => d.shouldCount)
        if (counted.length === 1 && counted[0].eventFee === 60) {
            console.log(`   ✓ 1 team event registration at ₹60 per team`)
        } else if (counted.length === 2 && counted.every(d => d.eventFee === 30)) {
            console.log(`   ✓ 2 individual event registrations at ₹30 each`)
        } else {
            console.log(`   ℹ️  Custom combination:`)
            counted.forEach(d => {
                console.log(`      - ${d.event}: ₹${d.eventFee}`)
            })
        }
    }

    console.log('\n')
}

investigateCashPayments().catch(console.error)
