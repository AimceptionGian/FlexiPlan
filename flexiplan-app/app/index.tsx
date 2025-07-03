import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

function getTransportTypeAndIcon(category: string) {
  const lower = category.toLowerCase();

  if (lower.startsWith('s') || lower.startsWith('r') || lower === 'ic' || lower === 'ir') {
    return { type: 'Zug', icon: <Ionicons name="train" size={20} color="#444" /> };
  } else if (lower.startsWith('b')) {
    return { type: 'Bus', icon: <MaterialCommunityIcons name="bus" size={20} color="#444" /> };
  } else if (lower.startsWith('t')) {
    return { type: 'Tram', icon: <MaterialCommunityIcons name="tram" size={20} color="#444" /> };
  }

  return { type: 'Unbekannt', icon: <Ionicons name="help-circle" size={20} color="#444" /> };
}

type Connection = {
  sections: any;
  from: {
    platform: any;
    departure: string;
    station: { name: string };
  };
  to: {
    arrival: string;
    station: { name: string };
  };
  duration: string;
};

export default function FahrplanScreen() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!from || !to) return;
    Keyboard.dismiss();
    setLoading(true);

    try {
      const response = await fetch(
        `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
      );
      const data = await response.json();
      setConnections(data.connections || []);
    } catch (error) {
      console.error('Fehler beim Laden der Verbindungen:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Text style={styles.label}>Start</Text>
      <TextInput
        style={styles.input}
        placeholder="z.B. Zürich HB"
        value={from}
        onChangeText={setFrom}
      />

      <Text style={styles.label}>Ziel</Text>
      <TextInput
        style={styles.input}
        placeholder="z.B. Bülach"
        value={to}
        onChangeText={setTo}
      />

      <View style={styles.buttonContainer}>
        <Button title="Verbindungen suchen" onPress={handleSearch} />
      </View>

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      <FlatList
        data={connections}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ marginTop: 20 }}
        renderItem={({ item }) => {
          const category = item.sections?.[0]?.journey?.category || '';
          const { type, icon } = getTransportTypeAndIcon(category);
          const platformLabel = type === 'Bus' ? 'Kante' : 'Gleis';

          return (
            <View style={styles.connectionItem}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {icon}
                <Text style={[styles.connectionText, { marginLeft: 8 }]}>
                  {item.from.station.name} ➜ {item.to.station.name}
                </Text>
              </View>

              <Text style={styles.timeText}>
                Abfahrt: {new Date(item.from.departure).toLocaleTimeString()} | Ankunft: {new Date(item.to.arrival).toLocaleTimeString()}
              </Text>

              {item.from.platform && (
                <Text style={styles.platformText}>
                  {platformLabel}: {item.from.platform}
                </Text>
              )}

              <Text style={styles.durationText}>
                Dauer: {item.duration?.replace('00d', '').replace('00:', '')}
              </Text>
            </View>
          );
        }}
      />

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  label: {
    marginTop: 12,
    fontWeight: 'bold',
    fontSize: 16,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  buttonContainer: {
    marginTop: 20,
  },
  connectionItem: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  connectionText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  timeText: {
    marginTop: 4,
    color: '#333',
  },
  durationText: {
    marginTop: 2,
    color: '#666',
    fontSize: 13,
  },
  platformText: {
    marginTop: 4,
    color: '#444',
    fontSize: 13,
    fontStyle: 'italic',
  },
});
