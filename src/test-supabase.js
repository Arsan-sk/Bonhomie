import { supabase } from './lib/supabase'

// Test Supabase connection
async function testSupabaseConnection() {
    console.log('Testing Supabase connection...')

    // Test 1: Check if client is initialized
    console.log('Supabase client:', supabase ? '✓ Initialized' : '✗ Not initialized')

    // Test 2: Try to fetch from profiles table
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1)

        if (error) {
            console.error('❌ Profiles table error:', error.message)
        } else {
            console.log('✓ Profiles table accessible')
        }
    } catch (err) {
        console.error('❌ Profiles table exception:', err)
    }

    // Test 3: Try to fetch from events table
    try {
        const { data, error } = await supabase
            .from('events')
            .select('*')
            .limit(5)

        if (error) {
            console.error('❌ Events table error:', error.message)
        } else {
            console.log('✓ Events table accessible, found', data?.length || 0, 'events')
            console.log('Sample events:', data)
        }
    } catch (err) {
        console.error('❌ Events table exception:', err)
    }

    // Test 4: Try to fetch from registrations table
    try {
        const { data, error } = await supabase
            .from('registrations')
            .select(`
                *,
                event:events(name, fee),
                profile:profiles(full_name, email)
            `)
            .limit(5)

        if (error) {
            console.error('❌ Registrations table error:', error.message)
            console.error('Error details:', error)
        } else {
            console.log('✓ Registrations table accessible, found', data?.length || 0, 'registrations')
            console.log('Sample registrations:', data)
        }
    } catch (err) {
        console.error('❌ Registrations table exception:', err)
    }

    // Test 5: Check auth status
    try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
            console.error('❌ Auth error:', error.message)
        } else if (user) {
            console.log('✓ User authenticated:', user.email)
        } else {
            console.log('⚠ No user authenticated')
        }
    } catch (err) {
        console.error('❌ Auth exception:', err)
    }
}

// Run the test
testSupabaseConnection()

export default testSupabaseConnection
