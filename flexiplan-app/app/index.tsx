import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
  Keyboard,
  StatusBar
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

function getTransportTypeAndIcon(category: string) {
  const lower = category.toLowerCase();

  if (lower.startsWith('s') || lower.startsWith('r') || lower === 'ic' || lower === 'ir') {
    return {
      type: 'Zug',
      icon: <Ionicons name="train" size={16} color="#fff" />,
      color: '#0066CC'
    };
  } else if (lower.startsWith('b')) {
    return {
      type: 'Bus',
      icon: <MaterialCommunityIcons name="bus" size={16} color="#fff" />,
      color: '#FF6B35'
    };
  } else if (lower.startsWith('t')) {
    return {
      type: 'Tram',
      icon: <MaterialCommunityIcons name="tram" size={16} color="#fff" />,
      color: '#28A745'
    };
  }

  return {
    type: 'Unbekannt',
    icon: <Ionicons name="help-circle" size={16} color="#fff" />,
    color: '#6C757D'
  };
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const loadConnections = async (pageNum: number, isInitialLoad = false) => {
    if ((!from || !to) && isInitialLoad) return;

    const loadingState = isInitialLoad ? setLoading : setLoadingMore;
    loadingState(true);

    try {
      const response = await fetch(
        `https://transport.opendata.ch/v1/connections?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&page=${pageNum}`
      );
      const data = await response.json();

      if (isInitialLoad) {
        setConnections(data.connections || []);
        setPage(1);
        setHasMore(true);
      } else {
        if (data.connections && data.connections.length > 0) {
          setConnections(prev => [...prev, ...data.connections]);
        } else {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Verbindungen:', error);
    } finally {
      loadingState(false);
    }
  };

  const handleSearch = useCallback(() => {
    if (!from || !to) return;
    Keyboard.dismiss();
    loadConnections(0, true);
  }, [from, to]);

  const loadMoreConnections = useCallback(() => {
    if (!loading && !loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadConnections(nextPage);
    }
  }, [loading, loadingMore, hasMore, page]);

  const swapStations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('de-CH', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (duration: string) => {
    if (!duration) return '';

    // Format: "00d00:22:00" -> "22 min" or "01d01:22:00" -> "1 h 22 min"
    const parts = duration.split(':');
    if (parts.length < 3) return duration;

    const dayHour = parts[0]; // "00d00" or "01d01"
    const minutes = parseInt(parts[1], 10);
    const seconds = parseInt(parts[2], 10);

    // Extract days and hours from first part
    const dayMatch = dayHour.match(/(\d+)d(\d+)/);
    if (!dayMatch) return duration;

    const days = parseInt(dayMatch[1], 10);
    const hours = parseInt(dayMatch[2], 10);

    // Calculate total hours
    const totalHours = days * 24 + hours;

    if (totalHours === 0) {
      return `${minutes} min`;
    } else if (minutes === 0) {
      return `${totalHours} h`;
    } else {
      return `${totalHours} h ${minutes} min`;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />



      {/* Search Section */}
      <View style={styles.searchSection}>
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <Ionicons name="radio-button-on" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Von"
              placeholderTextColor="#999"
              value={from}
              onChangeText={setFrom}
            />
          </View>


          <View style={styles.inputRow}>
            <Ionicons name="location" size={16} color="#fff" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nach"
              placeholderTextColor="#999"
              value={to}
              onChangeText={setTo}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.swapButton} onPress={swapStations}>
          <Ionicons name="swap-vertical" size={24} color="#fff" />
        </TouchableOpacity>
      </View>



      {/* Search Button */}
      <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
        <Text style={styles.searchButtonText}>Verbindungen suchen</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#fff" style={styles.loader} />}

      {/* Connections List */}
      <FlatList
        data={connections}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => {
          const category = item.sections?.[0]?.journey?.category || '';
          const { type, icon, color } = getTransportTypeAndIcon(category);
          const platformLabel = type === 'Bus' ? 'Kante' : 'Gleis';

          return (
            <View style={styles.connectionCard}>
              <View style={styles.connectionHeader}>
                <View style={[styles.transportBadge, { backgroundColor: color }]}>
                  {icon}
                  <Text style={styles.transportText}>{category}</Text>
                </View>
                <Text style={styles.directionText}>Direction {item.to.station.name}</Text>
              </View>

              <View style={styles.timeContainer}>
                <Text style={styles.departureTime}>{formatTime(item.from.departure)}</Text>
                <View style={styles.progressLine}>
                  <View style={styles.progressBar} />
                  <View style={styles.progressDot} />
                </View>
                <Text style={styles.arrivalTime}>{formatTime(item.to.arrival)}</Text>
              </View>

              <View style={styles.connectionFooter}>
                <Text style={styles.platformText}>
                  {platformLabel} {item.from.platform || 'N/A'}
                </Text>
                <Text style={styles.durationText}>{formatDuration(item.duration)}</Text>
              </View>
            </View>
          );
        }}
        onEndReached={loadMoreConnections}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator size="small" color="#fff" style={styles.loadMoreIndicator} />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C1E',
  },

  searchSection: {
    backgroundColor: '#2C2C2E',
    margin: 16,
    marginTop: 60, // Extra margin for status bar
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputContainer: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    paddingVertical: 8,
  },

  swapButton: {
    backgroundColor: '#3A3A3C',
    borderRadius: 20,
    padding: 8,
    marginLeft: 12,
  },

  searchButton: {
    backgroundColor: '#DC143C',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 8,
    paddingVertical: 12,
  },
  searchButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 20,
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  connectionCard: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  transportText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  directionText: {
    color: '#fff',
    fontSize: 16,
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  departureTime: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 60,
  },
  progressLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#48484A',
    marginHorizontal: 16,
    borderRadius: 1,
    position: 'relative',
  },
  progressBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 1,
  },
  progressDot: {
    position: 'absolute',
    right: 0,
    top: -3,
    width: 8,
    height: 8,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  arrivalTime: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 60,
    textAlign: 'right',
  },
  connectionFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  platformText: {
    color: '#fff',
    fontSize: 14,
  },
  occupancyText: {
    color: '#fff',
    fontSize: 14,
  },
  durationText: {
    color: '#fff',
    fontSize: 14,
  },
  loadMoreIndicator: {
    marginVertical: 20,
  },
});