# Live Event Control System - Implementation Plan

## 📋 Overview
Major feature update to remove Rounds tab, add Control tab with live event management, and improve result system for manual winner selection.

---

## 🎯 Phase 1: Database Schema Updates

### 1.1 Events Table Modifications
```sql
-- Add live event tracking columns
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_live BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS live_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS live_ended_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS event_status VARCHAR(20) DEFAULT 'upcoming' CHECK (event_status IN ('upcoming', 'live', 'completed', 'cancelled'));

-- Add result columns
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS winner_profile_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS runnerup_profile_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS second_runnerup_profile_id UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS results_announced BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS results_announced_at TIMESTAMP WITH TIME ZONE;

-- Create index for live events queries
CREATE INDEX IF NOT EXISTS idx_events_is_live ON public.events(is_live) WHERE is_live = TRUE;
CREATE INDEX IF NOT EXISTS idx_events_status ON public.events(event_status);
```

### 1.2 Profiles Table - Win Count (Verify/Update)
```sql
-- Check if win_count exists, add if missing
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS win_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS first_place_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS second_place_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS third_place_count INTEGER DEFAULT 0;

-- Create function to increment win count
CREATE OR REPLACE FUNCTION increment_win_count(
    profile_ids UUID[],
    position INTEGER -- 1 for first, 2 for second, 3 for third
)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET win_count = win_count + 1,
        first_place_count = CASE WHEN position = 1 THEN first_place_count + 1 ELSE first_place_count END,
        second_place_count = CASE WHEN position = 2 THEN second_place_count + 1 ELSE second_place_count END,
        third_place_count = CASE WHEN position = 3 THEN third_place_count + 1 ELSE third_place_count END
    WHERE id = ANY(profile_ids);
END;
$$ LANGUAGE plpgsql;
```

### 1.3 Event Results Table (New)
```sql
-- Store detailed event results
CREATE TABLE IF NOT EXISTS public.event_results (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE NOT NULL,
    registration_id UUID REFERENCES public.registrations(id) ON DELETE CASCADE NOT NULL,
    position INTEGER NOT NULL CHECK (position IN (1, 2, 3)),
    team_members JSONB DEFAULT '[]'::jsonb,
    announced_by UUID REFERENCES public.profiles(id),
    announced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(event_id, position),
    UNIQUE(event_id, registration_id)
);

CREATE INDEX idx_event_results_event ON public.event_results(event_id);
```

---

## 🗑️ Phase 2: Remove Rounds System

### 2.1 Files to Modify
- ✅ `src/pages/coordinator/CoordinatorEventManage.jsx` - Remove rounds tab, state, and functions
- ✅ Clean up round-related imports
- ✅ Remove round modal UI
- ✅ Remove fetchRounds(), createRound(), deleteRound() functions

### 2.2 State Cleanup
```javascript
// REMOVE these states:
const [rounds, setRounds] = useState([])
const [loadingRounds, setLoadingRounds] = useState(false)
const [isRoundModalOpen, setIsRoundModalOpen] = useState(false)
const [roundForm, setRoundForm] = useState({...})
const [selectedRoundId, setSelectedRoundId] = useState('')
const [roundParticipants, setRoundParticipants] = useState([])
```

### 2.3 Update Tabs Array
```javascript
// BEFORE:
const tabs = [
    { id: 'overview', label: 'Overview', icon: Clock },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'rounds', label: 'Rounds', icon: Trophy }, // REMOVE
    { id: 'results', label: 'Results', icon: BarChart3 },
]

// AFTER:
const tabs = [
    { id: 'overview', label: 'Overview', icon: Clock },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'results', label: 'Results', icon: BarChart3 },
    { id: 'control', label: 'Control', icon: Activity }, // NEW
]
```

### 2.4 Database Cleanup (Optional - Later)
```sql
-- Keep rounds tables for now, but can be dropped later if confirmed unused
-- DROP TABLE IF EXISTS public.round_participants;
-- DROP TABLE IF EXISTS public.rounds;
```

---

## ➕ Phase 3: Add Control Tab

### 3.1 New State Variables
```javascript
// Control Tab State
const [liveStatus, setLiveStatus] = useState({
    is_live: false,
    live_started_at: null,
    event_status: 'upcoming'
})
const [showDateWarning, setShowDateWarning] = useState(false)
const [isGoingLive, setIsGoingLive] = useState(false)
```

### 3.2 Control Functions
```javascript
const checkEventDateMatch = () => {
    if (!event?.event_date) return true // No date restriction if not set
    
    const today = new Date().toISOString().split('T')[0]
    const eventDate = new Date(event.event_date).toISOString().split('T')[0]
    
    return today === eventDate
}

const handleGoLive = async (forceLive = false) => {
    const dateMatches = checkEventDateMatch()
    
    if (!dateMatches && !forceLive) {
        setShowDateWarning(true)
        return
    }
    
    setIsGoingLive(true)
    try {
        const { error } = await supabase
            .from('events')
            .update({
                is_live: true,
                live_started_at: new Date().toISOString(),
                event_status: 'live'
            })
            .eq('id', id)
        
        if (error) throw error
        
        await fetchEventDetails() // Refresh
        alert('✅ Event is now LIVE! Visible in "Happening Now" section.')
        setShowDateWarning(false)
    } catch (error) {
        console.error('Error going live:', error)
        alert('Failed to go live: ' + error.message)
    } finally {
        setIsGoingLive(false)
    }
}

const handleEndLive = async () => {
    if (!confirm('End this live event? It will no longer appear in "Happening Now".')) return
    
    setIsGoingLive(true)
    try {
        const { error } = await supabase
            .from('events')
            .update({
                is_live: false,
                live_ended_at: new Date().toISOString(),
                event_status: 'completed'
            })
            .eq('id', id)
        
        if (error) throw error
        
        await fetchEventDetails()
        alert('✅ Event ended successfully.')
    } catch (error) {
        console.error('Error ending live:', error)
        alert('Failed to end live: ' + error.message)
    } finally {
        setIsGoingLive(false)
    }
}
```

### 3.3 Control Tab UI
```jsx
{activeTab === 'control' && (
    <div className="space-y-6">
        {/* Event Status Card */}
        <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-bold mb-4">Event Status</h3>
            <div className="flex items-center gap-4 mb-6">
                <div className={`px-4 py-2 rounded-full font-semibold ${
                    event.is_live 
                        ? 'bg-green-100 text-green-700' 
                        : event.event_status === 'completed'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-yellow-100 text-yellow-700'
                }`}>
                    {event.is_live ? '🔴 LIVE' : event.event_status === 'completed' ? '✅ Completed' : '⏳ Upcoming'}
                </div>
                {event.live_started_at && (
                    <div className="text-sm text-gray-600">
                        Started: {new Date(event.live_started_at).toLocaleString()}
                    </div>
                )}
            </div>
            
            {/* Live Controls */}
            {!event.is_live && event.event_status !== 'completed' && (
                <button
                    onClick={() => handleGoLive(false)}
                    disabled={isGoingLive}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                    {isGoingLive ? 'Going Live...' : '🔴 Go Live'}
                </button>
            )}
            
            {event.is_live && (
                <button
                    onClick={handleEndLive}
                    disabled={isGoingLive}
                    className="px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                >
                    {isGoingLive ? 'Ending...' : '⏹️ End Event'}
                </button>
            )}
        </div>
        
        {/* Additional Controls (Future) */}
        <div className="bg-gray-50 rounded-lg border p-6">
            <h4 className="font-semibold text-gray-700 mb-2">Quick Actions</h4>
            <div className="space-y-2 text-sm text-gray-600">
                <p>• Announce Winners (Available after event ends)</p>
                <p>• Send Notifications (Coming Soon)</p>
                <p>• Generate Certificates (Coming Soon)</p>
            </div>
        </div>
    </div>
)}

{/* Date Warning Modal */}
{showDateWarning && (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-bold text-yellow-600 mb-3">⚠️ Date Mismatch Warning</h3>
            <p className="text-gray-700 mb-4">
                This event is scheduled for <strong>{new Date(event.event_date).toLocaleDateString()}</strong>, 
                but today is <strong>{new Date().toLocaleDateString()}</strong>.
            </p>
            <p className="text-gray-600 text-sm mb-6">
                Are you sure you want to go live now?
            </p>
            <div className="flex gap-3">
                <button
                    onClick={() => setShowDateWarning(false)}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                    Cancel
                </button>
                <button
                    onClick={() => handleGoLive(true)}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                    Go Live Anyway
                </button>
            </div>
        </div>
    </div>
)}
```

---

## 🏆 Phase 4: Results System Overhaul

### 4.1 New Result State
```javascript
const [resultForm, setResultForm] = useState({
    first_place: null,
    second_place: null,
    third_place: null
})
const [announcingResults, setAnnouncingResults] = useState(false)
```

### 4.2 Result Selection UI
```jsx
{activeTab === 'results' && (
    <div className="space-y-6">
        <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-bold mb-4">Announce Winners</h3>
            
            {/* Position Selectors */}
            <div className="space-y-4">
                {[
                    { position: 'first_place', label: '🥇 First Place', color: 'yellow' },
                    { position: 'second_place', label: '🥈 Second Place', color: 'gray' },
                    { position: 'third_place', label: '🥉 Third Place', color: 'orange' }
                ].map(({ position, label, color }) => (
                    <div key={position}>
                        <label className="block text-sm font-medium mb-2">{label}</label>
                        <select
                            value={resultForm[position] || ''}
                            onChange={(e) => setResultForm(prev => ({ ...prev, [position]: e.target.value }))}
                            className="w-full px-4 py-2 border rounded-lg"
                        >
                            <option value="">Select Participant/Team</option>
                            {participants.filter(p => p.status === 'confirmed').map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.user?.full_name} {p.team_members?.length > 0 && `(Team of ${p.team_members.length + 1})`}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
            
            <button
                onClick={handleAnnounceResults}
                disabled={!resultForm.first_place || announcingResults}
                className="mt-6 px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50"
            >
                {announcingResults ? 'Announcing...' : '📢 Announce Results'}
            </button>
        </div>
        
        {/* Current Results Display */}
        {event.results_announced && (
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
                <h4 className="font-bold text-green-800 mb-3">✅ Results Announced</h4>
                {/* Display winner details */}
            </div>
        )}
    </div>
)}
```

### 4.3 Result Announcement Logic
```javascript
const handleAnnounceResults = async () => {
    if (!resultForm.first_place) {
        alert('At least first place winner must be selected')
        return
    }
    
    if (!confirm('Announce these results? This will update win counts for all winners.')) return
    
    setAnnouncingResults(true)
    try {
        // Get registration details for all positions
        const positions = [
            { key: 'first_place', position: 1 },
            { key: 'second_place', position: 2 },
            { key: 'third_place', position: 3 }
        ]
        
        for (const { key, position } of positions) {
            const regId = resultForm[key]
            if (!regId) continue
            
            // Get registration with team members
            const { data: registration } = await supabase
                .from('registrations')
                .select('*, user:profiles(id)')
                .eq('id', regId)
                .single()
            
            if (!registration) continue
            
            // Collect all profile IDs (leader + team members)
            const profileIds = [registration.user.id]
            if (registration.team_members && registration.team_members.length > 0) {
                profileIds.push(...registration.team_members.map(m => m.id))
            }
            
            // Increment win counts
            await supabase.rpc('increment_win_count', {
                profile_ids: profileIds,
                position: position
            })
            
            // Store result
            await supabase.from('event_results').insert({
                event_id: id,
                registration_id: regId,
                position: position,
                team_members: registration.team_members || [],
                announced_by: currentUserId
            })
        }
        
        // Update event with winners
        await supabase.from('events').update({
            winner_profile_id: resultForm.first_place,
            runnerup_profile_id: resultForm.second_place,
            second_runnerup_profile_id: resultForm.third_place,
            results_announced: true,
            results_announced_at: new Date().toISOString(),
            event_status: 'completed'
        }).eq('id', id)
        
        alert('✅ Results announced successfully! Win counts updated.')
        await fetchEventDetails()
        await fetchParticipants()
    } catch (error) {
        console.error('Error announcing results:', error)
        alert('Failed to announce results: ' + error.message)
    } finally {
        setAnnouncingResults(false)
    }
}
```

---

## 📺 Phase 5: Live Events Display

### 5.1 Student/Coordinator Live Events Page
Update existing `StudentLive.jsx` and coordinator equivalent:

```jsx
const [liveEvents, setLiveEvents] = useState([])
const [loadingLive, setLoadingLive] = useState(true)

const fetchLiveEvents = async () => {
    setLoadingLive(true)
    const { data, error } = await supabase
        .from('events')
        .select('*, coordinators:event_assignments(coordinator:profiles(full_name, phone))')
        .eq('is_live', true)
        .order('live_started_at', { ascending: false })
    
    if (error) console.error(error)
    else setLiveEvents(data || [])
    setLoadingLive(false)
}

// Happening Now Section
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {liveEvents.map(event => (
        <div key={event.id} className="bg-white rounded-lg border p-6 relative overflow-hidden">
            <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-red-500 text-white rounded-full text-sm font-bold animate-pulse">
                🔴 LIVE
            </div>
            <h3 className="text-xl font-bold mb-2">{event.name}</h3>
            <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{event.venue}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>Started {new Date(event.live_started_at).toLocaleTimeString()}</span>
                </div>
            </div>
            <Link
                to={`/student/events/${event.id}`}
                className="mt-4 inline-block px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
                View Details
            </Link>
        </div>
    ))}
</div>
```

---

## ✅ Implementation Checklist

### Phase 1: Database
- [ ] Run schema updates SQL
- [ ] Test increment_win_count function
- [ ] Verify indexes created

### Phase 2: Remove Rounds
- [ ] Remove rounds state variables
- [ ] Remove rounds tab from tabs array
- [ ] Delete fetchRounds, createRound, deleteRound functions
- [ ] Remove rounds UI components
- [ ] Clean up round-related imports
- [ ] Test existing functionality still works

### Phase 3: Add Control Tab
- [ ] Add control tab to tabs array
- [ ] Add live status state
- [ ] Implement checkEventDateMatch
- [ ] Implement handleGoLive function
- [ ] Implement handleEndLive function
- [ ] Create Control tab UI
- [ ] Create date warning modal
- [ ] Test live toggle functionality

### Phase 4: Results System
- [ ] Add result form state
- [ ] Create result selection UI
- [ ] Implement handleAnnounceResults
- [ ] Test win count increment
- [ ] Test team member win updates
- [ ] Verify result storage

### Phase 5: Live Display
- [ ] Update StudentLive.jsx
- [ ] Add live events query
- [ ] Create Happening Now UI
- [ ] Test live events display
- [ ] Add real-time updates (optional)

### Testing
- [ ] Test complete flow: Go Live → Announce Results
- [ ] Verify date validation works
- [ ] Test individual event results
- [ ] Test team event results
- [ ] Verify win counts update correctly
- [ ] Test on mobile devices

### Deployment
- [ ] Commit changes with detailed message
- [ ] Push to main branch
- [ ] Monitor for errors
- [ ] Document for team

---

## 📝 Additional Features (Future Enhancements)

1. **Real-time Updates**: Use Supabase Realtime to auto-refresh live events
2. **Notifications**: Send push notifications when events go live
3. **Live Stream Integration**: Embed video streams for online events
4. **Attendance Tracking**: QR code check-in for live events
5. **Live Chat**: Real-time chat for participants
6. **Leaderboard**: Live score updates during events
7. **Photo Gallery**: Upload event photos during live session

---

**Status**: Ready for implementation
**Estimated Time**: 6-8 hours
**Priority**: High
