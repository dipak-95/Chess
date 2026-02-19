import React from 'react';
import { View, StyleSheet, Image } from 'react-native';

// We use DiceBear API for cool gamer avatars
const getAvatarUrl = (id) => `https://api.dicebear.com/9.x/adventurer/png?seed=${id}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

export default function UserAvatar({ avatarId, size = 50 }) {
    // If no avatarId, default to 'avatar_01'
    const id = avatarId || 'avatar_01';

    return (
        <View style={[styles.avatarContainer, { width: size, height: size, borderRadius: size / 4 }]}>
            <Image
                source={{ uri: getAvatarUrl(id) }}
                style={{ width: size, height: size, borderRadius: size / 4 }}
                resizeMode="cover"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    avatarContainer: {
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.2)',
        backgroundColor: 'rgba(255,255,255,0.1)'
    }
});
