# Dynamic Event Images with Unsplash Fallback

## Overview
Enhanced event image display by integrating Unsplash as a dynamic fallback source. Instead of showing generic placeholder images when events don't have uploaded images, the system now automatically fetches relevant images from Unsplash based on the event's name and category.

## What Changed

### New Utility: `src/utils/unsplashHelper.js`
Created a comprehensive helper module for Unsplash image integration:

**Key Features:**
- `getUnsplashImageUrl(eventName, width, height)` - Generate Unsplash URL based on event name
- `getCategoryImage(category)` - Get category-specific fallback images
- `fetchUnsplashImage(query)` - Async fetch using Unsplash API (requires API key)
- `optimizeUnsplashUrl()` - Optimize image parameters
- Category-specific fallback URLs for 10+ categories (Technical, Cultural, Sports, Gaming, etc.)

**How It Works:**
1. If event has `image_path`, use it
2. Otherwise, generate Unsplash URL using event name as search query
3. If Unsplash fails to load, fallback to category-specific image
4. Uses Unsplash Source API (no API key required for basic usage)

### Updated Components

#### 1. **EventCard** (`src/components/events/EventCard.jsx`)
- Added intelligent image selection logic
- Uses event name for Unsplash search
- Fallback chain: Custom image → Unsplash (event name) → Category image
- Added `onError` handler for additional safety

#### 2. **EventDetail** (`src/pages/EventDetail.jsx`)
- Hero image now uses Unsplash fallback
- Larger dimensions (1350x600) for better quality
- Maintains same fallback chain

#### 3. **StudentLive** (`src/pages/student/StudentLive.jsx`)
- Live event cards use dynamic images
- Recent winners section uses event-based images
- Proper aspect ratios for horizontal cards

#### 4. **StudentMyEvents** (`src/pages/student/StudentMyEvents.jsx`)
- Registration cards show relevant event images
- 400x200 dimensions for card format

#### 5. **StudentDashboard** (both versions)
- `src/pages/student/StudentDashboard.jsx`
- `src/pages/dashboards/StudentDashboard.jsx`
- Registration list thumbnails (150x150)
- Consistent fallback behavior

#### 6. **CoordinatorEventManage** (`src/pages/coordinator/CoordinatorEventManage.jsx`)
- Event banner uses dynamic images
- Large format (1200x300) for banner display

## Unsplash Source API
Using Unsplash's Source API which doesn't require authentication:

```javascript
// Format: https://source.unsplash.com/featured/{WIDTH}x{HEIGHT}/?{QUERY}

// Example for a "Coding Competition" event:
https://source.unsplash.com/featured/800x400/?coding%20competition,event

// Example for "Dance Performance":
https://source.unsplash.com/featured/800x400/?dance%20performance,event
```

## Category Fallbacks
Predefined images for each category ensure relevant visuals even when event name search fails:

- **Technical**: Technology, coding, tech keywords
- **Cultural**: Culture, art, performance
- **Sports**: Sports, games, competition
- **Gaming**: Gaming, esports
- **Literary**: Books, literature, writing
- **Arts**: Art, creative, design
- **Music**: Music, concert
- **Dance**: Dance, performance, stage
- **Drama**: Theater, drama, stage
- **Workshop**: Workshop, learning, education

## Usage Examples

### Before:
```jsx
<img src={event.image_path || 'https://via.placeholder.com/400x200'} />
```

### After:
```jsx
<img 
    src={event.image_path || getUnsplashImageUrl(event.name, 400, 200)}
    onError={(e) => { e.target.src = getCategoryImage(event.category) }}
/>
```

## Benefits

1. **Better UX**: Relevant, high-quality images for every event
2. **No Manual Work**: Automatic image generation based on event names
3. **Contextual**: Images match event themes (coding, dance, sports, etc.)
4. **Resilient**: Multiple fallback layers ensure images always display
5. **Performance**: Uses CDN-hosted images from Unsplash
6. **Professional**: High-quality stock photos instead of generic placeholders

## Optional: Unsplash API Key
For more control and to avoid rate limits, add to `.env`:

```env
VITE_UNSPLASH_ACCESS_KEY=your_access_key_here
```

Get your free API key at: https://unsplash.com/developers

**Without API Key:**
- Uses Unsplash Source API (simpler, no auth required)
- Rate limit: ~50 requests/hour per IP
- Images are random from search results

**With API Key:**
- Full API access
- Higher rate limits (5000 requests/hour)
- More control over image selection
- Can fetch specific images

## Testing

To test the feature:

1. **Create event without image**:
   - Go to Admin Dashboard → Create Event
   - Fill in event details but don't upload an image
   - Save the event

2. **View event card**:
   - Go to Events page
   - Event card should show relevant Unsplash image based on event name
   - Example: "Chess Tournament" shows chess-related images

3. **Check fallback**:
   - Disconnect internet briefly
   - Images should fallback to category-specific URLs
   - Reconnect - images load from Unsplash

4. **Live events**:
   - Go Live with an event (without image)
   - Check Student Live page
   - Should show relevant image in "Happening Now"

## Files Modified

- ✅ `src/utils/unsplashHelper.js` (NEW)
- ✅ `src/components/events/EventCard.jsx`
- ✅ `src/pages/EventDetail.jsx`
- ✅ `src/pages/student/StudentLive.jsx`
- ✅ `src/pages/student/StudentMyEvents.jsx`
- ✅ `src/pages/student/StudentDashboard.jsx`
- ✅ `src/pages/dashboards/StudentDashboard.jsx`
- ✅ `src/pages/coordinator/CoordinatorEventManage.jsx`

## No Breaking Changes

- All existing event images continue to work
- Only affects events without `image_path`
- Completely backward compatible
- Can be disabled by modifying helper to return empty string
