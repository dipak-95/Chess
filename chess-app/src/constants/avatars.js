export const AVATAR_DATA = [
    // Defaults (Free)
    { id: 'avatar_01', type: 'free', price: 0, category: 'Basic' },
    { id: 'avatar_02', type: 'free', price: 0, category: 'Basic' },
    { id: 'avatar_03', type: 'free', price: 0, category: 'Basic' },

    // Male Avatars (Generated)
    ...Array.from({ length: 30 }, (_, i) => ({
        id: `avatar_male_${i + 1}`,
        type: 'premium',
        price: 200 + (i * 300) > 10000 ? 10000 : 200 + (i * 300), // Scaling price
        category: 'Male'
    })),

    // Female Avatars (Generated)
    ...Array.from({ length: 30 }, (_, i) => ({
        id: `avatar_female_${i + 1}`,
        type: 'premium',
        price: 200 + (i * 300) > 10000 ? 10000 : 200 + (i * 300),
        category: 'Female'
    }))
];
