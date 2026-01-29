import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [assignedEventIds, setAssignedEventIds] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
                setAssignedEventIds([])
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId) => {
        try {
            console.log('Fetching profile for userId:', userId)

            // First try to fetch by profile.id = userId (self-registered users)
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()

            console.log('Method 1 (by id):', data ? 'Found' : 'Not found')

            // If not found, try by auth_user_id (offline profiles linked to auth)
            if (!data && !error) {
                const result = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('auth_user_id', userId)
                    .maybeSingle()

                data = result.data
                error = result.error
                console.log('Method 2 (by auth_user_id):', data ? 'Found' : 'Not found')
            }

            // If still not found, try by email (fallback)
            if (!data && !error) {
                const { data: { user: authUser } } = await supabase.auth.getUser()
                console.log('Method 3 trying email:', authUser?.email)
                if (authUser?.email) {
                    const result = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('college_email', authUser.email)
                        .maybeSingle()

                    data = result.data
                    error = result.error
                    console.log('Method 3 (by email):', data ? 'Found' : 'Not found', error ? 'Error:' + error.message : '')
                }
            }

            if (error) {
                console.error('Error fetching profile:', error)
            } else if (data) {
                console.log('Profile found:', data.college_email, data.full_name)

                // Validate profile has required fields
                if (!data.full_name || data.full_name.trim() === '' || data.full_name === 'New User') {
                    console.warn('⚠️ Profile has empty or default full_name:', data.full_name)
                    console.warn('This user may have been affected by the registration bug.')
                    console.warn('User should contact admin or logout/login after database fix is applied.')
                }

                setProfile(data)

                // Fetch assigned events for coordinators
                if (data.role === 'coordinator') {
                    const { data: assignments, error: assignError } = await supabase
                        .from('event_assignments')
                        .select('event_id')
                        .eq('coordinator_id', userId)

                    if (!assignError && assignments) {
                        setAssignedEventIds(assignments.map(a => a.event_id))
                    }
                }
            } else {
                console.error('Profile not found for user:', userId)
            }
        } catch (error) {
            console.error('Error:', error)
        } finally {
            setLoading(false)
        }
    }

    // Improved signOut that handles errors gracefully
    const handleSignOut = async () => {
        try {
            // Clear local state first
            setUser(null)
            setProfile(null)
            setAssignedEventIds([])

            // Then try to sign out from Supabase
            const { error } = await supabase.auth.signOut()
            if (error) {
                console.warn('SignOut warning (can be ignored):', error.message)
            }
        } catch (err) {
            // Even if signOut fails, user is logged out locally
            console.warn('SignOut error (can be ignored):', err)
        }
        return { error: null }
    }

    const value = {
        user,
        profile,
        assignedEventIds,
        loading,
        isAdmin: profile?.role === 'admin',
        isCoordinator: profile?.role === 'coordinator',
        isStudent: profile?.role === 'student',
        signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
        signUp: (email, password, metaData) => supabase.auth.signUp({ email, password, options: { data: metaData } }),
        signOut: handleSignOut,
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
