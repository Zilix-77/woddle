export const AVATAR_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEEAD', // Yellow
  '#D4A5A5', // Pink
  '#9B59B6', // Purple
  '#E67E22', // Orange
  '#2ECC71', // Emerald
  '#34495E', // Navy
];

export const CATEGORIES: Record<string, string[]> = {
  'Food': ['Pizza', 'Sushi', 'Burger', 'Pasta', 'Taco', 'Salad', 'Steak', 'Ramen', 'Donut', 'Pancake'],
  'Objects': ['Laptop', 'Camera', 'Guitar', 'Watch', 'Umbrella', 'Backpack', 'Bicycle', 'Telescope', 'Compass', 'Key'],
  'Nature': ['Mountain', 'Ocean', 'Forest', 'Desert', 'Volcano', 'Waterfall', 'Island', 'Canyon', 'River', 'Glacier'],
  'Entertainment': ['Movie', 'Music', 'Game', 'Dance', 'Concert', 'Theater', 'Painting', 'Podcast', 'Novel', 'Circus'],
  'Daily Life': ['Coffee', 'Shower', 'Sleep', 'Work', 'School', 'Gym', 'Cooking', 'Reading', 'Driving', 'Shopping'],
};

export const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;
