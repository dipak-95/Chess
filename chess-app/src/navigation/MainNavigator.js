import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Home, Users, Trophy, Dices, Settings } from 'lucide-react-native';
import { COLORS } from '../constants/theme';

// Placeholder Components for Tabs (Will separate later)
const PlaceholderScreen = ({ name }) => (
    <View style={styles.screen}>
        <Text style={styles.text}>{name}</Text>
    </View>
);

import HomeScreen from '../screens/HomeScreen';

import ConnectionScreen from '../screens/ConnectionScreen';

import SettingsScreen from '../screens/SettingsScreen';
import SpinWheelScreen from '../screens/SpinWheelScreen';
import DailyChallengeScreen from '../screens/DailyChallengeScreen';

const Tab = createBottomTabNavigator();

import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MainNavigator() {
    const insets = useSafeAreaInsets();

    // Base height needed for the tab content (icon + label + padding)
    const BASE_TAB_HEIGHT = 65;

    // Additional padding based on safe area (e.g., for iPhone X home indicator or Gesture Nav)
    // If insets.bottom is 0 (hardware buttons), we just use a small default padding.
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 10;

    const finalHeight = BASE_TAB_HEIGHT + bottomPadding;

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: COLORS.bgDark2,
                    borderTopColor: COLORS.glassBorder,
                    height: finalHeight,
                    paddingBottom: bottomPadding,
                    paddingTop: 10,
                },
                tabBarActiveTintColor: COLORS.accent,
                tabBarInactiveTintColor: COLORS.textDim,
                tabBarShowLabel: true,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 0,
                    marginBottom: 5
                }
            }}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Connection"
                component={ConnectionScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Users color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Spin"
                component={SpinWheelScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Dices color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="Challenge"
                component={DailyChallengeScreen}
                options={{
                    tabBarIcon: ({ color, size }) => <Trophy color={color} size={size} />
                }}
            />

        </Tab.Navigator>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: COLORS.bgDark,
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        color: 'white',
        fontSize: 20
    }
});
