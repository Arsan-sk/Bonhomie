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
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error) {
                console.error('Error fetching profile:', error)
            } else {
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
            }
        } catch (error) {
            console.error('Error:', error)
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
