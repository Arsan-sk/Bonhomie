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
                fetchProfile(session.user.id, session.user)
            } else {
                setLoading(false)
            }
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id, session.user)
            } else {
                setProfile(null)
                setAssignedEventIds([])
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    /**
     * Create a profile for the user if one doesn't exist
     * This is a fallback mechanism in case the database trigger fails
     */
    const createProfileFallback = async (authUser) => {
        try {
            const metadata = authUser.user_metadata || {}
            
            const profileData = {
                id: authUser.id,
                role: metadata.role || 'student',
                full_name: metadata.full_name || 'New User',
                college_email: authUser.email,
                roll_number: metadata.roll_number || null,
                school: metadata.school || null,
                department: metadata.department || null,
                program: metadata.program || null,
                year_of_study: metadata.year_of_study || null,
                admission_year: metadata.admission_year || null,
                expected_passout_year: metadata.expected_passout_year || null,
                phone: metadata.phone || null,
                gender: metadata.gender || null,
                is_admin_created: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }

            console.log('Creating fallback profile for user:', authUser.id)
            
            const { data, error } = await supabase
                .from('profiles')
                .upsert(profileData, { 
                    onConflict: 'id',
                    ignoreDuplicates: false 
                })
                .select()
                .single()

            if (error) {
                console.error('Error creating fallback profile:', error)
                // Return a minimal profile object so UI doesn't break
                return {
                    id: authUser.id,
                    full_name: metadata.full_name || authUser.email?.split('@')[0] || 'User',
                    college_email: authUser.email,
                    role: metadata.role || 'student'
                }
            }

            console.log('Fallback profile created successfully:', data)
            return data
        } catch (error) {
            console.error('Exception creating fallback profile:', error)
            // Return minimal profile to prevent UI from breaking
            return {
                id: authUser.id,
                full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
                college_email: authUser.email,
                role: authUser.user_metadata?.role || 'student'
            }
        }
    }

    const fetchProfile = async (userId, authUser = null) => {
        try {
            // First, try to fetch the profile by ID (normal case)
            let { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle()  // Use maybeSingle instead of single to avoid error on no match

            // If no profile found by ID, try by email (handles offline profile case)
            if (!data && authUser?.email) {
                const { data: emailData, error: emailError } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('college_email', authUser.email)
                    .maybeSingle()

                if (emailData) {
                    data = emailData
                    error = emailError
                    
                    // If found by email but ID doesn't match, this is an offline profile
                    // Update it to link with auth user
                    if (emailData.id !== userId) {
                        console.log('Found offline profile, linking to auth user:', userId)
                        await supabase
                            .from('profiles')
                            .update({ auth_user_id: userId, updated_at: new Date().toISOString() })
                            .eq('id', emailData.id)
                    }
                }
            }

            // If still no profile found, create one as fallback
            if (!data && authUser) {
                console.warn('No profile found for user, creating fallback:', userId)
                data = await createProfileFallback(authUser)
            }

            if (error && error.code !== 'PGRST116') {
                // PGRST116 is "no rows returned" which we handle above
                console.error('Error fetching profile:', error)
            }

            if (data) {
                setProfile(data)

                // Fetch assigned events for coordinators
                if (data.role === 'coordinator') {
                    const { data: assignments, error: assignError } = await supabase
                        .from('event_assignments')
                        .select('event_id')
                        .eq('coordinator_id', data.id)  // Use profile.id, not userId

                    if (!assignError && assignments) {
                        setAssignedEventIds(assignments.map(a => a.event_id))
                    }
                }
            } else {
                console.error('Could not fetch or create profile for user:', userId)
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error)
        } finally {
            setLoading(false)
        }
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
        signOut: () => supabase.auth.signOut(),
    }

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
