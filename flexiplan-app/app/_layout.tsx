import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export default function TabLayout() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <Tabs
                screenOptions={({ route }) => ({
                    headerShown: true,
                    headerStyle: {
                        backgroundColor: '#DC143C',
                        elevation: 0,
                        shadowOpacity: 0,
                        borderBottomWidth: 0,
                    },
                    headerTitleStyle: {
                        color: '#fff',
                        fontSize: 18,
                        fontWeight: '800',
                    },
                    headerTintColor: '#fff',
                    tabBarIcon: ({ color, size }) => {
                        const iconName = route.name === 'index' ? 'train' : 'star';
                        return <Ionicons name={iconName as any} size={size} color={color} />;
                    },
                    tabBarActiveTintColor: '#ffffff',
                    tabBarInactiveTintColor: '#888888',
                    tabBarStyle: {
                        backgroundColor: '#000000',
                        borderTopWidth: 0,
                        borderTopColor: 'transparent',
                        height: 90,
                        paddingBottom: 10,
                        paddingTop: 10,
                        elevation: 0,
                        shadowOpacity: 0,
                        shadowOffset: { width: 0, height: 0 },
                        shadowRadius: 0,
                    },
                    tabBarLabelStyle: {
                        fontSize: 12,
                        fontWeight: '500',
                    },
                    tabBarItemStyle: {
                        paddingVertical: 5,
                    },
                })}
            >
                <Tabs.Screen
                    name="index"
                    options={{
                        title: 'Fahrplan',
                        headerTitle: 'Fahrplan',
                    }}
                />
                <Tabs.Screen
                    name="favoriten"
                    options={{
                        title: 'Favoriten',
                        headerTitle: 'Favoriten',
                    }}
                />
            </Tabs>
        </GestureHandlerRootView>
    );
}