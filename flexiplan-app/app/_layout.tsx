import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={({ route }) => ({
                headerShown: true,
                tabBarIcon: ({ color, size }) => {
                    const iconName = route.name === 'index' ? 'train' : 'star';
                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
                tabBarActiveTintColor: 'crimson',
                tabBarInactiveTintColor: 'gray',
            })}
        >
            <Tabs.Screen
                name="index"
                options={{ title: 'Fahrplan' }}
            />
            <Tabs.Screen
                name="favoriten"
                options={{ title: 'Favoriten' }}
            />
        </Tabs>
    );
}
