import { useState, useEffect } from 'react'
import { useParams, Link, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit2, Users, DollarSign, BarChart3, Clock, Calendar, MapPin, Download, Check, X as XIcon, Search, Plus, Trash2, Eye, Activity, ChevronDown, ChevronUp, User, AlertCircle } from 'lucide-react'
import SmartTable from '../../components/admin/ui/SmartTable'
import { AdminInput, AdminSelect } from '../../components/admin/ui/AdminForm'
import ProfilePage from '../../components/profile/ProfilePage'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { getUnsplashImageUrl, getCategoryImage } from '../../utils/unsplashHelper'
import AnimatedBannerFallback from '../../components/ui/AnimatedBannerFallback'

export default function CoordinatorEventManage() {
    const { id } = useParams()
    const location = useLocation()
    const [activeTab, setActiveTab] = useState('overview')
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [expandedTeams, setExpandedTeams] = useState(new Set()) // Track which teams are expanded
    const [showMembersOnly, setShowMembersOnly] = useState(false) // Toggle for members view

    // Determine the back link based on current path
    const isAdminPath = location.pathname.includes('/admin/')
    const backLink = isAdminPath ? '/admin/advanced-management' : '/coordinator/events'

    // Participants State
    const [participants, setParticipants] = useState([])
    const [loadingParticipants, setLoadingParticipants] = useState(false)
    const [participantSearch, setParticipantSearch] = useState('')

    // Results State
    const [loadingResults, setLoadingResults] = useState(false)
    const [resultForm, setResultForm] = useState({ first_place: '', second_place: '', third_place: '' })
    const [announcingResults, setAnnouncingResults] = useState(false)

    // Control Tab State
    const [isGoingLive, setIsGoingLive] = useState(false)
    const [showDateWarning, setShowDateWarning] = useState(false)
    const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: null })

    // Payments State
    const [payments, setPayments] = useState([])
    const [loadingPayments, setLoadingPayments] = useState(false)
    const [paymentModeFilter, setPaymentModeFilter] = useState('all') // 'all', 'cash', 'online'
    const [screenshotModal, setScreenshotModal] = useState({ isOpen: false, url: '' })
    const [selectedProfile, setSelectedProfile] = useState(null) // For viewing participant profile
    const [bannerImageError, setBannerImageError] = useState(false)

    // Replace Member State
    const [replaceModal, setReplaceModal] = useState({ isOpen: false, memberId: null, memberName: '' })
    const [replaceRollNumber, setReplaceRollNumber] = useState('')
    const [isReplacing, setIsReplacing] = useState(false)

    // Add Member State
    const [addMemberModal, setAddMemberModal] = useState({ isOpen: false, leaderId: null, leaderName: '' })
    const [addMemberRollNumber, setAddMemberRollNumber] = useState('')
    const [isAddingMember, setIsAddingMember] = useState(false)

    // Offline Registration State - Add Participant Modal (Individual Events)
    const [addParticipantModal, setAddParticipantModal] = useState({
        isOpen: false,
        rollNumber: '',
        loading: false,
        profile: null,
        error: null,
        alreadyRegistered: false,
        registrationDetails: null
    })

    // Offline Registration State - Create Profile Modal
    const [createProfileModal, setCreateProfileModal] = useState({
        isOpen: false,
        rollNumber: '',
        fullName: '',
        phone: '',
        email: '',
        gender: 'male', // Default to male
        loading: false,
        error: null,
        returnToAddParticipant: false, // Track if we should return to add participant after creation (individual events)
        returnToAddTeam: false // Track if we should assign as team leader after creation (group events)
    })

    // Offline Registration State - Add Team Modal (Group Events)
    const [addTeamModal, setAddTeamModal] = useState({
        isOpen: false,
        step: 1, // 1 = Leader, 2 = Members
        leaderRollNumber: '',
        leaderProfile: null,
        memberSearch: '',
        searchResults: [],
        selectedMembers: [],
        loading: false,
        error: null,
        creatingMemberInline: false,
        inlineCreateData: { rollNumber: '', fullName: '', phone: '', gender: 'male' }
    })

    useEffect(() => {
        fetchEventDetails()
    }, [id])

    useEffect(() => {
        if (activeTab === 'overview' || activeTab === 'participants' || activeTab === 'analytics') fetchParticipants()
        if (activeTab === 'payments') fetchPayments()
    }, [activeTab, id])

    const toggleTeamExpansion = (registrationId) => {
        setExpandedTeams(prev => {
            const newSet = new Set(prev)
            if (newSet.has(registrationId)) {
                newSet.delete(registrationId)
            } else {
                newSet.add(registrationId)
            }
            return newSet
        })
    }

    const fetchEventDetails = async () => {
        setLoading(true)
        const { data, error } = await supabase.from('events').select('*').eq('id', id).single()
        if (error) console.error('Error fetching event:', error)
        else setEvent(data)
        setLoading(false)
    }

    const fetchParticipants = async () => {
        setLoadingParticipants(true)
        const { data, error } = await supabase.from('registrations')
            .select(`*, user:profiles (id, full_name, college_email, roll_number, department, year_of_study)`)
            .eq('event_id', id)
        if (error) console.error('Error fetching participants:', error)
        else setParticipants(data || [])
        setLoadingParticipants(false)
    }



    const fetchPayments = async () => {
        setLoadingPayments(true)
        console.log('📋 Fetching payments for event:', id)

        // Fetch ONLY pending registrations
        const { data, error } = await supabase
            .from('registrations')
            .select(`id, transaction_id, payment_screenshot_path, status, registered_at, payment_mode, team_members, user:profiles(id, full_name, college_email, roll_number, department)`)
            .eq('event_id', id)
            .eq('status', 'pending') // ONLY pending payments
            .order('registered_at', { ascending: false })

        console.log('📊 Query result:', { count: data?.length, error })

        if (error) {
            console.error('❌ Error fetching payments:', error)
            setPayments([])
        } else {
            console.log('✅ Fetched pending payments:', data?.length)

            // Filter to show ONLY team leaders or individual participants
            // Team members (those with empty team_members array but part of someone's team) should be hidden

            // Step 1: Collect all member profile IDs from team_members arrays
            const allMemberIds = new Set()
            data?.forEach(reg => {
                if (reg.team_members && Array.isArray(reg.team_members) && reg.team_members.length > 0) {
                    reg.team_members.forEach(member => {
                        // team_members contains objects with id, name, roll_number
                        if (member.id) {
                            allMemberIds.add(member.id)
                        }
                    })
                }
            })

            console.log('🔍 Found member IDs in teams:', Array.from(allMemberIds))

            // Step 2: Filter out members - keep only:
            // - Leaders (have non-empty team_members array)
            // - Individuals (not found in any team_members array)
            const leadersAndIndividuals = (data || []).filter(reg => {
                const userProfileId = reg.user?.id
                const isPartOfSomeoneTeam = allMemberIds.has(userProfileId)
                const isLeader = reg.team_members && reg.team_members.length > 0

                // Keep if: is a leader OR not part of anyone's team (individual)
                const shouldKeep = isLeader || !isPartOfSomeoneTeam

                console.log(`User: ${reg.user?.full_name}, ProfileID: ${userProfileId}, IsLeader: ${isLeader}, InTeam: ${isPartOfSomeoneTeam}, Keep: ${shouldKeep}`)

                return shouldKeep
            })

            console.log('👥 Filtered results:', leadersAndIndividuals.length, 'from', data?.length)

            // Generate public URLs for payment screenshots
            const paymentsWithUrls = leadersAndIndividuals.map(payment => {
                if (payment.payment_screenshot_path) {
                    // Get public URL from storage
                    const { data: urlData } = supabase.storage
                        .from('payment_proofs')
                        .getPublicUrl(payment.payment_screenshot_path)

                    console.log('🖼️ Screenshot URL:', {
                        original_path: payment.payment_screenshot_path,
                        generated_url: urlData.publicUrl,
                        user: payment.user?.full_name
                    })

                    return { ...payment, payment_screenshot_url: urlData.publicUrl }
                }
                return payment
            })

            console.log('💾 Final payments with URLs:', paymentsWithUrls.length)
            setPayments(paymentsWithUrls)
        }

        setLoadingPayments(false)
    }

    // ============================================
    // OFFLINE REGISTRATION HELPER FUNCTIONS
    // ============================================

    /**
     * Check if a gender is allowed for the current event
     * @param {string} gender - The gender to check (e.g., 'male', 'female')
     * @returns {object} { allowed: boolean, message: string }
     */
    const isGenderAllowed = (gender) => {
        // If no allowed_genders set or empty array, all genders are allowed
        if (!event?.allowed_genders || event.allowed_genders.length === 0) {
            return { allowed: true }
        }

        // Normalize gender for comparison (case-insensitive)
        const normalizedGender = gender?.toLowerCase()?.trim() || ''

        // Check if gender is in allowed list (case-insensitive comparison)
        const allowedLower = event.allowed_genders.map(g => g.toLowerCase())
        const isAllowed = allowedLower.includes(normalizedGender)

        if (!isAllowed) {
            // Format allowed genders for error message
            const allowedFormatted = event.allowed_genders.join(' or ')
            return {
                allowed: false,
                message: `This event is only for ${allowedFormatted} participants. Selected gender: ${gender || 'Unknown'}`
            }
        }

        return { allowed: true }
    }

    /**
     * Validate roll number and check if profile exists and eligible for registration
     * @param {string} rollNumber - Student's roll number
     * @param {boolean} forTeamLeader - Whether this is for team leader validation
     * @returns {object} Validation result with profile data or error
     */
    const validateRollNumber = async (rollNumber, forTeamLeader = false) => {
        try {
            const normalized = rollNumber.trim().toLowerCase()

            if (!normalized) {
                return { valid: false, error: 'Roll number is required' }
            }

            // 1. Check if profile exists
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, roll_number, phone, college_email, department, year_of_study, gender, is_admin_created')
                .ilike('roll_number', normalized)
                .maybeSingle()

            if (profileError && profileError.code !== 'PGRST116') {
                throw profileError
            }

            if (!profile) {
                return {
                    valid: false,
                    error: 'Profile not found',
                    action: 'create',
                    rollNumber: normalized
                }
            }

            // 2. Check gender eligibility for the event
            const genderCheck = isGenderAllowed(profile.gender)
            if (!genderCheck.allowed) {
                return {
                    valid: false,
                    error: genderCheck.message,
                    profile: profile,
                    genderNotAllowed: true
                }
            }

            // 3. Check if already registered for this event
            const { data: existingReg, error: regError } = await supabase
                .from('registrations')
                .select('id, status, registered_at')
                .eq('profile_id', profile.id)
                .eq('event_id', id)
                .maybeSingle()

            if (regError) throw regError

            if (existingReg) {
                return {
                    valid: false,
                    error: 'Already registered',
                    alreadyRegistered: true,
                    profile: profile,
                    registration: existingReg
                }
            }

            // 4. For team members: Check if already in another team for this event
            if (!forTeamLeader) {
                const { data: teamRegs, error: teamError } = await supabase
                    .from('registrations')
                    .select('id, team_members, user:profiles!registrations_profile_id_fkey(full_name)')
                    .eq('event_id', id)
                    .not('team_members', 'eq', '[]')

                if (teamError) throw teamError

                const foundInTeam = teamRegs?.find(reg =>
                    reg.team_members?.some(member => member.id === profile.id)
                )

                if (foundInTeam) {
                    return {
                        valid: false,
                        error: `Already a member of ${foundInTeam.user?.full_name || 'another'}'s team`,
                        profile: profile
                    }
                }
            }

            // 5. All checks passed
            return {
                valid: true,
                profile: profile
            }
        } catch (error) {
            console.error('Validation error:', error)
            return {
                valid: false,
                error: 'Validation failed. Please try again.'
            }
        }
    }

    /**
     * Create a new offline profile through admin/coordinator
     * Creates ONLY profile entry (NO auth user - offline registration)
     * Student can be added to events but cannot login
     * @param {string} rollNumber - Student's roll number
     * @param {string} fullName - Student's full name
     * @param {string} phone - Student's phone number
     * @param {string} gender - Student's gender (default: 'male')
     * @returns {object} Created profile data
     */
    const createOfflineProfile = async (rollNumber, fullName, phone, gender = 'male') => {
        try {
            const normalizedRoll = rollNumber.trim().toLowerCase()
            const email = `${normalizedRoll}@aiktc.ac.in`

            console.log('Creating offline profile (simple):', { normalizedRoll, fullName, phone, email, gender })

            // Call the SIMPLE function that creates profile ONLY (no auth user)
            const { data, error } = await supabase.rpc('create_simple_offline_profile', {
                p_roll_number: normalizedRoll,
                p_full_name: fullName.trim(),
                p_college_email: email,
                p_phone: phone.trim(),
                p_department: 'General',
                p_year_of_study: null,
                p_gender: gender || 'male'
            })

            if (error) {
                console.error('Error creating profile:', error)
                throw new Error(error.message || 'Failed to create profile')
            }

            // Check if function returned success
            if (!data || !data.success) {
                const errorMsg = data?.error || 'Unknown error occurred'
                console.error('Function returned error:', errorMsg)
                throw new Error(errorMsg)
            }

            console.log('✅ Profile created successfully (offline mode):', data)

            // Return profile data in expected format
            const profile = {
                id: data.profile_id,
                full_name: data.full_name,
                roll_number: data.roll_number,
                college_email: data.email,
                phone: phone.trim(),
                gender: gender,
                is_admin_created: true,
                role: 'student',
                department: 'General',
                year_of_study: null
            }

            return {
                success: true,
                profile: profile
            }
        } catch (error) {
            console.error('Profile creation error:', error)
            throw new Error(error.message || 'Failed to create profile')
        }
    }

    /**
     * Register individual participant for offline registration
     * Creates registration with payment_mode='cash' and status='confirmed'
     * Cash payment = Offline registration (added manually by admin/coordinator)
     * @param {string} profileId - UUID of the profile to register
     * @returns {object} Created registration data
     */
    const registerIndividualOffline = async (profileId) => {
        try {
            const { data, error } = await supabase
                .from('registrations')
                .insert({
                    profile_id: profileId,
                    event_id: id,
                    team_members: [],
                    payment_mode: 'cash', // ⭐ Cash = Offline registration
                    status: 'confirmed', // ⭐ Auto-confirmed (payment received)
                    transaction_id: null,
                    payment_screenshot_path: null
                })
                .select(`
                    *,
                    user:profiles(id, full_name, college_email, roll_number, department, year_of_study)
                `)
                .single()

            if (error) {
                if (error.code === '23505') {
                    throw new Error('User already registered for this event')
                }
                throw error
            }

            // Log audit
            const currentUser = (await supabase.auth.getUser()).data.user
            await supabase.from('audit_logs').insert({
                actor_id: currentUser?.id,
                action: 'OFFLINE_REGISTRATION_INDIVIDUAL',
                metadata: {
                    registration_id: data.id,
                    profile_id: profileId,
                    event_id: id,
                    payment_mode: 'cash'
                }
            })

            return { success: true, registration: data }
        } catch (error) {
            console.error('Registration error:', error)
            throw error
        }
    }

    /**
     * Register team for offline registration
     * Creates leader and member registrations with payment_mode='cash'
     * Cash payment = Offline registration (added manually by admin/coordinator)
     * @param {string} leaderProfileId - UUID of team leader profile
     * @param {array} teamMemberProfiles - Array of member profile objects
     * @returns {object} Created leader registration data
     */
    const registerTeamOffline = async (leaderProfileId, teamMemberProfiles) => {
        try {
            const totalSize = teamMemberProfiles.length + 1

            // Validate team size
            if (totalSize < event.min_team_size) {
                throw new Error(`Team size must be at least ${event.min_team_size} (including leader). Current: ${totalSize}`)
            }
            if (totalSize > event.max_team_size) {
                throw new Error(`Team size cannot exceed ${event.max_team_size} (including leader). Current: ${totalSize}`)
            }

            // Build team_members array
            const teamMembersArray = teamMemberProfiles.map(p => ({
                id: p.id,
                full_name: p.full_name,
                roll_number: p.roll_number,
                phone: p.phone || null
            }))

            // 1. Create LEADER registration
            const { data: leaderReg, error: leaderError } = await supabase
                .from('registrations')
                .insert({
                    profile_id: leaderProfileId,
                    event_id: id,
                    team_members: teamMembersArray,
                    payment_mode: 'cash', // ⭐ Cash = Offline registration
                    status: 'confirmed',
                    transaction_id: null,
                    payment_screenshot_path: null
                })
                .select(`
                    *,
                    user:profiles(id, full_name, college_email, roll_number, department, year_of_study)
                `)
                .single()

            if (leaderError) {
                if (leaderError.code === '23505') {
                    throw new Error('Team leader already registered for this event')
                }
                throw leaderError
            }

            // 2. Create MEMBER registrations
            const memberRegistrations = teamMemberProfiles.map(member => ({
                profile_id: member.id,
                event_id: id,
                team_members: [],
                payment_mode: 'cash', // ⭐ Cash = Offline registration
                status: 'confirmed',
                transaction_id: null,
                payment_screenshot_path: null
            }))

            const { error: memberError } = await supabase
                .from('registrations')
                .insert(memberRegistrations)

            if (memberError) {
                // Rollback leader registration if member insert fails
                await supabase
                    .from('registrations')
                    .delete()
                    .eq('id', leaderReg.id)

                throw new Error('Failed to register team members. Please try again.')
            }

            // 3. Log audit
            const currentUser = (await supabase.auth.getUser()).data.user
            await supabase.from('audit_logs').insert({
                actor_id: currentUser?.id,
                action: 'OFFLINE_REGISTRATION_TEAM',
                metadata: {
                    registration_id: leaderReg.id,
                    leader_profile_id: leaderProfileId,
                    event_id: id,
                    team_size: totalSize,
                    team_member_ids: teamMemberProfiles.map(m => m.id),
                    payment_mode: 'cash'
                }
            })

            return { success: true, registration: leaderReg }
        } catch (error) {
            console.error('Team registration error:', error)
            throw error
        }
    }

    /**
     * Search for members by roll number for team events
     * @param {string} searchTerm - Roll number search term
     * @returns {array} Array of matching profiles
     */
    const searchMembersByRollNumber = async (searchTerm) => {
        if (!searchTerm || searchTerm.length < 2) {
            return []
        }

        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('id, full_name, roll_number, phone, department, year_of_study, college_email')
                .ilike('roll_number', `%${searchTerm}%`)
                .limit(10)

            if (error) throw error
            return data || []
        } catch (error) {
            console.error('Search error:', error)
            return []
        }
    }

    // ============================================
    // OFFLINE REGISTRATION UI HANDLERS
    // ============================================

    /**
     * Handle clicking the "+ Add" button in Participants tab
     * Opens appropriate modal based on event type (individual/group)
     */
    const handleAddParticipantClick = () => {
        if (event?.subcategory?.toLowerCase() === 'group') {
            // Open team modal
            setAddTeamModal({
                isOpen: true,
                step: 1,
                leaderRollNumber: '',
                leaderProfile: null,
                memberSearch: '',
                searchResults: [],
                selectedMembers: [],
                loading: false,
                error: null,
                creatingMemberInline: false,
                inlineCreateData: { rollNumber: '', fullName: '', phone: '', gender: 'male' }
            })
        } else {
            // Open individual participant modal
            setAddParticipantModal({
                isOpen: true,
                rollNumber: '',
                loading: false,
                profile: null,
                error: null,
                alreadyRegistered: false,
                registrationDetails: null
            })
        }
    }

    /**
     * Validate roll number in Add Participant modal (Individual events)
     */
    const handleValidateIndividualRollNumber = async () => {
        const rollNumber = addParticipantModal.rollNumber.trim()

        if (!rollNumber) {
            setAddParticipantModal(prev => ({ ...prev, error: 'Please enter a roll number' }))
            return
        }

        setAddParticipantModal(prev => ({ ...prev, loading: true, error: null }))

        const result = await validateRollNumber(rollNumber, false)

        if (result.valid) {
            setAddParticipantModal(prev => ({
                ...prev,
                loading: false,
                profile: result.profile,
                error: null
            }))
        } else if (result.action === 'create') {
            // Profile doesn't exist - show option to create
            setAddParticipantModal(prev => ({
                ...prev,
                loading: false,
                error: result.error,
                profile: null
            }))
        } else if (result.alreadyRegistered) {
            setAddParticipantModal(prev => ({
                ...prev,
                loading: false,
                error: result.error,
                alreadyRegistered: true,
                profile: result.profile,
                registrationDetails: result.registration
            }))
        } else {
            setAddParticipantModal(prev => ({
                ...prev,
                loading: false,
                error: result.error,
                profile: result.profile
            }))
        }
    }

    /**
     * Open Create Profile modal from Add Participant or Add Team modal
     * @param {string} rollNumber - Roll number to create profile for
     * @param {boolean} returnToAddParticipant - If true, auto-register after creation (individual events)
     * @param {boolean} returnToAddTeam - If true, assign as team leader after creation (group events)
     */
    const handleOpenCreateProfile = (rollNumber, returnToAddParticipant = false, returnToAddTeam = false) => {
        console.log('🔥 handleOpenCreateProfile called', { rollNumber, returnToAddParticipant, returnToAddTeam })
        const normalized = rollNumber.trim().toLowerCase()
        console.log('📝 Setting createProfileModal state with isOpen: true')
        setCreateProfileModal({
            isOpen: true,
            rollNumber: normalized,
            fullName: '',
            phone: '',
            email: `${normalized}@aiktc.ac.in`,
            gender: 'male', // Default to male
            loading: false,
            error: null,
            returnToAddParticipant,
            returnToAddTeam
        })
        console.log('✅ createProfileModal state should be updated now')
    }

    /**
     * Handle creating new profile from Create Profile modal
     * If coming from Add Participant flow, auto-registers for the event
     * If coming from Add Team flow, assigns as team leader
     */
    const handleCreateProfile = async () => {
        const { rollNumber, fullName, phone, gender, returnToAddParticipant, returnToAddTeam } = createProfileModal

        if (!fullName.trim()) {
            setCreateProfileModal(prev => ({ ...prev, error: 'Full name is required' }))
            return
        }

        if (!phone.trim() || phone.length !== 10 || !/^\d+$/.test(phone)) {
            setCreateProfileModal(prev => ({ ...prev, error: 'Please enter a valid 10-digit phone number' }))
            return
        }

        // Check gender eligibility for the event (when adding to an event - individual or team)
        if (returnToAddParticipant || returnToAddTeam) {
            const genderCheck = isGenderAllowed(gender)
            if (!genderCheck.allowed) {
                setCreateProfileModal(prev => ({ ...prev, error: genderCheck.message }))
                return
            }
        }

        setCreateProfileModal(prev => ({ ...prev, loading: true, error: null }))

        try {
            // Step 1: Create the profile
            const result = await createOfflineProfile(rollNumber, fullName, phone, gender)

            console.log('✅ Profile created:', result.profile)

            // Step 2a: If coming from Add Team modal (group event), assign as team leader
            if (returnToAddTeam && result.profile?.id) {
                console.log('🎯 Assigning as team leader...')

                // Close create profile modal
                setCreateProfileModal({
                    isOpen: false,
                    rollNumber: '',
                    fullName: '',
                    phone: '',
                    email: '',
                    gender: 'male',
                    loading: false,
                    error: null,
                    returnToAddParticipant: false,
                    returnToAddTeam: false
                })

                // Set as team leader and clear error
                setAddTeamModal(prev => ({
                    ...prev,
                    leaderProfile: result.profile,
                    error: null
                }))

                // Show success message
                alert(
                    `✅ Profile Created & Assigned as Team Leader!\\n\\n` +
                    `Roll Number: ${result.profile.roll_number}\\n` +
                    `Name: ${fullName}\\n` +
                    `Email: ${result.profile.college_email}\\n\\n` +
                    `You can now proceed to add team members.`
                )
                return
            }

            // Step 2b: If coming from Add Participant modal (individual event), auto-register
            if (returnToAddParticipant && result.profile?.id) {
                console.log('🎯 Auto-registering for event...')

                try {
                    await registerIndividualOffline(result.profile.id)

                    console.log('✅ Auto-registered for event!')

                    // Close both modals
                    setCreateProfileModal({
                        isOpen: false,
                        rollNumber: '',
                        fullName: '',
                        phone: '',
                        email: '',
                        gender: 'male',
                        loading: false,
                        error: null,
                        returnToAddParticipant: false,
                        returnToAddTeam: false
                    })

                    setAddParticipantModal({
                        isOpen: false,
                        rollNumber: '',
                        loading: false,
                        profile: null,
                        error: null,
                        alreadyRegistered: false,
                        registrationDetails: null
                    })

                    // Show combined success message
                    alert(
                        `✅ Profile Created & Registered!\\n\\n` +
                        `Roll Number: ${result.profile.roll_number}\\n` +
                        `Name: ${fullName}\\n` +
                        `Email: ${result.profile.college_email}\\n\\n` +
                        `🎉 ${fullName} has been registered for ${event?.name}!\\n\\n` +
                        `ℹ️ This is an offline profile.`
                    )

                    // Refresh participants list
                    fetchParticipants()
                    return

                } catch (regError) {
                    console.error('❌ Auto-registration failed:', regError)
                    // Profile was created but registration failed
                    // Close create modal, show profile in add participant modal for manual retry
                    setCreateProfileModal({
                        isOpen: false,
                        rollNumber: '',
                        fullName: '',
                        phone: '',
                        email: '',
                        gender: 'male',
                        loading: false,
                        error: null,
                        returnToAddParticipant: false,
                        returnToAddTeam: false
                    })

                    setAddParticipantModal(prev => ({
                        ...prev,
                        profile: result.profile,
                        error: `Profile created, but registration failed: ${regError.message}. Click "Add Participant" to try again.`
                    }))
                    return
                }
            }

            // Not from Add Participant or Add Team flow - just close and show success
            setCreateProfileModal({
                isOpen: false,
                rollNumber: '',
                fullName: '',
                phone: '',
                email: '',
                gender: 'male',
                loading: false,
                error: null,
                returnToAddParticipant: false,
                returnToAddTeam: false
            })

            alert(
                `✅ Profile created successfully!\\n\\n` +
                `Roll Number: ${result.profile.roll_number}\\n` +
                `Name: ${fullName}\\n` +
                `Email: ${result.profile.college_email}\\n\\n` +
                `ℹ️ This is an offline profile.\\n` +
                `The student can be added to events.\\n` +
                `Login functionality will be added later.`
            )
        } catch (error) {
            setCreateProfileModal(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to create profile'
            }))
        }
    }

    /**
     * Register individual participant (offline)
     */
    const handleRegisterIndividualParticipant = async () => {
        if (!addParticipantModal.profile) {
            return
        }

        setAddParticipantModal(prev => ({ ...prev, loading: true, error: null }))

        try {
            await registerIndividualOffline(addParticipantModal.profile.id)

            // Success!
            setAddParticipantModal({
                isOpen: false,
                rollNumber: '',
                loading: false,
                profile: null,
                error: null,
                alreadyRegistered: false,
                registrationDetails: null
            })

            alert(`✅ ${addParticipantModal.profile.full_name} registered successfully for ${event.name}!`)

            // Refresh participants list
            fetchParticipants()
        } catch (error) {
            setAddParticipantModal(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to register participant'
            }))
        }
    }

    /**
     * Validate team leader roll number in Add Team modal
     */
    const handleValidateTeamLeader = async () => {
        const rollNumber = addTeamModal.leaderRollNumber.trim()

        if (!rollNumber) {
            setAddTeamModal(prev => ({ ...prev, error: 'Please enter team leader roll number' }))
            return
        }

        setAddTeamModal(prev => ({ ...prev, loading: true, error: null }))

        const result = await validateRollNumber(rollNumber, true)

        if (result.valid) {
            setAddTeamModal(prev => ({
                ...prev,
                loading: false,
                leaderProfile: result.profile,
                error: null
            }))
        } else if (result.action === 'create') {
            setAddTeamModal(prev => ({
                ...prev,
                loading: false,
                error: result.error,
                leaderProfile: null
            }))
        } else {
            setAddTeamModal(prev => ({
                ...prev,
                loading: false,
                error: result.error,
                leaderProfile: null
            }))
        }
    }

    /**
     * Proceed to add members step in team modal
     */
    const handleProceedToAddMembers = () => {
        if (!addTeamModal.leaderProfile) {
            return
        }
        setAddTeamModal(prev => ({ ...prev, step: 2, error: null }))
    }

    /**
     * Search for team members by roll number
     */
    const handleSearchTeamMembers = async (searchTerm) => {
        console.log('Searching for team members with term:', searchTerm)
        setAddTeamModal(prev => ({ ...prev, memberSearch: searchTerm, loading: true }))

        const results = await searchMembersByRollNumber(searchTerm)
        console.log('Search results:', results.length, 'profiles found')

        // Filter out leader and already selected members
        const filteredResults = results.filter(profile =>
            profile.id !== addTeamModal.leaderProfile.id &&
            !addTeamModal.selectedMembers.some(m => m.id === profile.id)
        )

        console.log('Filtered results:', filteredResults.length, 'after removing leader/selected')

        setAddTeamModal(prev => ({
            ...prev,
            searchResults: filteredResults,
            loading: false
        }))
    }

    /**
     * Add selected member to team
     */
    const handleSelectTeamMember = async (profile) => {
        // Validate this member can be added
        const result = await validateRollNumber(profile.roll_number, false)

        if (!result.valid) {
            alert(result.error)
            return
        }

        setAddTeamModal(prev => ({
            ...prev,
            selectedMembers: [...prev.selectedMembers, profile],
            memberSearch: '',
            searchResults: []
        }))
    }

    /**
     * Remove member from selected team members
     */
    const handleRemoveTeamMember = (memberId) => {
        setAddTeamModal(prev => ({
            ...prev,
            selectedMembers: prev.selectedMembers.filter(m => m.id !== memberId)
        }))
    }

    /**
     * Create inline member profile during team creation
     */
    const handleCreateInlineMember = async () => {
        const { rollNumber, fullName, phone, gender } = addTeamModal.inlineCreateData

        if (!rollNumber.trim()) {
            alert('Roll number is required')
            return
        }

        if (!fullName.trim()) {
            alert('Full name is required')
            return
        }

        if (!phone.trim()) {
            alert('Phone number is required')
            return
        }

        if (phone.length !== 10 || !/^\d+$/.test(phone)) {
            alert('Please enter a valid 10-digit phone number')
            return
        }

        // Check gender eligibility for the event
        const genderCheck = isGenderAllowed(gender)
        if (!genderCheck.allowed) {
            alert(genderCheck.message)
            return
        }

        setAddTeamModal(prev => ({ ...prev, loading: true, error: null }))

        try {
            console.log('Creating inline profile:', { rollNumber, fullName, phone, gender })
            const result = await createOfflineProfile(rollNumber, fullName, phone, gender)

            if (!result.success || !result.profile) {
                throw new Error('Profile creation returned invalid data')
            }

            console.log('Profile created successfully, adding to team:', result.profile)

            // Add to selected members and clear form
            setAddTeamModal(prev => ({
                ...prev,
                selectedMembers: [...prev.selectedMembers, result.profile],
                creatingMemberInline: false,
                inlineCreateData: { rollNumber: '', fullName: '', phone: '', gender: 'male' },
                memberSearch: '', // Clear search field
                searchResults: [], // Clear search results
                loading: false,
                error: null
            }))

            alert(`✅ Profile created and added to team!\n\nName: ${result.profile.full_name}\nRoll: ${result.profile.roll_number}\nGender: ${gender}`)
        } catch (error) {
            console.error('Failed to create inline profile:', error)
            alert('Failed to create profile: ' + error.message)
            setAddTeamModal(prev => ({
                ...prev,
                loading: false,
                error: error.message
            }))
        }
    }

    /**
     * Register team (offline)
     */
    const handleRegisterTeam = async () => {
        if (!addTeamModal.leaderProfile || addTeamModal.selectedMembers.length === 0) {
            return
        }

        setAddTeamModal(prev => ({ ...prev, loading: true, error: null }))

        try {
            await registerTeamOffline(addTeamModal.leaderProfile.id, addTeamModal.selectedMembers)

            // Success!
            const teamSize = addTeamModal.selectedMembers.length + 1
            setAddTeamModal({
                isOpen: false,
                step: 1,
                leaderRollNumber: '',
                leaderProfile: null,
                memberSearch: '',
                searchResults: [],
                selectedMembers: [],
                loading: false,
                error: null,
                creatingMemberInline: false,
                inlineCreateData: { rollNumber: '', fullName: '', phone: '', gender: 'male' }
            })

            alert(`✅ Team registered successfully!\n\nLeader: ${addTeamModal.leaderProfile.full_name}\nTeam Size: ${teamSize} members\nEvent: ${event.name}`)

            // Refresh participants list
            fetchParticipants()
        } catch (error) {
            setAddTeamModal(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to register team'
            }))
        }
    }

    const handleExportCSV = async () => {
        if (!event) return

        try {
            console.log('Starting CSV export for event:', event.name)

            // Fetch all confirmed participants with full profile data
            const { data: registrations, error } = await supabase
                .from('registrations')
                .select(`
                    *,
                    user:profiles (
                        id,
                        full_name,
                        college_email,
                        roll_number,
                        department,
                        year_of_study,
                        gender,
                        phone,
                        school
                    )
                `)
                .eq('event_id', id)
                .eq('status', 'confirmed')
                .order('registered_at', { ascending: true })

            if (error) throw error
            if (!registrations || registrations.length === 0) {
                alert('No confirmed participants to export')
                return
            }

            console.log('Fetched registrations:', registrations.length)

            // Build CSV content
            let csvContent = ''

            // EVENT HEADER SECTION
            csvContent += `Event Name:,${event.name}\n`
            csvContent += `Category:,${event.category}\n`
            csvContent += `Event Type:,${event.subcategory}\n`
            csvContent += `Date:,${event.event_date || 'TBA'}\n`
            csvContent += `Venue:,${event.venue || 'TBA'}\n`
            csvContent += `Fee:,₹${event.fee || 0}\n`

            // Fetch coordinator details
            const { data: assignments } = await supabase
                .from('event_assignments')
                .select('coordinator:profiles(full_name, college_email)')
                .eq('event_id', id)

            if (assignments && assignments.length > 0) {
                const coordinatorNames = assignments.map(a => a.coordinator?.full_name).filter(Boolean).join(', ')
                csvContent += `Coordinators:,${coordinatorNames}\n`
            }

            csvContent += `Total Participants:,${registrations.length}\n`
            csvContent += `\n` // Empty line

            // CHECK IF INDIVIDUAL OR GROUP EVENT
            const isGroupEvent = event.subcategory?.toLowerCase() === 'group'

            if (isGroupEvent) {
                // GROUP EVENT CSV - Only process team leaders with team_members
                csvContent += 'Team No,Member No,Roll Number,Name,Email,School,Department,Year of Study,Gender,Phone Number\n'

                let teamNumber = 0
                // Filter to only team leaders (those with non-empty team_members array)
                const teamLeaders = registrations.filter(reg => reg.team_members && reg.team_members.length > 0)

                teamLeaders.forEach((reg) => {
                    teamNumber++
                    const teamMembers = reg.team_members || []

                    // Team Leader (Member 1) - show team number
                    const leader = reg.user
                    if (leader) {
                        csvContent += `${teamNumber},1,${escapeCSV(leader.roll_number)},${escapeCSV(leader.full_name)},${escapeCSV(leader.college_email)},${escapeCSV(leader.school)},${escapeCSV(leader.department)},${escapeCSV(leader.year_of_study)},${escapeCSV(leader.gender)},${escapeCSV(leader.phone)}\n`
                    }

                    // Team Members (2, 3, ...) - blank team number for clean look
                    teamMembers.forEach((member, idx) => {
                        csvContent += `,${idx + 2},${escapeCSV(member.roll_number)},${escapeCSV(member.full_name || member.name)},${escapeCSV(member.college_email || member.email)},${escapeCSV(member.school)},${escapeCSV(member.department)},${escapeCSV(member.year_of_study)},${escapeCSV(member.gender)},${escapeCSV(member.phone)}\n`
                    })
                })
            } else {
                // INDIVIDUAL EVENT CSV - remove Serial No for consistency
                csvContent += 'Member No,Roll Number,Name,Email,School,Department,Year of Study,Gender,Phone Number\n'

                registrations.forEach((reg, index) => {
                    const user = reg.user
                    if (user) {
                        csvContent += `${index + 1},${escapeCSV(user.roll_number)},${escapeCSV(user.full_name)},${escapeCSV(user.college_email)},${escapeCSV(user.school)},${escapeCSV(user.department)},${escapeCSV(user.year_of_study)},${escapeCSV(user.gender)},${escapeCSV(user.phone)}\n`
                    }
                })
            }

            // Download CSV
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
            const link = document.createElement('a')
            const url = URL.createObjectURL(blob)
            link.setAttribute('href', url)
            link.setAttribute('download', `${event.name.replace(/[^a-z0-9]/gi, '_')}_Participants_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            console.log('CSV exported successfully')
        } catch (error) {
            console.error('Error exporting CSV:', error)
            alert('Failed to export CSV: ' + error.message)
        }
    }

    // Helper function to escape CSV values
    const escapeCSV = (value) => {
        if (value === null || value === undefined) return ''
        const str = String(value)
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`
        }
        return str
    }




    const handleRejectParticipant = async (registrationId) => {
        if (!confirm('Are you sure you want to reject this participant?')) return
        const { error } = await supabase.from('registrations').update({ status: 'rejected' }).eq('id', registrationId)
        if (error) alert('Error rejecting participant')
        else fetchParticipants()
    }

    const handleReplaceMember = async () => {
        if (!replaceRollNumber.trim()) {
            alert('Please enter a roll number')
            return
        }

        setIsReplacing(true)
        try {
            // Find the new profile by roll number (case-insensitive)
            const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, roll_number')
                .ilike('roll_number', replaceRollNumber.trim())
                .single()

            if (profileError || !newProfile) {
                alert('Profile not found with this roll number')
                return
            }

            // Get the current member's registration
            const currentMember = participants.find(p => p.id === replaceModal.memberId)
            if (!currentMember) {
                alert('Current member not found')
                return
            }

            // Find the team leader whose team_members contains this member
            const { data: leaderRegs, error: leaderError } = await supabase
                .from('registrations')
                .select('id, profile_id, team_members')
                .eq('event_id', id)
                .eq('status', 'confirmed')

            if (leaderError) throw leaderError

            const leader = leaderRegs.find(reg =>
                reg.team_members &&
                Array.isArray(reg.team_members) &&
                reg.team_members.some(m => m.id === currentMember.profile_id)
            )

            if (!leader) {
                alert('Team leader not found for this member')
                return
            }

            // Update team leader's team_members array - replace old member ID with new member
            const updatedTeamMembers = leader.team_members.map(member => {
                if (member.id === currentMember.profile_id) {
                    return {
                        ...member,
                        id: newProfile.id,
                        full_name: newProfile.full_name,
                        roll_number: newProfile.roll_number
                    }
                }
                return member
            })

            const { error: updateLeaderError } = await supabase
                .from('registrations')
                .update({ team_members: updatedTeamMembers })
                .eq('id', leader.id)

            if (updateLeaderError) throw updateLeaderError

            // Update the member's registration entry with new profile_id
            const { error: updateMemberError } = await supabase
                .from('registrations')
                .update({ profile_id: newProfile.id })
                .eq('id', replaceModal.memberId)

            if (updateMemberError) throw updateMemberError

            alert(`Member successfully replaced with ${newProfile.full_name}!`)
            setReplaceModal({ isOpen: false, memberId: null, memberName: '' })
            setReplaceRollNumber('')
            fetchParticipants()
        } catch (error) {
            console.error('Error replacing member:', error)
            alert('Failed to replace member: ' + error.message)
        } finally {
            setIsReplacing(false)
        }
    }

    const handleDeleteMember = async (memberId, memberName) => {
        try {
            // Get the member's registration to find their profile_id
            const { data: memberReg, error: memberError } = await supabase
                .from('registrations')
                .select('profile_id')
                .eq('id', memberId)
                .single()

            if (memberError || !memberReg) {
                alert('Member not found')
                return
            }

            // Find the team leader whose team_members contains this member
            const { data: leaderRegs, error: leaderError } = await supabase
                .from('registrations')
                .select('id, profile_id, team_members')
                .eq('event_id', id)
                .eq('status', 'confirmed')

            if (leaderError) throw leaderError

            const leader = leaderRegs.find(reg =>
                reg.team_members &&
                Array.isArray(reg.team_members) &&
                reg.team_members.some(m => m.id === memberReg.profile_id)
            )

            // For group events, check minimum team size before deletion
            if (event?.subcategory === 'Group' && event?.min_team_size && leader) {
                const currentTeamSize = (leader.team_members?.length || 0) + 1 // +1 for leader
                const sizeAfterDeletion = currentTeamSize - 1

                if (sizeAfterDeletion < event.min_team_size) {
                    const message =
                        `⚠️ Cannot Delete Member\n\n` +
                        `This event requires a minimum of ${event.min_team_size} team members (including leader).\n\n` +
                        `Current team size: ${currentTeamSize}\n` +
                        `After deletion: ${sizeAfterDeletion}\n\n` +
                        `Options:\n` +
                        `1. Add another member first, then delete this one\n` +
                        `2. Delete the entire team registration instead\n\n` +
                        `Do you want to delete the ENTIRE TEAM registration instead?`

                    const deleteWholeTeam = confirm(message)

                    if (deleteWholeTeam) {
                        // Delete all team member registrations first
                        for (const member of leader.team_members) {
                            const { error: deleteMemberError } = await supabase
                                .from('registrations')
                                .delete()
                                .eq('event_id', id)
                                .eq('profile_id', member.id)

                            if (deleteMemberError) {
                                console.error('Error deleting team member:', deleteMemberError)
                            }
                        }

                        // Delete the leader's registration
                        const { error: deleteLeaderError } = await supabase
                            .from('registrations')
                            .delete()
                            .eq('id', leader.id)

                        if (deleteLeaderError) throw deleteLeaderError

                        alert('✅ Entire team registration deleted successfully')
                        fetchParticipants()
                        return
                    } else {
                        // User cancelled
                        return
                    }
                }
            }

            // Regular confirmation for allowed deletions
            const confirmed = confirm(`Are you sure you want to delete ${memberName} from this event? This action cannot be undone.`)
            if (!confirmed) return

            // If leader found, remove member from team_members array
            if (leader) {
                const updatedTeamMembers = leader.team_members.filter(
                    member => member.id !== memberReg.profile_id
                )

                const { error: updateLeaderError } = await supabase
                    .from('registrations')
                    .update({ team_members: updatedTeamMembers })
                    .eq('id', leader.id)

                if (updateLeaderError) throw updateLeaderError
            }

            // Delete the member's registration
            const { error: deleteError } = await supabase
                .from('registrations')
                .delete()
                .eq('id', memberId)

            if (deleteError) throw deleteError

            alert('Member deleted successfully')
            fetchParticipants()
        } catch (error) {
            console.error('Error deleting member:', error)
            alert('Failed to delete member')
        }
    }

    const handleAddMember = async () => {
        if (!addMemberRollNumber.trim()) {
            alert('Please enter a roll number')
            return
        }

        setIsAddingMember(true)
        try {
            // Find the profile by roll number (case-insensitive)
            const { data: newProfile, error: profileError } = await supabase
                .from('profiles')
                .select('id, full_name, roll_number')
                .ilike('roll_number', addMemberRollNumber.trim())
                .single()

            if (profileError || !newProfile) {
                alert('Profile not found with this roll number')
                return
            }

            // Check if this person is already registered for this event
            const { data: existingReg, error: checkError } = await supabase
                .from('registrations')
                .select('id')
                .eq('event_id', id)
                .eq('profile_id', newProfile.id)
                .maybeSingle()

            if (checkError) throw checkError

            if (existingReg) {
                alert('This person is already registered for this event')
                return
            }

            // Get the team leader's registration
            const { data: leaderReg, error: leaderError } = await supabase
                .from('registrations')
                .select('id, team_members')
                .eq('id', addMemberModal.leaderId)
                .single()

            if (leaderError || !leaderReg) {
                alert('Team leader not found')
                return
            }

            // Add new member to team_members array
            const updatedTeamMembers = [
                ...(leaderReg.team_members || []),
                {
                    id: newProfile.id,
                    full_name: newProfile.full_name,
                    roll_number: newProfile.roll_number
                }
            ]

            // Update leader's team_members array
            const { error: updateLeaderError } = await supabase
                .from('registrations')
                .update({ team_members: updatedTeamMembers })
                .eq('id', addMemberModal.leaderId)

            if (updateLeaderError) throw updateLeaderError

            // Create new registration for the member
            const { error: createRegError } = await supabase
                .from('registrations')
                .insert({
                    event_id: id,
                    profile_id: newProfile.id,
                    status: 'confirmed',
                    team_members: [] // Members have empty array
                })

            if (createRegError) throw createRegError

            alert(`${newProfile.full_name} successfully added to the team!`)
            setAddMemberModal({ isOpen: false, leaderId: null, leaderName: '' })
            setAddMemberRollNumber('')
            fetchParticipants()
        } catch (error) {
            console.error('Error adding member:', error)
            alert('Failed to add member: ' + error.message)
        } finally {
            setIsAddingMember(false)
        }
    }


    const verifyPayment = async (registrationId) => {
        try {
            // 1. Get leader registration details
            const { data: leaderReg, error: fetchError } = await supabase
                .from('registrations')
                .select('*')
                .eq('id', registrationId)
                .single()

            if (fetchError) throw fetchError

            // 2. Update leader registration status to 'confirmed'
            const { error } = await supabase
                .from('registrations')
                .update({ status: 'confirmed' })
                .eq('id', registrationId)

            if (error) throw error

            // 3. If team event, verify all member registrations
            if (leaderReg.team_members && leaderReg.team_members.length > 0) {
                const memberIds = leaderReg.team_members.map(m => m.id)

                const { error: bulkError } = await supabase
                    .from('registrations')
                    .update({ status: 'confirmed' })
                    .eq('event_id', leaderReg.event_id)
                    .in('profile_id', memberIds)

                if (bulkError) console.error('Bulk verify error:', bulkError)
            }

            // 4. Refresh views
            await fetchPayments()
            await fetchParticipants()

            const teamMsg = (leaderReg.team_members?.length > 0)
                ? ` and ${leaderReg.team_members.length} team member(s)`
                : ''
            alert(`Payment verified! Student${teamMsg} moved to Participants.`)
        } catch (error) {
            console.error('Verification error:', error)
            alert('Failed to verify payment: ' + error.message)
        }
    }

    // Control Tab Functions
    const checkEventDateMatch = () => {
        if (!event?.event_date) return false
        const today = new Date().toISOString().split('T')[0]
        const eventDate = new Date(event.event_date).toISOString().split('T')[0]
        return today === eventDate
    }

    const handleGoLive = async (forceLive = false) => {
        if (!forceLive && !checkEventDateMatch()) {
            setShowDateWarning(true)
            return
        }

        setIsGoingLive(true)
        try {
            const { error } = await supabase
                .from('events')
                .update({
                    is_live: true,
                    event_status: 'live',
                    live_started_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            await fetchEventDetails()
            alert('Event is now LIVE! 🔴')
        } catch (error) {
            console.error('Error going live:', error)
            alert('Failed to go live: ' + error.message)
        } finally {
            setIsGoingLive(false)
            setShowDateWarning(false)
        }
    }

    const handleEndLive = async () => {
        if (!confirm('Stop live broadcasting? You can go live again anytime.')) return

        setIsGoingLive(true)
        try {
            const { error } = await supabase
                .from('events')
                .update({
                    is_live: false,
                    event_status: 'upcoming',
                    live_ended_at: new Date().toISOString()
                })
                .eq('id', id)

            if (error) throw error

            await fetchEventDetails()
            alert('Event is now offline. You can go live again anytime!')
        } catch (error) {
            console.error('Error stopping live:', error)
            alert('Failed to stop live: ' + error.message)
        } finally {
            setIsGoingLive(false)
        }
    }

    // Results Functions
    const handleAnnounceResults = async () => {
        if (!resultForm.first_place) {
            setConfirmDialog({
                isOpen: true,
                type: 'warning',
                title: 'Missing Winner',
                message: 'At least first place winner must be selected before announcing results.',
                confirmText: 'OK',
                showCancel: false,
                onConfirm: () => { }
            })
            return
        }

        setConfirmDialog({
            isOpen: true,
            type: 'confirm',
            title: 'Announce Results?',
            message: 'This will update win counts for all winners and mark the event as completed. This action cannot be undone.',
            confirmText: 'Announce Results',
            cancelText: 'Cancel',
            showCancel: true,
            onConfirm: async () => {
                setAnnouncingResults(true)
                try {
                    // Get current user ID
                    const { data: { user } } = await supabase.auth.getUser()
                    const currentUserId = user?.id

                    // Process each position
                    const positions = [
                        { key: 'first_place', position: 1 },
                        { key: 'second_place', position: 2 },
                        { key: 'third_place', position: 3 }
                    ]

                    for (const { key, position } of positions) {
                        const regId = resultForm[key]
                        if (!regId) continue

                        // Get registration with team members
                        const { data: registration, error: regError } = await supabase
                            .from('registrations')
                            .select('*, user:profiles(id)')
                            .eq('id', regId)
                            .single()

                        if (regError || !registration) {
                            console.error('Error fetching registration:', regError)
                            continue
                        }

                        // Collect all profile IDs (leader + team members)
                        const profileIds = [registration.user.id]
                        if (registration.team_members && registration.team_members.length > 0) {
                            profileIds.push(...registration.team_members.map(m => m.id))
                        }

                        // Increment win counts
                        const { error: rpcError } = await supabase.rpc('increment_win_count', {
                            profile_ids: profileIds,
                            place_position: position
                        })

                        if (rpcError) {
                            console.error('Error incrementing win counts:', rpcError)
                            throw rpcError
                        }

                        // Store result in event_results table
                        const { error: insertError } = await supabase.from('event_results').insert({
                            event_id: id,
                            registration_id: regId,
                            position: position,
                            team_members: registration.team_members || [],
                            announced_by: currentUserId
                        })

                        if (insertError) {
                            console.error('Error storing result:', insertError)
                        }
                    }

                    // Update event with winners and mark results as announced
                    const { error: updateError } = await supabase.from('events').update({
                        winner_profile_id: resultForm.first_place || null,
                        runnerup_profile_id: resultForm.second_place || null,
                        second_runnerup_profile_id: resultForm.third_place || null,
                        results_announced: true,
                        results_announced_at: new Date().toISOString(),
                        event_status: 'completed'
                    }).eq('id', id)

                    if (updateError) throw updateError

                    setConfirmDialog({
                        isOpen: true,
                        type: 'success',
                        title: 'Results Announced!',
                        message: '✅ Results have been announced successfully! Win counts have been updated for all winners.',
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: () => { }
                    })

                    await fetchEventDetails()
                    if (activeTab === 'participants') await fetchParticipants()
                } catch (error) {
                    console.error('Error announcing results:', error)
                    setConfirmDialog({
                        isOpen: true,
                        type: 'error',
                        title: 'Failed to Announce Results',
                        message: 'An error occurred: ' + error.message,
                        confirmText: 'OK',
                        showCancel: false,
                        onConfirm: () => { }
                    })
                } finally {
                    setAnnouncingResults(false)
                }
            }
        })
    }

    if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
    if (!event) return <div className="p-8 text-center">Event not found.</div>

    const tabs = [
        { id: 'overview', label: 'Overview', icon: Clock },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'participants', label: 'Participants', icon: Users },
        { id: 'results', label: 'Results', icon: BarChart3 },
        { id: 'control', label: 'Control', icon: Activity },
    ]

    const participantColumns = [
        {
            key: 'user', title: 'Participant', sortable: true, render: (row) => (
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSelectedProfile(row.user)}
                        className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-purple-300 transition-all cursor-pointer"
                        title="View Profile"
                    >
                        {row.user?.avatar_url ? (
                            <img src={row.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                        ) : (
                            <span>{row.user?.full_name?.charAt(0) || 'U'}</span>
                        )}
                    </button>
                    <div>
                        <div className="font-bold text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">{row.user?.college_email}</div>
                    </div>
                </div>
            )
        },
        { key: 'roll', title: 'Roll No', render: (row) => row.user?.roll_number || '-' },
        { key: 'department', title: 'Department', render: (row) => row.user?.department || '-' },
        { key: 'year', title: 'Year', render: (row) => row.user?.year_of_study || '-' },
        {
            key: 'team', title: 'Team', render: (row) => {
                try {
                    // Check if this is a LEADER (has team_members array with length > 0)
                    if (row.team_members && row.team_members.length > 0) {
                        const teamSize = row.team_members.length + 1; // +1 for leader
                        return `Team Leader · ${teamSize} members`;
                    }

                    // Check if this is a MEMBER (find if their ID is in another registration's team_members)
                    // We need to search through all participants to find the leader
                    const leader = participants.find(p =>
                        p.team_members &&
                        p.team_members.length > 0 &&
                        p.team_members.some(m => m.id === row.user?.id)
                    );

                    if (leader) {
                        const teamSize = leader.team_members.length + 1; // +1 for leader
                        return `Team Member · ${teamSize} total`;
                    }

                    return 'Solo';
                } catch (e) {
                    console.error('Team render error:', e);
                    return 'Solo';
                }
            }
        },
        { key: 'status', title: 'Status', sortable: true, render: (row) => (<span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${row.status === 'confirmed' ? 'bg-green-100 text-green-700' : row.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.status}</span>) },
        { key: 'actions', title: 'Actions', render: (row) => (<button onClick={() => handleRejectParticipant(row.id)} disabled={row.status === 'rejected'} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed" title="Reject participant">Reject</button>) }
    ]

    const paymentColumns = [
        {
            key: 'user',
            title: 'User',
            render: (row) => {
                const isTeamLeader = row.team_members && row.team_members.length > 0;
                return (
                    <div>
                        <div className="font-medium">{row.user?.full_name || 'Unknown'}</div>
                        {isTeamLeader && (
                            <div className="text-xs text-indigo-600 font-semibold flex items-center gap-1">
                                <Users className="h-3 w-3" /> Team Leader · {row.team_members.length + 1} members
                            </div>
                        )}
                    </div>
                )
            }
        },
        { key: 'amount', title: 'Amount', render: (row) => `₹${row.amount || 500}` },
        { key: 'txn', title: 'Transaction ID', render: (row) => <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id || 'N/A'}</span> },
        { key: 'screenshot', title: 'Proof', render: (row) => row.payment_screenshot_path ? <a href={row.payment_screenshot_path} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline flex items-center gap-1"><Eye className="h-3 w-3" /> View</a> : <span className="text-gray-400">None</span> },
        { key: 'status', title: 'Status', render: (row) => <span className={`px-2 py-1 rounded text-xs font-bold ${row.payment_status === 'verified' || row.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{row.payment_status || row.status || 'Pending'}</span> },
        {
            key: 'actions', title: 'Verify', render: (row) => (
                <button onClick={() => verifyPayment(row.id, !row.hasOwnProperty('status'), 'verified')} className="p-1.5 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg text-xs font-bold">Verify</button>
            )
        }
    ]

    return (
        <div className="max-w-7xl mx-auto px-4 md:px-0 space-y-6">
            {/* Header - Responsive */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <Link to={backLink} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900">{event.name}</h1>
                        <p className="text-gray-500 text-xs md:text-sm hidden md:block">Manage your event details and lifecycle.</p>
                    </div>
                </div>
                <div className="flex gap-2 md:ml-auto">
                    <button className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors text-sm">
                        <Download className="h-4 w-4" />
                        <span className="hidden sm:inline">Reports</span>
                    </button>
                    <button className="flex items-center justify-center gap-2 px-3 md:px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-medium shadow-md transition-colors text-sm">
                        <Edit2 className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit Event</span>
                    </button>
                </div>
            </div>

            {/* Banner - Responsive */}
            <div className="h-32 md:h-48 rounded-xl md:rounded-2xl overflow-hidden relative group">
                {!bannerImageError ? (
                    <>
                        <img
                            src={event.image_path || getUnsplashImageUrl(event.name, 1200, 300)}
                            alt={event.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                                const categoryImg = getCategoryImage(event.category)
                                if (e.target.src !== categoryImg) {
                                    e.target.src = categoryImg
                                } else {
                                    setBannerImageError(true)
                                }
                            }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-3 md:bottom-6 left-3 md:left-6 text-white">
                            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-xs md:text-sm font-medium opacity-90">
                                <span className="flex items-center gap-1.5"><Calendar className="h-3 md:h-4 w-3 md:w-4" /> {event.day}</span>
                                <span className="flex items-center gap-1.5"><Clock className="h-3 md:h-4 w-3 md:w-4" /> {event.time}</span>
                                <span className="flex items-center gap-1.5 hidden sm:flex"><MapPin className="h-3 md:h-4 w-3 md:w-4" /> {event.venue}</span>
                            </div>
                        </div>
                    </>
                ) : (
                    <AnimatedBannerFallback
                        eventName={event.name}
                        category={event.category}
                        height="h-32 md:h-48"
                        showEventInfo={true}
                        eventDay={event.day}
                        eventTime={event.time}
                        eventVenue={event.venue}
                    />
                )}
            </div>

            {/* Tabs - Sticky & Responsive */}
            <div className="bg-white rounded-xl md:rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="sticky top-0 z-20 flex border-b border-gray-100 px-2 md:px-6 bg-white shadow-sm">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 md:flex-auto flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-2 md:px-4 py-3 md:py-4 text-xs md:text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                                }`}
                            title={tab.label}
                        >
                            <tab.icon className={`h-4 w-4 md:h-4 md:w-4 ${activeTab === tab.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            <span className="hidden md:inline text-sm">{tab.label}</span>
                            <span className="md:hidden text-[10px] leading-tight">{tab.label.split(' ')[0]}</span>
                        </button>
                    ))}
                </div>

                <div className="p-3 md:p-6 flex-1 bg-white">
                    {/* OVERVIEW */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100"><p className="text-xs text-indigo-600 uppercase font-bold tracking-wider">Total Registrations</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.length || 0}</h3></div>
                                <div className="p-4 rounded-xl bg-green-50 border border-green-100"><p className="text-xs text-green-600 uppercase font-bold tracking-wider">Confirmed</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status === 'confirmed').length || 0}</h3></div>
                                <div className="p-4 rounded-xl bg-yellow-50 border border-yellow-100"><p className="text-xs text-yellow-600 uppercase font-bold tracking-wider">Pending</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status === 'pending').length || 0}</h3></div>
                                <div className="p-4 rounded-xl bg-red-50 border border-red-100"><p className="text-xs text-red-600 uppercase font-bold tracking-wider">Rejected</p><h3 className="text-2xl font-bold text-gray-900 mt-1">{participants.filter(p => p.status === 'rejected').length || 0}</h3></div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                <div className="md:col-span-2 space-y-6">
                                    <div><h3 className="text-lg font-bold text-gray-900 mb-2">Description</h3><p className="text-gray-600 leading-relaxed">{event.description || 'No description provided.'}</p></div>
                                    <div><h3 className="text-lg font-bold text-gray-900 mb-2">Rules</h3><div className="prose prose-sm prose-indigo text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100">{event.rules || 'No rules.'}</div></div>
                                </div>
                                <div className="space-y-6">
                                    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm"><h4 className="text-sm font-bold text-gray-900 mb-3">Event Details</h4><dl className="space-y-3 text-sm"><div className="flex justify-between"><dt className="text-gray-500">Day</dt><dd className="font-medium">{event.day}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Mode</dt><dd className="font-medium">{event.mode}</dd></div><div className="flex justify-between"><dt className="text-gray-500">Fee</dt><dd className="font-medium text-green-600">₹{event.fee || 0}</dd></div></dl></div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* PARTICIPANTS */}
                    {activeTab === 'participants' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            {/* Info Banner for Offline Registration */}
                            <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-blue-900 mb-1">Offline Registration Available</h4>
                                        <p className="text-sm text-blue-800">
                                            Use the <strong>"+ Add"</strong> button to register students who didn't register online.
                                            {event?.subcategory?.toLowerCase() === 'group'
                                                ? ' You can add complete teams with leaders and members.'
                                                : ' You can add individual participants directly.'
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-lg font-bold text-gray-900">Participants</h3><p className="text-sm text-gray-500">Manage individuals and teams.</p></div>
                                <div className="flex gap-2">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by roll number..."
                                            value={participantSearch}
                                            onChange={(e) => setParticipantSearch(e.target.value)}
                                            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-64"
                                        />
                                        {participantSearch && (
                                            <button
                                                onClick={() => setParticipantSearch('')}
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                            >
                                                <XIcon className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                    {/* ADD PARTICIPANT/TEAM BUTTON - OFFLINE REGISTRATION ⭐ */}
                                    <button
                                        onClick={handleAddParticipantClick}
                                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-all shadow-sm"
                                        title={event?.subcategory?.toLowerCase() === 'group' ? 'Add Team (Offline Registration)' : 'Add Participant (Offline Registration)'}
                                    >
                                        <Plus className="h-4 w-4" />
                                        Add
                                    </button>
                                    {/* Members Only Toggle (Group Events Only) */}
                                    {event?.subcategory?.toLowerCase() === 'group' && (
                                        <button
                                            onClick={() => setShowMembersOnly(!showMembersOnly)}
                                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${showMembersOnly
                                                ? 'bg-purple-600 text-white hover:bg-purple-700'
                                                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                                                }`}
                                        >
                                            <Users className="h-4 w-4" />
                                            {showMembersOnly ? 'Show Leaders' : 'Members Only'}
                                        </button>
                                    )}
                                    <button onClick={handleExportCSV} className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-semibold hover:bg-indigo-100"><Download className="h-4 w-4" /> Export CSV</button>
                                </div>
                            </div>
                            {loadingParticipants ? (
                                <div className="text-center py-10">Loading...</div>
                            ) : participants.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed"><Users className="h-10 w-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500">No participants yet.</p></div>
                            ) : (
                                <div className="space-y-2">
                                    {(() => {
                                        const isGroupEvent = event?.subcategory?.toLowerCase() === 'group';

                                        let displayParticipants;

                                        if (isGroupEvent) {
                                            const confirmed = participants.filter(p => p.status === 'confirmed');

                                            if (showMembersOnly) {
                                                // MEMBERS ONLY MODE: Show participants with EMPTY team_members
                                                displayParticipants = confirmed.filter(p =>
                                                    !p.team_members || p.team_members.length === 0
                                                );
                                                console.log('👥 MEMBERS ONLY MODE - Showing', displayParticipants.length, 'members');
                                            } else {
                                                // LEADERS MODE (default): Show participants with NON-EMPTY team_members
                                                displayParticipants = confirmed.filter(p =>
                                                    p.team_members && p.team_members.length > 0
                                                );
                                                console.log('👑 LEADERS MODE - Showing', displayParticipants.length, 'leaders');
                                            }
                                        } else {
                                            // Individual events: show all confirmed
                                            displayParticipants = participants.filter(p => p.status === 'confirmed');
                                        }

                                        // Apply search filter if search query exists
                                        if (participantSearch.trim()) {
                                            const searchTerm = participantSearch.trim().toLowerCase();
                                            displayParticipants = displayParticipants.filter(p =>
                                                p.user?.roll_number?.toLowerCase().includes(searchTerm)
                                            );
                                        }

                                        // Show "No results found" message if filtered list is empty
                                        if (displayParticipants.length === 0 && participantSearch.trim()) {
                                            return (
                                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed">
                                                    <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                                    <p className="text-gray-500 font-medium">No search results found</p>
                                                    <p className="text-gray-400 text-sm mt-1">No participant with roll number "{participantSearch}"</p>
                                                </div>
                                            );
                                        }

                                        return displayParticipants.map((participant) => {
                                            const isLeader = participant.team_members && participant.team_members.length > 0;
                                            const isExpanded = expandedTeams.has(participant.id);
                                            const totalTeamSize = isLeader ? participant.team_members.length + 1 : 1;

                                            return (
                                                <div
                                                    key={participant.id}
                                                    className="group border border-gray-200 rounded-lg overflow-hidden hover:border-indigo-300 transition"
                                                    onMouseEnter={() => !showMembersOnly && isLeader && toggleTeamExpansion(participant.id)}
                                                    onMouseLeave={() => !showMembersOnly && isLeader && toggleTeamExpansion(participant.id)}
                                                >
                                                    <div className={`p-4 flex items-center justify-between ${isLeader ? 'bg-indigo-50' : 'bg-white'}`}>
                                                        <div className="flex items-center gap-4 flex-1">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation()
                                                                    setSelectedProfile(participant.user)
                                                                }}
                                                                className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold hover:ring-4 hover:ring-indigo-200 transition-all cursor-pointer"
                                                                title="View Profile"
                                                            >
                                                                {participant.user?.full_name?.[0]?.toUpperCase() || '?'}
                                                            </button>
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <span className="font-bold text-gray-900">{participant.user?.full_name || 'Unknown'}</span>
                                                                    {showMembersOnly ? (
                                                                        <span className="px-2 py-1 bg-gray-500 text-white text-xs font-bold rounded-full">
                                                                            Team Member
                                                                        </span>
                                                                    ) : isLeader && (
                                                                        <>
                                                                            <span className="px-2 py-1 bg-indigo-600 text-white text-xs font-bold rounded-full flex items-center gap-1">
                                                                                <Users className="h-3 w-3" />Team Leader
                                                                            </span>
                                                                            <span className="px-2 py-1 bg-purple-600 text-white text-xs font-bold rounded-full">
                                                                                Team Members: {totalTeamSize}
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="text-sm text-gray-600">{participant.user?.college_email} • {participant.user?.roll_number}</div>
                                                            </div>
                                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${participant.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{participant.status}</span>
                                                        </div>

                                                        {/* Action Buttons */}
                                                        <div className="flex items-center gap-2 ml-4">
                                                            {/* Delete Button for Individual Events */}
                                                            {!isGroupEvent && (
                                                                <button
                                                                    onClick={() => handleDeleteMember(participant.id, participant.user?.full_name || 'Unknown')}
                                                                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                                                                    title="Delete Registration"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}

                                                            {/* Replace Button (Members Only) - HIDDEN FOR NOW, KEEP LOGIC FOR FUTURE */}
                                                            {/* {showMembersOnly && (
                                                                <button
                                                                    onClick={() => {
                                                                        setReplaceModal({
                                                                            isOpen: true,
                                                                            memberId: participant.id,
                                                                            memberName: participant.user?.full_name || 'Unknown'
                                                                        })
                                                                    }}
                                                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2"
                                                                    title="Replace Member"
                                                                >
                                                                    <User className="h-4 w-4" />
                                                                    Replace
                                                                </button>
                                                            )} */}

                                                            {/* Delete Button (Members Only) */}
                                                            {showMembersOnly && (
                                                                <button
                                                                    onClick={() => handleDeleteMember(participant.id, participant.user?.full_name || 'Unknown')}
                                                                    className="p-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
                                                                    title="Delete Member"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            )}

                                                            {/* Add Member Button (Team Leaders Only) */}
                                                            {isLeader && !showMembersOnly && (
                                                                <button
                                                                    onClick={() => {
                                                                        setAddMemberModal({
                                                                            isOpen: true,
                                                                            leaderId: participant.id,
                                                                            leaderName: participant.user?.full_name || 'Unknown'
                                                                        })
                                                                    }}
                                                                    className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
                                                                    title="Add Team Member"
                                                                >
                                                                    <Plus className="h-4 w-4" />
                                                                </button>
                                                            )}

                                                            {/* Reject Button */}
                                                            <button
                                                                onClick={async () => {
                                                                    if (isLeader && !showMembersOnly) {
                                                                        // Bulk reject team
                                                                        if (!confirm(`Reject entire team? This will reject the leader and all ${participant.team_members.length} team members.`)) return;

                                                                        try {
                                                                            // Get member profile IDs
                                                                            const memberProfileIds = participant.team_members.map(m => m.id);

                                                                            // Reject all team members
                                                                            const { error: memberError } = await supabase
                                                                                .from('registrations')
                                                                                .update({ status: 'rejected' })
                                                                                .eq('event_id', id)
                                                                                .in('profile_id', memberProfileIds);

                                                                            if (memberError) {
                                                                                console.error('Error rejecting team members:', memberError);
                                                                                alert('Error rejecting team members');
                                                                                return;
                                                                            }

                                                                            // Reject leader
                                                                            await handleRejectParticipant(participant.id);
                                                                        } catch (error) {
                                                                            console.error('Bulk reject error:', error);
                                                                            alert('Error rejecting team');
                                                                        }
                                                                    } else {
                                                                        // Individual participant/member
                                                                        handleRejectParticipant(participant.id);
                                                                    }
                                                                }}
                                                                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                                                            >
                                                                {isLeader && !showMembersOnly ? 'Reject Team' : 'Reject'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                    {!showMembersOnly && isLeader && (
                                                        <div className={`transition-all duration-300 ${isExpanded ? 'max-h-96' : 'max-h-0'} overflow-hidden`}>
                                                            <div className="bg-gray-50 border-t p-4">
                                                                <div className="text-xs font-bold text-gray-500 mb-2">TEAM MEMBERS:</div>
                                                                <div className="grid md:grid-cols-2 gap-2">
                                                                    {participant.team_members.map((m, i) => (
                                                                        <div key={m.id} className="p-3 bg-white rounded border flex items-center gap-3">
                                                                            <div className="h-8 w-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-sm">{m.full_name?.[0] || '?'}</div>
                                                                            <div className="flex-1"><div className="font-medium text-sm">{m.full_name}</div><div className="text-xs text-gray-500">{m.roll_number}</div></div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            )}
                        </div>
                    )}

                    {/* RESULTS */}
                    {activeTab === 'results' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Results & Winners</h3>
                                    <p className="text-sm text-gray-500">Select winners and announce results</p>
                                </div>
                                {event?.results_announced && (
                                    <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-semibold flex items-center gap-2">
                                        <Check className="h-5 w-5" /> Results Announced
                                    </span>
                                )}
                            </div>

                            <div className="space-y-6">
                                {/* Winner Selection Form */}
                                <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg p-6">
                                    <h4 className="text-lg font-bold text-gray-900 mb-4">🏆 Select Winners</h4>

                                    {participants.length === 0 ? (
                                        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                                            <p className="text-gray-500 mb-2">No confirmed participants yet</p>
                                            <p className="text-sm text-gray-400">Participants must be confirmed before announcing results</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-6">
                                            {/* First Place */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                    <span className="text-2xl">🥇</span> First Place (Required)
                                                </label>
                                                <select
                                                    value={resultForm.first_place}
                                                    onChange={(e) => setResultForm({ ...resultForm, first_place: e.target.value })}
                                                    disabled={event?.results_announced}
                                                    className="w-full px-4 py-3 border-2 border-yellow-300 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-yellow-50"
                                                >
                                                    <option value="">-- Select First Place Winner --</option>
                                                    {participants
                                                        .filter(p => {
                                                            // For group events (max_team_size > 1), only show team leaders
                                                            if (event.max_team_size > 1) {
                                                                return p.status === 'confirmed' && p.team_members?.length > 0
                                                            }
                                                            // For individual events, show all confirmed participants
                                                            return p.status === 'confirmed'
                                                        })
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.user?.full_name} ({p.user?.roll_number})
                                                                {p.team_members?.length > 0 ? ` - Team Leader (${p.team_members.length + 1} members)` : ''}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Second Place */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                    <span className="text-2xl">🥈</span> Second Place (Optional)
                                                </label>
                                                <select
                                                    value={resultForm.second_place}
                                                    onChange={(e) => setResultForm({ ...resultForm, second_place: e.target.value })}
                                                    disabled={event?.results_announced}
                                                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-gray-500 focus:border-gray-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-gray-50"
                                                >
                                                    <option value="">-- Select Second Place Winner --</option>
                                                    {participants
                                                        .filter(p => {
                                                            // For group events (max_team_size > 1), only show team leaders
                                                            if (event.max_team_size > 1) {
                                                                return p.status === 'confirmed' && p.team_members?.length > 0 && p.id !== resultForm.first_place
                                                            }
                                                            // For individual events, show all confirmed participants except first place
                                                            return p.status === 'confirmed' && p.id !== resultForm.first_place
                                                        })
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.user?.full_name} ({p.user?.roll_number})
                                                                {p.team_members?.length > 0 ? ` - Team Leader (${p.team_members.length + 1} members)` : ''}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Third Place */}
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                                    <span className="text-2xl">🥉</span> Third Place (Optional)
                                                </label>
                                                <select
                                                    value={resultForm.third_place}
                                                    onChange={(e) => setResultForm({ ...resultForm, third_place: e.target.value })}
                                                    disabled={event?.results_announced}
                                                    className="w-full px-4 py-3 border-2 border-orange-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-50 disabled:cursor-not-allowed bg-orange-50"
                                                >
                                                    <option value="">-- Select Third Place Winner --</option>
                                                    {participants
                                                        .filter(p => {
                                                            // For group events (max_team_size > 1), only show team leaders
                                                            if (event.max_team_size > 1) {
                                                                return p.status === 'confirmed' && p.team_members?.length > 0 &&
                                                                    p.id !== resultForm.first_place && p.id !== resultForm.second_place
                                                            }
                                                            // For individual events, show all confirmed participants except first and second
                                                            return p.status === 'confirmed' && p.id !== resultForm.first_place && p.id !== resultForm.second_place
                                                        })
                                                        .map(p => (
                                                            <option key={p.id} value={p.id}>
                                                                {p.user?.full_name} ({p.user?.roll_number})
                                                                {p.team_members?.length > 0 ? ` - Team Leader (${p.team_members.length + 1} members)` : ''}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            {/* Announce Button */}
                                            {!event?.results_announced && (
                                                <button
                                                    onClick={handleAnnounceResults}
                                                    disabled={!resultForm.first_place || announcingResults}
                                                    className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-bold text-lg hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <BarChart3 className="h-6 w-6" />
                                                    {announcingResults ? 'Announcing...' : '📢 Announce Results'}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Current Results Display (if announced) */}
                                {event?.results_announced && (
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border-2 border-green-200 shadow-lg p-6">
                                        <h4 className="font-bold text-green-800 mb-4 text-xl flex items-center gap-2">
                                            <Check className="h-6 w-6" /> Results Announced
                                        </h4>
                                        <div className="text-sm text-green-700 mb-4">
                                            Announced on: {event.results_announced_at ? new Date(event.results_announced_at).toLocaleString() : 'N/A'}
                                        </div>

                                        <div className="space-y-3">
                                            {/* Display winners */}
                                            {[
                                                { key: 'first_place', label: '🥇 First Place', id: event.winner_profile_id },
                                                { key: 'second_place', label: '🥈 Second Place', id: event.runnerup_profile_id },
                                                { key: 'third_place', label: '🥉 Third Place', id: event.second_runnerup_profile_id }
                                            ].map(({ key, label, id: winnerId }) => {
                                                if (!winnerId) return null
                                                const winner = participants.find(p => p.id === winnerId)
                                                if (!winner) return null

                                                return (
                                                    <div key={key} className="bg-white rounded-xl p-4 shadow-sm border border-green-200">
                                                        <div className="font-semibold text-gray-700 mb-2">{label}</div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white font-bold text-lg">
                                                                {winner.user?.avatar_url ? (
                                                                    <img src={winner.user.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                                                                ) : (
                                                                    <span>{winner.user?.full_name?.charAt(0) || 'U'}</span>
                                                                )}
                                                            </div>
                                                            <div>
                                                                <div className="font-bold text-gray-900">{winner.user?.full_name}</div>
                                                                <div className="text-sm text-gray-500">{winner.user?.roll_number}</div>
                                                                {winner.team_members?.length > 0 && (
                                                                    <div className="text-xs text-purple-600 font-semibold mt-1">
                                                                        Team Leader • {winner.team_members.length + 1} members
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Info Box */}
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                    <div className="flex gap-3">
                                        <div className="text-blue-600 mt-0.5">ℹ️</div>
                                        <div className="text-sm text-blue-900">
                                            <p className="font-semibold mb-1">About Results</p>
                                            <ul className="list-disc list-inside space-y-1 text-blue-800">
                                                <li>Select winners from confirmed participants only</li>
                                                <li>Win counts are automatically updated in user profiles</li>
                                                <li>For team events, all team members get win count increments</li>
                                                <li>Results cannot be changed once announced</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* CONTROL */}
                    {activeTab === 'control' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">Live Event Control</h3>
                                    <p className="text-sm text-gray-500">Manage event live status and visibility</p>
                                </div>
                            </div>

                            {/* Live Status Card */}
                            <div className="bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden">
                                <div className={`p-6 ${event?.is_live ? 'bg-gradient-to-r from-red-50 to-orange-50 border-b-4 border-red-500' : 'bg-gray-50'}`}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            {event?.is_live ? (
                                                <>
                                                    <div className="relative">
                                                        <Activity className="h-12 w-12 text-red-600 animate-pulse" />
                                                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-red-600 rounded-full animate-ping"></div>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-bold text-red-600 flex items-center gap-2">
                                                            🔴 LIVE NOW
                                                        </h4>
                                                        <p className="text-sm text-gray-600 mt-1">
                                                            Started: {event.live_started_at ? new Date(event.live_started_at).toLocaleString() : 'N/A'}
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                                        <Activity className="h-6 w-6 text-gray-400" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-bold text-gray-900">Event Offline</h4>
                                                        <p className="text-sm text-gray-500 mt-1">Not currently visible in "Happening Now"</p>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm text-gray-500 mb-1">Status</div>
                                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold ${event?.event_status === 'ongoing' ? 'bg-green-100 text-green-700' :
                                                event?.event_status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-gray-100 text-gray-700'
                                                }`}>
                                                {event?.event_status || 'upcoming'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 space-y-6">
                                    {/* Event Info */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Event Date</div>
                                            <div className="text-lg font-bold text-gray-900">{event?.event_date || 'Not set'}</div>
                                        </div>
                                        <div className="p-4 bg-gray-50 rounded-xl">
                                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Today's Date</div>
                                            <div className="text-lg font-bold text-gray-900">{new Date().toISOString().split('T')[0]}</div>
                                        </div>
                                    </div>

                                    {/* Date Match Indicator */}
                                    {event?.event_date && (
                                        <div className={`p-4 rounded-xl border-2 ${checkEventDateMatch()
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-yellow-50 border-yellow-200'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                {checkEventDateMatch() ? (
                                                    <>
                                                        <Check className="h-6 w-6 text-green-600" />
                                                        <div>
                                                            <div className="font-bold text-green-900">Event Date Matches</div>
                                                            <div className="text-sm text-green-700">You can go live without warnings</div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XIcon className="h-6 w-6 text-yellow-600" />
                                                        <div>
                                                            <div className="font-bold text-yellow-900">Date Mismatch Warning</div>
                                                            <div className="text-sm text-yellow-700">Today is not the scheduled event date</div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Control Buttons */}
                                    <div className="flex gap-4">
                                        {!event?.is_live ? (
                                            <button
                                                onClick={() => handleGoLive(false)}
                                                disabled={isGoingLive}
                                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-bold text-lg hover:from-red-700 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <Activity className="h-6 w-6" />
                                                {isGoingLive ? 'Going Live...' : '🔴 Go Live'}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleEndLive}
                                                disabled={isGoingLive}
                                                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-gray-600 text-white rounded-xl font-bold text-lg hover:bg-gray-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <XIcon className="h-6 w-6" />
                                                {isGoingLive ? 'Stopping...' : 'Stop Live'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Info Box */}
                                    <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                                        <div className="flex gap-3">
                                            <div className="text-blue-600 mt-0.5">ℹ️</div>
                                            <div className="text-sm text-blue-900">
                                                <p className="font-semibold mb-1">About Live Events</p>
                                                <ul className="list-disc list-inside space-y-1 text-blue-800">
                                                    <li>Live events appear in the "Happening Now" section for students</li>
                                                    <li>You can override date warnings if needed</li>
                                                    <li>Event status automatically updates when going live or ending</li>
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Date Warning Modal */}
                    {showDateWarning && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                            <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                                <div className="text-center mb-6">
                                    <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-4xl">⚠️</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Date Mismatch Warning</h3>
                                    <p className="text-gray-600">
                                        Today is <span className="font-bold text-gray-900">{new Date().toISOString().split('T')[0]}</span>
                                        <br />
                                        Event is scheduled for <span className="font-bold text-gray-900">{event?.event_date}</span>
                                    </p>
                                    <p className="text-sm text-yellow-700 mt-3 bg-yellow-50 p-3 rounded-lg">
                                        Are you sure you want to go live anyway?
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDateWarning(false)}
                                        className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => handleGoLive(true)}
                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-xl font-semibold hover:from-red-700 hover:to-orange-700 transition shadow-lg"
                                    >
                                        Go Live Anyway
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* PAYMENTS */}
                    {activeTab === 'payments' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <div><h3 className="text-lg font-bold text-gray-900">Payment Verification</h3><p className="text-sm text-gray-500">Verify payments to move students to Participants. Hover over team leaders to expand and see all members.</p></div>

                                {/* Payment Mode Toggle */}
                                <div className="flex gap-2 border border-gray-200 rounded-lg p-1 bg-gray-50">
                                    <button
                                        onClick={() => setPaymentModeFilter('all')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${paymentModeFilter === 'all' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        All
                                    </button>
                                    <button
                                        onClick={() => setPaymentModeFilter('cash')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${paymentModeFilter === 'cash' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        💵 Cash
                                    </button>
                                    <button
                                        onClick={() => setPaymentModeFilter('online')}
                                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${paymentModeFilter === 'online' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
                                    >
                                        📱 Online
                                    </button>
                                </div>
                            </div>

                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {(() => {
                                    // Filter payments by mode
                                    const filteredPayments = payments.filter(p => {
                                        if (paymentModeFilter === 'all') return true
                                        if (paymentModeFilter === 'cash') return p.payment_mode === 'cash'
                                        if (paymentModeFilter === 'online') return p.payment_mode === 'hybrid' || p.payment_mode === 'online'
                                        return true
                                    })

                                    // Dynamic columns based on filter
                                    const paymentColumns = paymentModeFilter === 'cash' ? [
                                        {
                                            key: 'user', title: 'Student', render: (row) => {
                                                const teamSize = row.team_members?.length || 0
                                                return (
                                                    <div className="relative group">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {row.user?.roll_number} • {row.user?.department}
                                                                {teamSize > 0 && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                                        👥 Team Lead (+{teamSize})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team Members Hover Tooltip */}
                                                        {teamSize > 0 && (
                                                            <div className="absolute left-0 top-full mt-2 w-80 bg-white border-2 border-purple-200 rounded-lg shadow-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 max-h-96 overflow-y-auto custom-scrollbar">
                                                                <div className="text-xs font-bold text-purple-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                                                                    <Users className="h-4 w-4" />
                                                                    Team Members ({teamSize})
                                                                </div>
                                                                <div className="space-y-3">
                                                                    {row.team_members.map((member, idx) => (
                                                                        <div key={idx} className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                                                            <div className="flex items-start gap-2">
                                                                                <User className="h-4 w-4 text-purple-600 flex-shrink-0 mt-0.5" />
                                                                                <div className="flex-1 min-w-0">
                                                                                    <div className="font-semibold text-gray-900 text-sm">{member.name}</div>
                                                                                    <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                                                                        <div><span className="font-mono bg-white px-1.5 py-0.5 rounded">{member.roll_number}</span></div>
                                                                                        {member.department && <div>📚 {member.department}</div>}
                                                                                        {member.year && <div>🎓 Year {member.year}</div>}
                                                                                        {member.email && <div className="text-gray-500 truncate text-[10px]">{member.email}</div>}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
                                        },
                                        { key: 'amount', title: 'Amount', render: (row) => <span className="font-semibold text-green-600">₹{event.fee || 0}</span> },
                                        {
                                            key: 'verify', title: 'Action', render: (row) => (
                                                <button
                                                    onClick={() => verifyPayment(row.id)}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition"
                                                >
                                                    ✓ Verify Cash
                                                </button>
                                            )
                                        }
                                    ] : paymentModeFilter === 'online' ? [
                                        {
                                            key: 'user', title: 'Student', render: (row) => {
                                                const teamSize = row.team_members?.length || 0
                                                return (
                                                    <div className="relative group">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {row.user?.roll_number}
                                                                {teamSize > 0 && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                                        👥 Team Lead (+{teamSize})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team Members Hover Tooltip */}
                                                        {teamSize > 0 && (
                                                            <div className="absolute left-0 top-full mt-2 w-80 bg-white border-2 border-purple-200 rounded-lg shadow-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 max-h-96 overflow-y-auto">
                                                                <div className="text-xs font-bold text-purple-700 mb-3 uppercase tracking-wide">Team Members ({teamSize})</div>
                                                                <div className="space-y-2">
                                                                    {row.team_members.map((member, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 text-xs border-b border-gray-100 pb-2 last:border-0">
                                                                            <User className="h-3 w-3 text-purple-500 flex-shrink-0 mt-0.5" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="font-medium text-gray-900">{member.name}</div>
                                                                                <div className="text-gray-500">{member.roll_number}</div>
                                                                                {member.email && <div className="text-gray-400 truncate text-[10px]">{member.email}</div>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
                                        },
                                        { key: 'amount', title: 'Amount', render: (row) => <span className="font-semibold text-green-600">₹{event.fee || 0}</span> },
                                        { key: 'txn', title: 'Transaction ID', render: (row) => row.transaction_id ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id}</span> : <span className="text-gray-400 text-xs">Not provided</span> },
                                        {
                                            key: 'screenshot', title: 'Screenshot', render: (row) => row.payment_screenshot_path ? (
                                                <button
                                                    onClick={() => setScreenshotModal({ isOpen: true, url: row.payment_screenshot_path })}
                                                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                                                >
                                                    <Eye className="h-4 w-4" /> View
                                                </button>
                                            ) : <span className="text-gray-400 text-xs">Not uploaded</span>
                                        },
                                        {
                                            key: 'verify', title: 'Action', render: (row) => (
                                                <button
                                                    onClick={() => verifyPayment(row.id)}
                                                    disabled={!row.transaction_id || !row.payment_screenshot_path}
                                                    className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    ✓ Verify
                                                </button>
                                            )
                                        }
                                    ] : [
                                        // 'all' mode - shows all payments with smart verify logic
                                        {
                                            key: 'user', title: 'Student', render: (row) => {
                                                const teamSize = row.team_members?.length || 0
                                                return (
                                                    <div className="relative group">
                                                        <div>
                                                            <div className="font-medium text-gray-900">{row.user?.full_name || 'Unknown'}</div>
                                                            <div className="text-xs text-gray-500">
                                                                {row.user?.roll_number} • {row.user?.department}
                                                                {teamSize > 0 && (
                                                                    <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                                                                        👥 Team Lead (+{teamSize})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Team Members Hover Tooltip */}
                                                        {teamSize > 0 && (
                                                            <div className="absolute left-0 top-full mt-2 w-80 bg-white border-2 border-purple-200 rounded-lg shadow-xl p-4 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 max-h-96 overflow-y-auto">
                                                                <div className="text-xs font-bold text-purple-700 mb-3 uppercase tracking-wide">Team Members ({teamSize})</div>
                                                                <div className="space-y-2">
                                                                    {row.team_members.map((member, idx) => (
                                                                        <div key={idx} className="flex items-start gap-2 text-xs border-b border-gray-100 pb-2 last:border-0">
                                                                            <User className="h-3 w-3 text-purple-500 flex-shrink-0 mt-0.5" />
                                                                            <div className="flex-1 min-w-0">
                                                                                <div className="font-medium text-gray-900">{member.name}</div>
                                                                                <div className="text-gray-500">{member.roll_number}</div>
                                                                                {member.email && <div className="text-gray-400 truncate text-[10px]">{member.email}</div>}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            }
                                        },
                                        { key: 'mode', title: 'Mode', render: (row) => <span className={`px-2 py-1 rounded text-xs font-semibold ${row.payment_mode === 'cash' ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'}`}>{row.payment_mode === 'cash' ? '💵 Cash' : '💳 Online'}</span> },
                                        { key: 'amount', title: 'Amount', render: (row) => <span className="font-semibold text-green-600">₹{event.fee || 0}</span> },
                                        { key: 'txn', title: 'Transaction ID', render: (row) => row.transaction_id ? <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{row.transaction_id}</span> : <span className="text-gray-400 text-xs">N/A</span> },
                                        {
                                            key: 'screenshot', title: 'Proof', render: (row) => (row.payment_screenshot_url || row.payment_screenshot_path) ? (
                                                <button
                                                    onClick={() => setScreenshotModal({ isOpen: true, url: row.payment_screenshot_url || row.payment_screenshot_path })}
                                                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                                                >
                                                    <Eye className="h-4 w-4" /> View
                                                </button>
                                            ) : <span className="text-gray-400 text-xs">None</span>
                                        },
                                        {
                                            key: 'actions', title: 'Actions', render: (row) => {
                                                // Smart logic: Cash payments don't need transaction_id or screenshot
                                                const isCash = row.payment_mode === 'cash';
                                                const isOnline = row.payment_mode === 'online' || row.payment_mode === 'hybrid';
                                                const canVerify = isCash || (isOnline && row.transaction_id && row.payment_screenshot_path);

                                                return (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => verifyPayment(row.id)}
                                                            disabled={!canVerify}
                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={!canVerify ? 'Online payment requires transaction ID and screenshot' : 'Verify payment'}
                                                        >
                                                            ✓ Verify
                                                        </button>
                                                        <button
                                                            onClick={() => handleRejectPayment(row.id)}
                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                                                            title="Reject payment"
                                                        >
                                                            ✗ Reject
                                                        </button>
                                                    </div>
                                                );
                                            }
                                        }
                                    ]

                                    // Custom payment list with smooth expanding hover (like participants tab)
                                    return (
                                        <div className="space-y-3 min-h-[400px]">
                                            {filteredPayments.length === 0 ? (
                                                <div className="text-center py-12 text-gray-500">
                                                    No {paymentModeFilter === 'all' ? '' : paymentModeFilter} payments pending.
                                                </div>
                                            ) : (
                                                filteredPayments.map((payment) => {
                                                    const teamSize = payment.team_members?.length || 0
                                                    const isLeader = teamSize > 0
                                                    const isExpanded = expandedTeams.has(payment.id)

                                                    // Payment validation
                                                    const isCash = payment.payment_mode === 'cash'
                                                    const isOnline = payment.payment_mode === 'online' || payment.payment_mode === 'hybrid'
                                                    const canVerify = isCash || (isOnline && payment.transaction_id && payment.payment_screenshot_path)

                                                    return (
                                                        <div
                                                            key={payment.id}
                                                            className="group border border-gray-200 rounded-lg overflow-hidden hover:border-purple-300 transition-all duration-200"
                                                            onMouseEnter={() => isLeader && toggleTeamExpansion(payment.id)}
                                                            onMouseLeave={() => isLeader && toggleTeamExpansion(payment.id)}
                                                        >
                                                            {/* Main Payment Row */}
                                                            <div className={`p-4 ${isLeader ? 'bg-purple-50' : 'bg-white'}`}>
                                                                <div className="flex items-center gap-4">
                                                                    {/* Avatar */}
                                                                    <div className="h-12 w-12 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold flex-shrink-0">
                                                                        {payment.user?.full_name?.[0]?.toUpperCase() || '?'}
                                                                    </div>

                                                                    {/* Student Info */}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="flex items-center gap-2 mb-1">
                                                                            <span className="font-bold text-gray-900">{payment.user?.full_name || 'Unknown'}</span>
                                                                            {isLeader && (
                                                                                <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                                                                                    <Users className="h-3 w-3" />
                                                                                    Team Lead (+{teamSize})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-sm text-gray-600">{payment.user?.college_email}</div>
                                                                        <div className="text-xs text-gray-500 mt-0.5">{payment.user?.roll_number} • {payment.user?.department}</div>
                                                                    </div>

                                                                    {/* Payment Mode */}
                                                                    <div className="flex-shrink-0">
                                                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${isCash ? 'bg-green-50 text-green-700' : 'bg-blue-50 text-blue-700'
                                                                            }`}>
                                                                            {isCash ? '💵 Cash' : '💳 Online'}
                                                                        </span>
                                                                    </div>

                                                                    {/* Amount */}
                                                                    <div className="text-right flex-shrink-0">
                                                                        <div className="text-xs text-gray-500">Amount</div>
                                                                        <div className="font-bold text-green-600">₹{event.fee || 0}</div>
                                                                    </div>

                                                                    {/* Transaction ID (if online) */}
                                                                    {isOnline && (
                                                                        <div className="hidden md:block flex-shrink-0 max-w-[150px]">
                                                                            <div className="text-xs text-gray-500 mb-1">Transaction ID</div>
                                                                            {payment.transaction_id ? (
                                                                                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded block truncate">
                                                                                    {payment.transaction_id}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-xs text-gray-400">Not provided</span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Proof (if online) */}
                                                                    {isOnline && (
                                                                        <div className="hidden md:block flex-shrink-0">
                                                                            {payment.payment_screenshot_url || payment.payment_screenshot_path ? (
                                                                                <button
                                                                                    onClick={() => setScreenshotModal({ isOpen: true, url: payment.payment_screenshot_url || payment.payment_screenshot_path })}
                                                                                    className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                                                                                >
                                                                                    <Eye className="h-4 w-4" /> View Proof
                                                                                </button>
                                                                            ) : (
                                                                                <span className="text-xs text-gray-400">No proof</span>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {/* Actions */}
                                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                                        <button
                                                                            onClick={() => verifyPayment(payment.id)}
                                                                            disabled={!canVerify}
                                                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                                            title={!canVerify ? 'Online payment requires transaction ID and screenshot' : 'Verify payment'}
                                                                        >
                                                                            ✓ Verify
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleRejectPayment(payment.id)}
                                                                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
                                                                        >
                                                                            ✗ Reject
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Expanded Team Members */}
                                                            {isLeader && isExpanded && payment.team_members && payment.team_members.length > 0 && (
                                                                <div className="bg-purple-100 border-t border-purple-200 p-4 animate-in slide-in-from-top duration-200">
                                                                    <div className="text-xs font-bold text-purple-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                                                                        <Users className="h-4 w-4" />
                                                                        Team Members ({teamSize})
                                                                    </div>
                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                                        {payment.team_members.map((member, idx) => (
                                                                            <div key={idx} className="bg-white rounded-lg p-3 border border-purple-200">
                                                                                <div className="flex items-start gap-3">
                                                                                    <div className="h-10 w-10 rounded-full bg-purple-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                                                                                        {member.name?.[0]?.toUpperCase() || '?'}
                                                                                    </div>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <div className="font-semibold text-gray-900 text-sm">{member.name}</div>
                                                                                        <div className="text-xs text-gray-600 mt-1 space-y-0.5">
                                                                                            <div><span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{member.roll_number}</span></div>
                                                                                            {member.department && <div>📚 {member.department}</div>}
                                                                                            {member.year && <div>🎓 Year {member.year}</div>}
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    )
                                })()}
                            </div>
                        </div>
                    )}
                    {/* ANALYTICS */}
                    {activeTab === 'analytics' && (
                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-8">
                            {participants.length === 0 ? (
                                <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                    <BarChart3 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                                    <p className="text-gray-500">No data available for analytics yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Registration Trends (Dynamic) */}
                                    {(() => {
                                        // Group by Date
                                        const last7Days = [...Array(7)].map((_, i) => {
                                            const d = new Date()
                                            d.setDate(d.getDate() - (6 - i))
                                            return d.toISOString().split('T')[0]
                                        })

                                        const counts = last7Days.map(date =>
                                            participants.filter(p => p.created_at.startsWith(date)).length
                                        )

                                        const maxCount = Math.max(...counts, 10) // Scale max

                                        return (
                                            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-6">Last 7 Days Registrations</h4>
                                                <div className="h-48 flex items-end gap-2">
                                                    {counts.map((count, i) => {
                                                        const height = (count / maxCount) * 100
                                                        return (
                                                            <div key={i} className="flex-1 flex flex-col justify-end group relative">
                                                                <div
                                                                    className="bg-indigo-100 rounded-t-lg transition-all duration-500 relative hover:bg-indigo-200"
                                                                    style={{ height: `${Math.max(height, 5)}%` }} // Min height for visibility
                                                                >
                                                                    {count > 0 && (
                                                                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            {count}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-[10px] text-gray-400 text-center mt-2 truncate">
                                                                    {new Date(last7Days[i]).toLocaleDateString('en-US', { weekday: 'short' })}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })()}

                                    {/* Metrics Grid */}
                                    <div className="space-y-6">
                                        {/* Confirmation Rate */}
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Total Registrations</p>
                                            <p className="text-3xl font-bold text-gray-900">{loadingParticipants ? '...' : (participants.length || 0)}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Confirmed</p>
                                            <p className="text-3xl font-bold text-green-600">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'confirmed').length || 0)}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Pending Payment</p>
                                            <p className="text-3xl font-bold text-yellow-600">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'pending').length || 0)}</p>
                                        </div>
                                        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                            <p className="text-sm text-gray-500 font-medium mb-1">Rejected</p>
                                            <p className="text-3xl font-bold text-red-600">{loadingParticipants ? '...' : (participants.filter(p => p.status === 'rejected').length || 0)}</p>
                                        </div>
                                        {/* Status Breakdown */}
                                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Status Distribution</h4>
                                            <div className="space-y-3">
                                                {['confirmed', 'pending', 'cancelled'].map(status => {
                                                    const count = participants.filter(p => p.status === status).length
                                                    const pct = participants.length > 0 ? (count / participants.length) * 100 : 0
                                                    const color = status === 'confirmed' ? 'bg-green-500' : status === 'pending' ? 'bg-orange-400' : 'bg-red-500'

                                                    return (
                                                        <div key={status}>
                                                            <div className="flex justify-between text-sm mb-1">
                                                                <span className="capitalize font-medium text-gray-700">{status}</span>
                                                                <span className="text-gray-500">{count} ({Math.round(pct)}%)</span>
                                                            </div>
                                                            <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Screenshot Viewer Modal */}
            {screenshotModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={() => setScreenshotModal({ isOpen: false, url: '' })}>
                    <div className="relative max-w-4xl max-h-[90vh] p-4" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setScreenshotModal({ isOpen: false, url: '' })}
                            className="absolute -top-12 right-0 text-white hover:text-gray-300 transition"
                        >
                            <XIcon className="h-8 w-8" />
                        </button>
                        <img
                            src={screenshotModal.url}
                            alt="Payment Screenshot"
                            className="max-w-full max-h-[85vh] rounded-lg shadow-2xl"
                        />
                    </div>
                </div>
            )}

            {/* Profile View Modal */}
            {selectedProfile && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}>
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div
                            className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setSelectedProfile(null)}
                                className="sticky top-4 right-4 float-right z-10 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition"
                            >
                                <XIcon className="h-5 w-5" />
                            </button>
                            <ProfilePage profileId={selectedProfile.id} role={selectedProfile.role} isViewOnly={true} />
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Confirmation Dialog */}
            <ConfirmDialog
                isOpen={confirmDialog.isOpen}
                onClose={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
                onConfirm={confirmDialog.onConfirm}
                title={confirmDialog.title}
                message={confirmDialog.message}
                type={confirmDialog.type}
                confirmText={confirmDialog.confirmText}
                cancelText={confirmDialog.cancelText}
                showCancel={confirmDialog.showCancel}
            />

            {/* Replace Member Modal */}
            {replaceModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => {
                    setReplaceModal({ isOpen: false, memberId: null, memberName: '' })
                    setReplaceRollNumber('')
                }}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Replace Member</h3>
                        <p className="text-gray-600 mb-4">
                            Replacing: <span className="font-semibold text-gray-800">{replaceModal.memberName}</span>
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter New Member's Roll Number
                            </label>
                            <input
                                type="text"
                                value={replaceRollNumber}
                                onChange={(e) => setReplaceRollNumber(e.target.value)}
                                placeholder="e.g., 2021BCS001"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                autoFocus
                                disabled={isReplacing}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleReplaceMember}
                                disabled={isReplacing}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isReplacing ? 'Replacing...' : 'Replace'}
                            </button>
                            <button
                                onClick={() => {
                                    setReplaceModal({ isOpen: false, memberId: null, memberName: '' })
                                    setReplaceRollNumber('')
                                }}
                                disabled={isReplacing}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Member Modal */}
            {addMemberModal.isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => {
                    setAddMemberModal({ isOpen: false, leaderId: null, leaderName: '' })
                    setAddMemberRollNumber('')
                }}>
                    <div className="bg-white rounded-lg shadow-2xl max-w-md w-full mx-4 p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-800 mb-4">Add Team Member</h3>
                        <p className="text-gray-600 mb-4">
                            Adding to team of: <span className="font-semibold text-gray-800">{addMemberModal.leaderName}</span>
                        </p>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter Member's Roll Number
                            </label>
                            <input
                                type="text"
                                value={addMemberRollNumber}
                                onChange={(e) => setAddMemberRollNumber(e.target.value)}
                                placeholder="e.g., 2021BCS001"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                autoFocus
                                disabled={isAddingMember}
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAddMember}
                                disabled={isAddingMember}
                                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                                {isAddingMember ? 'Adding...' : 'Add Member'}
                            </button>
                            <button
                                onClick={() => {
                                    setAddMemberModal({ isOpen: false, leaderId: null, leaderName: '' })
                                    setAddMemberRollNumber('')
                                }}
                                disabled={isAddingMember}
                                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition disabled:cursor-not-allowed"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* ADD PARTICIPANT MODAL (Individual Events) */}
            {/* ============================================ */}
            {addParticipantModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                Add Participant - {event?.name}
                            </h2>
                            <p className="text-sm text-gray-500 mb-6">
                                Register a student for this event by entering their roll number
                            </p>

                            {/* Roll Number Input */}
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Student Roll Number <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={addParticipantModal.rollNumber}
                                        onChange={(e) => setAddParticipantModal(prev => ({ ...prev, rollNumber: e.target.value, error: null, profile: null }))}
                                        onKeyPress={(e) => e.key === 'Enter' && handleValidateIndividualRollNumber()}
                                        placeholder="Enter roll number (e.g., 23EC59)"
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={addParticipantModal.loading}
                                        autoFocus
                                    />
                                    <button
                                        onClick={handleValidateIndividualRollNumber}
                                        disabled={addParticipantModal.loading || !addParticipantModal.rollNumber}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {addParticipantModal.loading ? '...' : 'Verify'}
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">We'll check if this student has a profile in the system</p>
                            </div>

                            {/* Loading State */}
                            {addParticipantModal.loading && (
                                <div className="py-8 text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                    <p className="text-gray-600 mt-2">Validating...</p>
                                </div>
                            )}

                            {/* Profile Found */}
                            {addParticipantModal.profile && !addParticipantModal.alreadyRegistered && !addParticipantModal.loading && (
                                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                            <Check className="h-6 w-6 text-green-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-green-900 mb-2">✅ Profile Found</h3>
                                            <div className="text-sm text-green-800 space-y-1">
                                                <p><strong>Name:</strong> {addParticipantModal.profile.full_name}</p>
                                                <p><strong>Email:</strong> {addParticipantModal.profile.college_email}</p>
                                                <p><strong>Phone:</strong> {addParticipantModal.profile.phone || 'N/A'}</p>
                                                <p><strong>Department:</strong> {addParticipantModal.profile.department || 'N/A'}</p>
                                            </div>
                                            <p className="text-xs text-green-600 mt-2">Click "Add Participant" to register</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Profile Not Found */}
                            {addParticipantModal.error && addParticipantModal.error.includes('not found') && !addParticipantModal.loading && (
                                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                            <AlertCircle className="h-6 w-6 text-yellow-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Profile Not Found</h3>
                                            <p className="text-sm text-yellow-800 mb-3">
                                                No registration exists for this roll number. Create a new profile to continue.
                                            </p>
                                            <button
                                                onClick={() => {
                                                    handleOpenCreateProfile(addParticipantModal.rollNumber, true)
                                                    setAddParticipantModal(prev => ({ ...prev, isOpen: false }))
                                                }}
                                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition text-sm"
                                            >
                                                Create New Profile
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Already Registered */}
                            {addParticipantModal.alreadyRegistered && !addParticipantModal.loading && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <div className="flex items-start gap-3">
                                        <div className="flex-shrink-0">
                                            <XIcon className="h-6 w-6 text-red-600" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-red-900 mb-2">❌ Already Registered</h3>
                                            <p className="text-sm text-red-800 mb-2">
                                                {addParticipantModal.profile?.full_name} ({addParticipantModal.profile?.roll_number}) is already registered for this event.
                                            </p>
                                            {addParticipantModal.registrationDetails && (
                                                <div className="text-xs text-red-700 mt-2">
                                                    <p><strong>Status:</strong> {addParticipantModal.registrationDetails.status}</p>
                                                    <p><strong>Registered:</strong> {new Date(addParticipantModal.registrationDetails.registered_at).toLocaleDateString()}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Other Errors */}
                            {addParticipantModal.error && !addParticipantModal.error.includes('not found') && !addParticipantModal.alreadyRegistered && !addParticipantModal.loading && (
                                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-800">{addParticipantModal.error}</p>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={handleRegisterIndividualParticipant}
                                    disabled={!addParticipantModal.profile || addParticipantModal.alreadyRegistered || addParticipantModal.loading}
                                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                >
                                    {addParticipantModal.loading ? 'Registering...' : 'Add Participant'}
                                </button>
                                <button
                                    onClick={() => setAddParticipantModal({
                                        isOpen: false,
                                        rollNumber: '',
                                        loading: false,
                                        profile: null,
                                        error: null,
                                        alreadyRegistered: false,
                                        registrationDetails: null
                                    })}
                                    disabled={addParticipantModal.loading}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* CREATE PROFILE MODAL */}
            {/* ============================================ */}
            {createProfileModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-6">
                                <button
                                    onClick={() => {
                                        const wasFromTeam = createProfileModal.returnToAddTeam
                                        const wasFromParticipant = createProfileModal.returnToAddParticipant
                                        setCreateProfileModal({
                                            isOpen: false,
                                            rollNumber: '',
                                            fullName: '',
                                            phone: '',
                                            email: '',
                                            gender: 'male',
                                            loading: false,
                                            error: null,
                                            returnToAddParticipant: false,
                                            returnToAddTeam: false
                                        })
                                        // Modals remain open - just close the create profile modal
                                        // Add Team modal or Add Participant modal is still visible underneath
                                    }}
                                    className="p-2 hover:bg-gray-100 rounded-full transition"
                                >
                                    <ArrowLeft className="h-5 w-5" />
                                </button>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    Create New Profile
                                </h2>
                            </div>

                            <div className="space-y-4">
                                {/* Roll Number (Read-only) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Roll Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createProfileModal.rollNumber}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">🔒 Cannot be changed</p>
                                </div>

                                {/* Full Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createProfileModal.fullName}
                                        onChange={(e) => setCreateProfileModal(prev => ({ ...prev, fullName: e.target.value, error: null }))}
                                        placeholder="e.g., John Doe"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={createProfileModal.loading}
                                        autoFocus
                                    />
                                </div>

                                {/* Phone Number */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Phone Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={createProfileModal.phone}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                            setCreateProfileModal(prev => ({ ...prev, phone: value, error: null }))
                                        }}
                                        placeholder="9876543210"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={createProfileModal.loading}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">ⓘ 10-digit mobile number</p>
                                </div>

                                {/* Gender */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Gender <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={createProfileModal.gender}
                                        onChange={(e) => setCreateProfileModal(prev => ({ ...prev, gender: e.target.value, error: null }))}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        disabled={createProfileModal.loading}
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">ⓘ Default: Male</p>
                                </div>

                                {/* Email (Read-only) */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Email <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={createProfileModal.email}
                                        disabled
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">🔒 Auto-generated from roll number</p>
                                </div>

                                {/* Password Info */}
                                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-800">
                                        <strong>Password:</strong> <code className="font-mono bg-blue-100 px-2 py-1 rounded">password</code>
                                    </p>
                                    <p className="text-xs text-blue-600 mt-1">
                                        🔒 Default password will be set automatically
                                    </p>
                                </div>

                                {/* Admin Created Flag Info */}
                                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                                    <p className="text-xs text-purple-800">
                                        ⓘ Admin-created flag will be set automatically to track offline registrations
                                    </p>
                                </div>

                                {/* Error Message */}
                                {createProfileModal.error && (
                                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                                        <p className="text-sm text-red-800">{createProfileModal.error}</p>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-3 mt-6">
                                    <button
                                        onClick={handleCreateProfile}
                                        disabled={createProfileModal.loading || !createProfileModal.fullName || !createProfileModal.phone}
                                        className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                    >
                                        {createProfileModal.loading ? 'Creating...' : 'Create & Add'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setCreateProfileModal({
                                                isOpen: false,
                                                rollNumber: '',
                                                fullName: '',
                                                phone: '',
                                                email: '',
                                                gender: 'male',
                                                loading: false,
                                                error: null,
                                                returnToAddParticipant: false
                                            })
                                            if (createProfileModal.returnToAddParticipant) {
                                                setAddParticipantModal(prev => ({ ...prev, isOpen: true }))
                                            }
                                        }}
                                        disabled={createProfileModal.loading}
                                        className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================ */}
            {/* ADD TEAM MODAL (Group Events) */}
            {/* ============================================ */}
            {addTeamModal.isOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            {/* Step 1: Team Leader */}
                            {addTeamModal.step === 1 && (
                                <>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                                        Add Team - {event?.name}
                                    </h2>
                                    <p className="text-sm text-gray-600 mb-6">
                                        Step 1 of 2: Select Team Leader
                                        <span className="block text-gray-500 mt-1">Enter the roll number of the student who will lead this team</span>
                                    </p>

                                    {/* Leader Roll Number Input */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Team Leader's Roll Number <span className="text-red-500">*</span>
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={addTeamModal.leaderRollNumber}
                                                onChange={(e) => setAddTeamModal(prev => ({ ...prev, leaderRollNumber: e.target.value, error: null, leaderProfile: null }))}
                                                onKeyPress={(e) => e.key === 'Enter' && handleValidateTeamLeader()}
                                                placeholder="Enter roll number (e.g., 25AI110)"
                                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                disabled={addTeamModal.loading}
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleValidateTeamLeader}
                                                disabled={addTeamModal.loading || !addTeamModal.leaderRollNumber}
                                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                            >
                                                {addTeamModal.loading ? '...' : 'Verify'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Leader Profile Display */}
                                    {addTeamModal.leaderProfile && (
                                        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                            <div className="flex items-start gap-3">
                                                <Check className="h-6 w-6 text-green-600 flex-shrink-0" />
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-green-900 mb-2">✅ Leader: {addTeamModal.leaderProfile.full_name}</h3>
                                                    <div className="text-sm text-green-800 space-y-1">
                                                        <p><strong>Email:</strong> {addTeamModal.leaderProfile.college_email}</p>
                                                        <p><strong>Phone:</strong> {addTeamModal.leaderProfile.phone || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Error Display */}
                                    {addTeamModal.error && addTeamModal.error.includes('not found') && (
                                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm text-yellow-800 mb-3">{addTeamModal.error}</p>
                                            <button
                                                onClick={() => handleOpenCreateProfile(addTeamModal.leaderRollNumber, false, true)}
                                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition text-sm"
                                            >
                                                Create New Profile
                                            </button>
                                        </div>
                                    )}

                                    {addTeamModal.error && !addTeamModal.error.includes('not found') && (
                                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-sm text-red-800">{addTeamModal.error}</p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={handleProceedToAddMembers}
                                            disabled={!addTeamModal.leaderProfile}
                                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            Continue to Add Members
                                        </button>
                                        <button
                                            onClick={() => setAddTeamModal({
                                                isOpen: false,
                                                step: 1,
                                                leaderRollNumber: '',
                                                leaderProfile: null,
                                                memberSearch: '',
                                                searchResults: [],
                                                selectedMembers: [],
                                                loading: false,
                                                error: null,
                                                creatingMemberInline: false,
                                                inlineCreateData: { rollNumber: '', fullName: '', phone: '', gender: 'male' }
                                            })}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}

                            {/* Step 2: Add Members */}
                            {addTeamModal.step === 2 && (
                                <>
                                    <div className="flex items-center gap-3 mb-4">
                                        <button
                                            onClick={() => setAddTeamModal(prev => ({ ...prev, step: 1, error: null }))}
                                            className="p-2 hover:bg-gray-100 rounded-full transition"
                                            title="Go back to team leader selection"
                                        >
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>
                                        <div>
                                            <h2 className="text-2xl font-bold text-gray-900">Add Team - {event?.name}</h2>
                                            <p className="text-sm text-gray-600">
                                                Step 2 of 2: Add Team Members
                                                <span className="block text-gray-500 mt-1">
                                                    Team Leader: {addTeamModal.leaderProfile?.full_name} ({addTeamModal.leaderProfile?.roll_number})
                                                </span>
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                                        <p><strong>Team Size:</strong> Min: {event?.min_team_size} | Max: {event?.max_team_size} (including leader)</p>
                                        <p className="mt-1"><strong>Current:</strong> {addTeamModal.selectedMembers.length + 1} members ({addTeamModal.selectedMembers.length} + leader)</p>
                                    </div>

                                    {/* Search Member */}
                                    <div className="mb-4">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Add Team Members
                                            <span className="block text-xs font-normal text-gray-500 mt-1">
                                                Search by roll number and select members to add to the team
                                            </span>
                                        </label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                            <input
                                                type="text"
                                                value={addTeamModal.memberSearch}
                                                onChange={(e) => handleSearchTeamMembers(e.target.value)}
                                                placeholder="Type roll number (e.g., 25AI111)"
                                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Search Results */}
                                    {addTeamModal.memberSearch && addTeamModal.searchResults.length > 0 && (
                                        <div className="mb-4 border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                                            {addTeamModal.searchResults.map(profile => (
                                                <button
                                                    key={profile.id}
                                                    onClick={() => handleSelectTeamMember(profile)}
                                                    className="w-full p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 text-left transition"
                                                >
                                                    <p className="font-semibold text-gray-900">{profile.full_name} ({profile.roll_number})</p>
                                                    <p className="text-sm text-gray-600">{profile.department || 'N/A'} • Year {profile.year_of_study || 'N/A'}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* No Results + Create Option */}
                                    {addTeamModal.memberSearch && addTeamModal.searchResults.length === 0 && !addTeamModal.loading && !addTeamModal.creatingMemberInline && (
                                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm text-yellow-800 mb-3">⚠️ No results for "{addTeamModal.memberSearch}"</p>
                                            <button
                                                onClick={() => setAddTeamModal(prev => ({
                                                    ...prev,
                                                    creatingMemberInline: true,
                                                    inlineCreateData: { rollNumber: addTeamModal.memberSearch, fullName: '', phone: '', gender: 'male' }
                                                }))}
                                                className="px-4 py-2 bg-yellow-600 text-white rounded-lg font-semibold hover:bg-yellow-700 transition text-sm"
                                            >
                                                Create New Profile
                                            </button>
                                        </div>
                                    )}

                                    {/* Inline Create Member Form */}
                                    {addTeamModal.creatingMemberInline && (
                                        <div className="mb-4 p-4 bg-gray-50 border border-gray-300 rounded-lg">
                                            <h3 className="font-semibold text-gray-900 mb-3">Create Profile for {addTeamModal.inlineCreateData.rollNumber}</h3>
                                            <div className="space-y-3">
                                                <input
                                                    type="text"
                                                    value={addTeamModal.inlineCreateData.fullName}
                                                    onChange={(e) => setAddTeamModal(prev => ({
                                                        ...prev,
                                                        inlineCreateData: { ...prev.inlineCreateData, fullName: e.target.value }
                                                    }))}
                                                    placeholder="Full Name"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                />
                                                <input
                                                    type="text"
                                                    value={addTeamModal.inlineCreateData.phone}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10)
                                                        setAddTeamModal(prev => ({
                                                            ...prev,
                                                            inlineCreateData: { ...prev.inlineCreateData, phone: value }
                                                        }))
                                                    }}
                                                    placeholder="Phone (10 digits)"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                />
                                                {/* Gender Select */}
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                                                    <select
                                                        value={addTeamModal.inlineCreateData.gender}
                                                        onChange={(e) => setAddTeamModal(prev => ({
                                                            ...prev,
                                                            inlineCreateData: { ...prev.inlineCreateData, gender: e.target.value }
                                                        }))}
                                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                                    >
                                                        <option value="male">Male</option>
                                                        <option value="female">Female</option>
                                                    </select>
                                                    {event?.allowed_genders && event.allowed_genders.length > 0 && (
                                                        <p className="text-xs text-orange-600 mt-1">
                                                            ⚠️ Event restricted to: {event.allowed_genders.join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={handleCreateInlineMember}
                                                        disabled={addTeamModal.loading}
                                                        className="flex-1 px-3 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition text-sm disabled:bg-gray-400"
                                                    >
                                                        {addTeamModal.loading ? 'Creating...' : 'Create & Add to Team'}
                                                    </button>
                                                    <button
                                                        onClick={() => setAddTeamModal(prev => ({
                                                            ...prev,
                                                            creatingMemberInline: false,
                                                            inlineCreateData: { rollNumber: '', fullName: '', phone: '', gender: 'male' }
                                                        }))}
                                                        className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition text-sm"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Selected Members List */}
                                    {addTeamModal.selectedMembers.length > 0 && (
                                        <div className="mb-4">
                                            <h3 className="text-sm font-semibold text-gray-700 mb-2">
                                                Selected Members ({addTeamModal.selectedMembers.length}/{event?.max_team_size - 1}):
                                            </h3>
                                            <div className="space-y-2">
                                                {addTeamModal.selectedMembers.map(member => (
                                                    <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                                                        <div>
                                                            <p className="font-semibold text-gray-900">✓ {member.full_name} ({member.roll_number})</p>
                                                            <p className="text-sm text-gray-600">{member.phone || 'No phone'}</p>
                                                        </div>
                                                        <button
                                                            onClick={() => handleRemoveTeamMember(member.id)}
                                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Minimum Size Warning */}
                                    {addTeamModal.selectedMembers.length + 1 < event?.min_team_size && (
                                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-sm text-yellow-800">
                                                ⚠️ Minimum {event?.min_team_size} members required (including leader).
                                                Add {event?.min_team_size - addTeamModal.selectedMembers.length - 1} more member(s).
                                            </p>
                                        </div>
                                    )}

                                    {/* Error Display */}
                                    {addTeamModal.error && (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                            <p className="text-sm text-red-800">{addTeamModal.error}</p>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-3 mt-6">
                                        <button
                                            onClick={handleRegisterTeam}
                                            disabled={
                                                addTeamModal.loading ||
                                                addTeamModal.selectedMembers.length + 1 < event?.min_team_size ||
                                                addTeamModal.selectedMembers.length + 1 > event?.max_team_size
                                            }
                                            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                                        >
                                            {addTeamModal.loading ? 'Registering...' : 'Register Team'}
                                        </button>
                                        <button
                                            onClick={() => setAddTeamModal({
                                                isOpen: false,
                                                step: 1,
                                                leaderRollNumber: '',
                                                leaderProfile: null,
                                                memberSearch: '',
                                                searchResults: [],
                                                selectedMembers: [],
                                                loading: false,
                                                error: null,
                                                creatingMemberInline: false,
                                                inlineCreateData: { rollNumber: '', fullName: '', phone: '', gender: 'male' }
                                            })}
                                            disabled={addTeamModal.loading}
                                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
