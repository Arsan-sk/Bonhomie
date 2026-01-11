
import { createClient } from '@supabase/supabase-js';

// Config
const SUPABASE_URL = 'https://vskqcbkzggkrzahdnlre.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZza3FjYmt6Z2drcnphaGRubHJlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzg5ODI5OSwiZXhwIjoyMDgzNDc0Mjk5fQ.qLyLobPIwMS6BVHanHVC0ycavg5MsUegt0Yfhv2bNJE';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const users = [
    { email: 'admin@bonhomie.com', password: 'password123', role: 'admin', name: 'Admin User' },
    { email: 'coordinator@bonhomie.com', password: 'password123', role: 'faculty', name: 'Faculty Coordinator' },
    { email: 'student@bonhomie.com', password: 'password123', role: 'user', name: 'Student User' },
];

const events = [
    {
        name: 'Battle of Bands',
        description: 'Rock out with your band!',
        category: 'Cultural',
        subcategory: 'Group',
        day: 'Day 1',
        start_time: '18:00',
        end_time: '21:00',
        venue: 'Main Auditorium',
        fee: 500,
        day_order: 1,
        image_url: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9'
    },
    {
        name: 'Hackathon',
        description: '24-hour coding challenge.',
        category: 'Technical',
        subcategory: 'Group',
        day: 'Day 2',
        start_time: '10:00',
        end_time: '10:00',
        venue: 'Lab Complex',
        fee: 250,
        day_order: 2,
        image_url: 'https://images.unsplash.com/photo-1504384308090-c54be3855833'
    },
    {
        name: 'Singing Solo',
        description: 'Showcase your vocal talents.',
        category: 'Cultural',
        subcategory: 'Individual',
        day: 'Day 3',
        start_time: '14:00',
        end_time: '17:00',
        venue: 'Open Air Theatre',
        fee: 100,
        day_order: 3,
        image_url: 'https://images.unsplash.com/photo-1516280440614-6697288d5d38'
    }
];

async function seed() {
    console.log('Seeding data...');

    // 1. Clear existing events (optional, but good for clean state)
    console.log('Clearing existing events...');
    const { error: deleteError } = await supabase.from('events').delete().neq('id', 0); // Using neq 0 to match all if valid ID
    if (deleteError) {
        console.error('Error clearing events:', deleteError.message);
    } else {
        console.log('Cleared existing events.');
    }

    // 2. Create Users
    for (const user of users) {
        console.log(`Creating user ${user.email}...`);

        // admin.createUser auto-confirms email.
        const { data, error } = await supabase.auth.admin.createUser({
            email: user.email,
            password: user.password,
            email_confirm: true,
            user_metadata: { full_name: user.name }
        });

        let userId = data?.user?.id;

        if (error) {
            console.error(`Error creating ${user.email}:`, error.message);
            // If user already exists, we need to fetch their ID to update role
            if (error.message.includes('already registered')) {
                // Unfortunately admin.listUsers filtering is limited, let's try to get UID by listing or assuming failure.
                // Actually, if they exist, we can't get the UID easily without listing all.
                // Let's Skip update if they exist, assuming they are correct. Or try to update profile if we can find it?
                // Supabase Admin API: listUsers.
                const { data: { users: existingUsers } } = await supabase.auth.admin.listUsers();
                const existing = existingUsers.find(u => u.email === user.email);
                if (existing) userId = existing.id;
            }
        } else {
            console.log(`Created ${user.email} (ID: ${userId})`);
        }

        if (userId) {
            // 3. Update Role in Profiles
            // Use a slight delay to ensure trigger fired
            await new Promise(r => setTimeout(r, 1000));

            const { error: profileError } = await supabase
                .from('profiles')
                .update({ role: user.role, full_name: user.name })
                .eq('id', userId);

            if (profileError) console.error(`Error updating profile for ${user.email}:`, profileError.message);
            else console.log(`Updated role for ${user.email} to ${user.role}`);
        }
    }

    // 4. Insert Events
    console.log('Inserting events...');
    const { data: eventData, error: eventError } = await supabase
        .from('events')
        .insert(events)
        .select();

    if (eventError) console.error('Error inserting events:', eventError.message);
    else console.log(`Inserted ${eventData ? eventData.length : 0} events.`);

    console.log('Seeding complete!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
