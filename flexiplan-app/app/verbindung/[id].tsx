import { useLocalSearchParams } from 'expo-router';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface Connection {
    from: {
        station: { name: string };
        departure: string;
        platform?: string;
    };
    to: {
        station: { name: string };
        arrival: string;
    };
    duration: string;
    sections: Array<{
        journey?: {
            category: string;
            number: string;
            to: string;
            operator?: { name: string };
        };
        departure?: {
            station: { name: string };
            departure: string;
            platform?: string;
        };
        arrival?: {
            station: { name: string };
            arrival: string;
        };
    }>;
}

export default function VerbindungsDetailsScreen() {
    const params = useLocalSearchParams<{ connection: string }>();
    const connection: Connection = JSON.parse(params.connection);

    const formatTime = (dateString: string) =>
        new Date(dateString).toLocaleTimeString('de-CH', {
            hour: '2-digit',
            minute: '2-digit'
        });

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.header}>Reiseübersicht</Text>
            <Text style={styles.subheader}>
                {connection.from.station.name} → {connection.to.station.name}
            </Text>
            <Text style={styles.duration}>Dauer: {connection.duration}</Text>

            {connection.sections.map((section, index) => (
                <View key={`section-${index}`} style={styles.section}>
                    {section.departure && section.arrival && (
                        <>
                            <Text style={styles.sectionText}>
                                {section.departure.station.name} ({formatTime(section.departure.departure)}) →
                                {section.arrival.station.name} ({formatTime(section.arrival.arrival)})
                            </Text>
                            {section.journey && (
                                <Text style={styles.sectionDetails}>
                                    {section.journey.category} {section.journey.number} nach {section.journey.to}
                                    {'\n'}
                                    Betreiber: {section.journey.operator?.name || 'Unbekannt'} |
                                    Gleis: {section.departure.platform || '–'}
                                </Text>
                            )}
                        </>
                    )}
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#1C1C1E',
        flex: 1,
        padding: 16,
    },
    header: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subheader: {
        color: '#ccc',
        fontSize: 16,
        marginBottom: 12,
    },
    duration: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 16,
    },
    section: {
        backgroundColor: '#2C2C2E',
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
    },
    sectionText: {
        color: '#fff',
        fontWeight: '600',
        marginBottom: 4,
    },
    sectionDetails: {
        color: '#ccc',
        fontSize: 13,
    },
});
