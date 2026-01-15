/**
 * NavigationConfig - NPC navigation and obstacle avoidance parameters
 * 
 * Controls predictive navigation system for autonomous ships.
 * NPCs use look-ahead collision detection and dynamic heading adjustment
 * to avoid obstacles without global pathfinding.
 */

module.exports = {
    // Look-ahead distance for collision detection (in tiles)
    // NPCs sample this many tiles ahead to predict obstacles
    // Larger values = earlier detection, more CPU cost
    LOOK_AHEAD_TILES: 7,

    // Alternative heading search angles (radians)
    // When obstacle detected, test these angles relative to desired heading
    // Order matters: first clear heading is selected
    // Expanded to +/- 180 degrees to allow turning away from target if needed
    SEARCH_ANGLES: [
        15, -15, 30, -30, 45, -45,
        60, -60, 75, -75, 90, -90,
        105, -105, 120, -120, 135, -135,
        150, -150, 165, -165, 180
    ].map(deg => deg * Math.PI / 180),

    // Smooth turn rate (radians per second)
    // Controls how quickly currentHeading interpolates toward target
    // Increased to 1.5 (~86 deg/s) for snappier response
    NPC_TURN_SMOOTHING: 1.5, // ~86 degrees per second

    // How often to update navigation (in ticks)
    // 1 = every tick (most responsive)
    // Higher values reduce CPU cost but may miss obstacles
    NAV_UPDATE_INTERVAL: 1,

    // Minimum forward progress threshold (dot product)
    // Alternative headings must make at least this much progress toward target
    // -1.0 = allow any direction (including backwards)
    // 0.0 = perpendicular allowed, 1.0 = only forward
    // Currently set to -1.0 to allow NPCs to take longer routes around obstacles
    MIN_PROGRESS_DOT: -1.0,

    // Debug logging for navigation (disable in production)
    DEBUG_NAVIGATION: false
};
